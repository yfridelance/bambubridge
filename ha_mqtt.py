"""Home Assistant MQTT publisher for AMS tray issues.

Connects to a separate Home Assistant MQTT broker (independent of the printer
MQTT connection in mqtt_bambulab.py) and publishes:

  * MQTT Discovery configs so each AMS tray appears as a sensor in HA.
  * Retained state updates on transitions (`ok` <-> issue type).
  * Non-retained events for use as HA automation triggers.

Notifications themselves are built by the user in HA — BambuBridge only
emits the events.
"""

from __future__ import annotations

import json
import ssl
import threading
import time
import traceback
from typing import Any, Dict, Optional, Tuple

import paho.mqtt.client as mqtt

import config
from api.v1.common import derive_tray_issue_type
from logger import log

ISSUE_TYPES = ("unmapped_tag", "non_bambu_spool", "material_mismatch", "color_mismatch")
ACTIVE_PRINT_STATES = {"PREPARE", "RUNNING"}

# Globals
_client: Optional[mqtt.Client] = None
_connected: bool = False
_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_last_issues: Dict[Tuple[int, int], str] = {}
_known_trays: set[Tuple[int, int]] = set()
_lock = threading.Lock()


def _device_identifier() -> str:
    return f"bambubridge_{(config.PRINTER_ID or 'printer').lower()}"


def _device_payload() -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "identifiers": [_device_identifier()],
        "name": config.PRINTER_NAME or "BambuBridge",
        "manufacturer": "BambuBridge",
        "model": "AMS Bridge",
    }
    if config.PUBLIC_URL:
        payload["configuration_url"] = config.PUBLIC_URL
    return payload


def _state_topic(ams_id: int, tray_id: int) -> str:
    return f"{config.HA_MQTT_BASE_TOPIC}/ams/{ams_id}/tray/{tray_id}/issue/state"


def _attributes_topic(ams_id: int, tray_id: int) -> str:
    return f"{config.HA_MQTT_BASE_TOPIC}/ams/{ams_id}/tray/{tray_id}/issue/attributes"


def _discovery_topic(ams_id: int, tray_id: int) -> str:
    object_id = f"{_device_identifier()}_ams{ams_id}_tray{tray_id}_issue"
    return f"{config.HA_MQTT_DISCOVERY_PREFIX}/sensor/{object_id}/config"


def _event_topic() -> str:
    return f"{config.HA_MQTT_BASE_TOPIC}/events/tray_issue"


def _availability_topic() -> str:
    return f"{config.HA_MQTT_BASE_TOPIC}/status"


def _publish_discovery(ams_id: int, tray_id: int) -> None:
    if _client is None:
        return
    unique_id = f"{_device_identifier()}_ams{ams_id}_tray{tray_id}_issue"
    payload = {
        "name": f"AMS {ams_id} Tray {tray_id} Issue",
        "unique_id": unique_id,
        "object_id": unique_id,
        "state_topic": _state_topic(ams_id, tray_id),
        "json_attributes_topic": _attributes_topic(ams_id, tray_id),
        "availability_topic": _availability_topic(),
        "payload_available": "online",
        "payload_not_available": "offline",
        "icon": "mdi:printer-3d-nozzle-alert",
        "device": _device_payload(),
    }
    _client.publish(
        _discovery_topic(ams_id, tray_id),
        json.dumps(payload),
        qos=1,
        retain=True,
    )


def _publish_state(ams_id: int, tray_id: int, issue_type: str, attributes: Dict[str, Any]) -> None:
    if _client is None:
        return
    _client.publish(_state_topic(ams_id, tray_id), issue_type, qos=1, retain=True)
    _client.publish(
        _attributes_topic(ams_id, tray_id),
        json.dumps(attributes),
        qos=1,
        retain=True,
    )


def _publish_event(payload: Dict[str, Any]) -> None:
    if _client is None:
        return
    _client.publish(_event_topic(), json.dumps(payload), qos=1, retain=False)


def _tray_attributes(ams_id: int, tray_id: int, tray: Dict[str, Any], issue_type: str) -> Dict[str, Any]:
    return {
        "ams_id": ams_id,
        "tray_id": tray_id,
        "issue_type": issue_type,
        "tray_color": tray.get("tray_color"),
        "tray_type": tray.get("tray_type"),
        "tray_sub_brands": tray.get("tray_sub_brands"),
        "tray_uuid": tray.get("tray_uuid"),
        "unmapped_bambu_tag": tray.get("unmapped_bambu_tag"),
        "non_bambu_spool": bool(tray.get("non_bambu_spool")),
        "printer_id": (config.PRINTER_ID or "").upper(),
        "configuration_url": config.PUBLIC_URL or None,
    }


def _iter_trays(printer_state: Dict[str, Any]):
    """Yield (ams_id, tray_id, tray, gcode_state) for every tray in PRINTER_STATE / LAST_AMS_CONFIG."""
    # Prefer LAST_AMS_CONFIG since on_message writes there; printer_state may not
    # carry the augmented tray dicts.
    import mqtt_bambulab

    config_dict = mqtt_bambulab.getLastAMSConfig() or {}
    gcode_state = (printer_state or {}).get("gcode_state") or ""

    for ams in config_dict.get("ams", []) or []:
        try:
            ams_id = int(ams.get("id", 0))
        except (TypeError, ValueError):
            continue
        for tray in ams.get("tray", []) or []:
            try:
                tray_id = int(tray.get("id", 0))
            except (TypeError, ValueError):
                continue
            yield ams_id, tray_id, tray, gcode_state


