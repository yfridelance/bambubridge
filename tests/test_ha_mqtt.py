"""Unit tests for ha_mqtt transition-detection logic."""

from unittest.mock import MagicMock, patch

import pytest

import ha_mqtt
from api.v1.common import derive_tray_issue_type


def _tray(tray_id, **flags):
    return {"id": tray_id, "tray_color": "FFFFFF", "tray_uuid": "abc", **flags}


def _ams_config(ams_id, trays):
    return {"ams": [{"id": ams_id, "tray": trays}]}


def _reset_state():
    ha_mqtt._last_issues.clear()
    ha_mqtt._known_trays.clear()


def test_derive_tray_issue_type_precedence():
    assert derive_tray_issue_type({"mismatch": True, "color_mismatch": True}) == "material_mismatch"
    assert derive_tray_issue_type({"color_mismatch": True, "unmapped_bambu_tag": "x"}) == "color_mismatch"
    assert derive_tray_issue_type({"unmapped_bambu_tag": "x", "non_bambu_spool": True}) == "unmapped_tag"
    assert derive_tray_issue_type({"non_bambu_spool": True}) == "non_bambu_spool"
    assert derive_tray_issue_type({}) is None


def test_no_publish_when_disabled():
    _reset_state()
    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", False):
        ha_mqtt._connected = True
        ha_mqtt._client = MagicMock()
        ha_mqtt.publish_tray_state_diff({})
    ha_mqtt._client.publish.assert_not_called()


def test_no_publish_when_disconnected():
    _reset_state()
    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt._connected = False
        ha_mqtt._client = MagicMock()
        ha_mqtt.publish_tray_state_diff({})
    ha_mqtt._client.publish.assert_not_called()


@patch("mqtt_bambulab.getLastAMSConfig")
def test_transition_to_unmapped_publishes(mock_get_cfg):
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    mock_get_cfg.return_value = _ams_config(
        0, [_tray(1, unmapped_bambu_tag="DEADBEEF", issue=True)]
    )

    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

    topics = [call.args[0] for call in fake_client.publish.call_args_list]
    # Discovery + state + attributes + event
    assert any("homeassistant/sensor/" in t and t.endswith("/config") for t in topics)
    assert any(t.endswith("/issue/state") for t in topics)
    assert any(t.endswith("/issue/attributes") for t in topics)
    assert any(t.endswith("/events/tray_issue") for t in topics)

    assert ha_mqtt._last_issues[(0, 1)] == "unmapped_tag"


@patch("mqtt_bambulab.getLastAMSConfig")
def test_first_sighting_publishes_ok_state(mock_get_cfg):
    """A freshly discovered tray in 'ok' state must publish, otherwise HA shows 'unknown'."""
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    mock_get_cfg.return_value = _ams_config(0, [_tray(1)])  # matched Bambu spool, no flags

    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

    state_publishes = [
        c for c in fake_client.publish.call_args_list if c.args[0].endswith("/issue/state")
    ]
    assert len(state_publishes) == 1
    assert state_publishes[0].args[1] == "ok"


@patch("mqtt_bambulab.getLastAMSConfig")
def test_no_publish_on_steady_state(mock_get_cfg):
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    mock_get_cfg.return_value = _ams_config(
        0, [_tray(1, unmapped_bambu_tag="DEADBEEF", issue=True)]
    )

    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})
        fake_client.reset_mock()
        # Same state, second tick -> no publish
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

    state_calls = [c for c in fake_client.publish.call_args_list if c.args[0].endswith("/issue/state")]
    assert state_calls == []


@patch("mqtt_bambulab.getLastAMSConfig")
def test_transition_back_to_ok_publishes(mock_get_cfg):
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    # First: issue present
    mock_get_cfg.return_value = _ams_config(
        0, [_tray(1, unmapped_bambu_tag="DEADBEEF", issue=True)]
    )
    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

        # Now: issue resolved
        mock_get_cfg.return_value = _ams_config(0, [_tray(1)])
        fake_client.reset_mock()
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

    state_publishes = [
        c for c in fake_client.publish.call_args_list if c.args[0].endswith("/issue/state")
    ]
    assert len(state_publishes) == 1
    assert state_publishes[0].args[1] == "ok"
    assert ha_mqtt._last_issues[(0, 1)] == "ok"


@patch("mqtt_bambulab.getLastAMSConfig")
def test_mismatch_suppressed_when_not_printing(mock_get_cfg):
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    mock_get_cfg.return_value = _ams_config(
        0, [_tray(1, mismatch=True, issue=True)]
    )

    # IDLE -> stale flag, should not publish material_mismatch
    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "IDLE"})

    state_publishes = [
        c for c in fake_client.publish.call_args_list if c.args[0].endswith("/issue/state")
    ]
    # First sighting publishes the initial "ok" state so HA shows a value
    # (instead of "unknown") — but the stale mismatch flag is suppressed.
    assert len(state_publishes) == 1
    assert state_publishes[0].args[1] == "ok"
    assert ha_mqtt._last_issues.get((0, 1), "ok") == "ok"


@patch("mqtt_bambulab.getLastAMSConfig")
def test_mismatch_published_when_printing(mock_get_cfg):
    _reset_state()
    ha_mqtt._connected = True
    fake_client = MagicMock()
    ha_mqtt._client = fake_client

    mock_get_cfg.return_value = _ams_config(
        0, [_tray(1, mismatch=True, issue=True)]
    )

    with patch.object(ha_mqtt.config, "HA_MQTT_ENABLED", True):
        ha_mqtt.publish_tray_state_diff({"gcode_state": "RUNNING"})

    state_publishes = [
        c for c in fake_client.publish.call_args_list if c.args[0].endswith("/issue/state")
    ]
    assert len(state_publishes) == 1
    assert state_publishes[0].args[1] == "material_mismatch"