def publish_tray_state_diff(printer_state: Dict[str, Any]) -> None:
    """Diff current tray issue state against last seen, publish on change.

    Called from mqtt_bambulab.on_message at the end of each printer tick.
    Designed to never raise — failures are logged.
    """
    if not config.HA_MQTT_ENABLED or not _connected:
        return

    try:
        with _lock:
            current: Dict[Tuple[int, int], Tuple[str, Dict[str, Any]]] = {}

            for ams_id, tray_id, tray, gcode_state in _iter_trays(printer_state):
                issue_type = derive_tray_issue_type(tray) or "ok"

                # Material/color mismatch flags are only meaningful while a
                # print is being prepared or running; otherwise they're stale.
                if issue_type in ("material_mismatch", "color_mismatch") and gcode_state not in ACTIVE_PRINT_STATES:
                    issue_type = "ok"

                current[(ams_id, tray_id)] = (issue_type, tray)

            # Publish discovery for any newly-seen trays. Track them so the
            # initial state below is treated as a transition from "unknown"
            # (HA shows the entity but has no value yet) and gets published.
            newly_seen = current.keys() - _known_trays
            for key in newly_seen:
                _publish_discovery(*key)
                _known_trays.add(key)

            for key, (issue_type, tray) in current.items():
                is_first_sighting = key in newly_seen
                previous = _last_issues.get(key, "ok")
                if not is_first_sighting and previous == issue_type:
                    continue

                attributes = _tray_attributes(key[0], key[1], tray, issue_type)
                _publish_state(key[0], key[1], issue_type, attributes)
                _publish_event({
                    "event": "tray_issue_changed",
                    "previous": previous,
                    "current": issue_type,
                    **attributes,
                })
                _last_issues[key] = issue_type
    except Exception as exc:
        log(f"⚠️ ha_mqtt publish failed: {exc}")
        traceback.print_exc()


def _on_connect(client, _userdata, _flags, rc):
    global _connected
    if rc != 0:
        log(f"⚠️ ha_mqtt connect failed with rc={rc}")
        return
    _connected = True
    log("✅ ha_mqtt connected to Home Assistant broker")
    # Announce online (retained) so HA shows the sensors as available
    client.publish(_availability_topic(), "online", qos=1, retain=True)
    # Re-publish discovery + last known states (in case HA restarted)
    with _lock:
        for key in list(_known_trays):
            _publish_discovery(*key)
        for key, issue_type in list(_last_issues.items()):
            client.publish(_state_topic(*key), issue_type, qos=1, retain=True)


def _on_disconnect(_client, _userdata, rc):
    global _connected
    _connected = False
    if rc != 0:
        log(f"⚠️ ha_mqtt disconnected unexpectedly (rc={rc})")


def _connect_loop():
    global _client
    while not _stop_event.is_set():
        try:
            client = mqtt.Client(client_id=f"{_device_identifier()}_publisher")
            if config.HA_MQTT_USER:
                client.username_pw_set(config.HA_MQTT_USER, config.HA_MQTT_PASSWORD or None)
            if config.HA_MQTT_TLS:
                client.tls_set_context(ssl.create_default_context())
            client.on_connect = _on_connect
            client.on_disconnect = _on_disconnect
            client.will_set(_availability_topic(), "offline", qos=1, retain=True)

            log(f"🔄 ha_mqtt connecting to {config.HA_MQTT_HOST}:{config.HA_MQTT_PORT} …")
            client.connect(config.HA_MQTT_HOST, config.HA_MQTT_PORT, keepalive=60)
            _client = client
            client.loop_forever(retry_first_connection=False)
        except Exception as exc:
            log(f"⚠️ ha_mqtt connection error: {exc}, retrying in 15s")
        finally:
            _client = None
        if _stop_event.wait(15):
            break


def init() -> None:
    """Start the HA MQTT publisher thread if enabled and configured."""
    global _thread
    if not config.HA_MQTT_ENABLED:
        log("ℹ️ ha_mqtt disabled (BAMBUBRIDGE_HA_MQTT_ENABLED not set)")
        return
    if not config.HA_MQTT_HOST:
        log("⚠️ ha_mqtt enabled but BAMBUBRIDGE_HA_MQTT_HOST is empty — skipping")
        return
    if _thread and _thread.is_alive():
        return
    _stop_event.clear()
    _thread = threading.Thread(target=_connect_loop, daemon=True, name="ha-mqtt")
    _thread.start()


def cleanup() -> None:
    """Stop the HA MQTT publisher cleanly."""
    _stop_event.set()
    client = _client
    if client is None:
        return
    try:
        client.publish(_availability_topic(), "offline", qos=1, retain=True)
        time.sleep(0.1)  # let LWT flush
    except Exception:
        pass
    try:
        client.disconnect()
    except Exception:
        pass


def is_connected() -> bool:
    return _connected


def is_enabled() -> bool:
    return bool(config.HA_MQTT_ENABLED)
