"""
NFC Tag API endpoints.
"""

import json
import traceback
import uuid

from flask import Blueprint, request

import mqtt_bambulab
import spoolman_client
import spoolman_service
from config import BASE_URL
from .common import (
    json_success,
    json_error,
    serialize_spool,
    clean_json_value,
    READ_ONLY_MODE,
    ACTIVE_PRINTER_ID,
)

tags_bp = Blueprint("tags", __name__)


@tags_bp.route("/tags", methods=["GET"])
def list_tags():
    """List all spools with NFC tags."""
    try:
        spools = spoolman_service.fetchSpools()
        tagged_spools = []

        for spool in spools:
            extra = spool.get("extra", {}) or {}
            tag = clean_json_value(extra.get("tag"))

            if tag:
                spool_data = serialize_spool(spool)
                spool_data["tag_id"] = tag
                tagged_spools.append(spool_data)

        return json_success(tagged_spools)
    except Exception as exc:
        traceback.print_exc()
        return json_error("TAGS_FETCH_FAILED", f"Failed to fetch tags: {exc}", 500)


@tags_bp.route("/tags/generate", methods=["POST"])
def generate_tag():
    """Generate a new UUID for an NFC tag."""
    try:
        tag_id = str(uuid.uuid4())

        # Build the URL that will be written to the NFC tag
        base_url = BASE_URL.rstrip("/") if BASE_URL else ""
        tag_url = f"{base_url}/spool_info?tag_id={tag_id}"

        return json_success({
            "tag_id": tag_id,
            "tag_url": tag_url,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("GENERATE_FAILED", f"Failed to generate tag ID: {exc}", 500)


@tags_bp.route("/spools/<int:spool_id>/tag", methods=["POST"])
def assign_tag(spool_id: int):
    """Assign an NFC tag to a spool."""
    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Read-only mode: cannot assign tags.", 403)

    try:
        body = request.get_json(silent=True) or {}
        tag_id = body.get("tag_id")

        if not tag_id:
            return json_error("INVALID_REQUEST", "Field 'tag_id' is required.", 400)

        # Get current spool data
        spool = spoolman_client.getSpoolById(spool_id)
        if not spool or spool.get("id") is None:
            return json_error("SPOOL_NOT_FOUND", f"Spool '{spool_id}' not found", 404)

        # Check if tag is already assigned to another spool
        spools = spoolman_service.fetchSpools()
        for s in spools:
            if s.get("id") == spool_id:
                continue
            extra = s.get("extra", {}) or {}
            existing_tag = clean_json_value(extra.get("tag"))
            if existing_tag and existing_tag == tag_id:
                return json_error("TAG_IN_USE", f"Tag '{tag_id}' is already assigned to spool {s.get('id')}", 409)

        # Update spool with new tag
        extras = spool.get("extra", {}) or {}
        spoolman_client.patchExtraTags(spool_id, extras, {"tag": json.dumps(tag_id)})

        # Fetch updated spool
        spool = spoolman_client.getSpoolById(spool_id)
        return json_success(serialize_spool(spool))
    except Exception as exc:
        traceback.print_exc()
        return json_error("ASSIGN_FAILED", f"Failed to assign tag: {exc}", 500)


@tags_bp.route("/spools/<int:spool_id>/tag", methods=["DELETE"])
def remove_tag(spool_id: int):
    """Remove the NFC tag from a spool."""
    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Read-only mode: cannot remove tags.", 403)

    try:
        # Get current spool data
        spool = spoolman_client.getSpoolById(spool_id)
        if not spool or spool.get("id") is None:
            return json_error("SPOOL_NOT_FOUND", f"Spool '{spool_id}' not found", 404)

        extras = spool.get("extra", {}) or {}
        current_tag = clean_json_value(extras.get("tag"))

        if not current_tag:
            return json_error("NO_TAG", f"Spool '{spool_id}' has no tag assigned", 404)

        # Remove tag
        spoolman_client.patchExtraTags(spool_id, extras, {"tag": ""})

        return json_success({
            "spool_id": spool_id,
            "removed_tag": current_tag,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("REMOVE_FAILED", f"Failed to remove tag: {exc}", 500)


@tags_bp.route("/tags/link-bambu", methods=["POST"])
def link_bambu_tag():
    """Link a Bambu Lab RFID tag to a Spoolman spool."""
    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Read-only mode: cannot link Bambu tags.", 403)

    try:
        body = request.get_json(silent=True) or {}
        bambu_tag = body.get("bambu_tag")
        spool_id = body.get("spool_id")
        ams_id = body.get("ams_id")
        tray_id = body.get("tray_id")

        if not bambu_tag:
            return json_error("INVALID_REQUEST", "Field 'bambu_tag' is required.", 400)
        if not spool_id:
            return json_error("INVALID_REQUEST", "Field 'spool_id' is required.", 400)

        # Get spool data
        spool = spoolman_client.getSpoolById(spool_id)
        if not spool or spool.get("id") is None:
            return json_error("SPOOL_NOT_FOUND", f"Spool '{spool_id}' not found", 404)

        # Update spool with Bambu tag
        extras = spool.get("extra", {}) or {}
        spoolman_client.patchExtraTags(spool_id, extras, {"tag": json.dumps(bambu_tag)})

        # Fetch updated spool with the new tag
        spool = spoolman_client.getSpoolById(spool_id)

        # Invalidate the spool cache so MQTT handlers see the new tag
        spoolman_service.fetchSpools(cached=False)

        # If AMS/tray info provided, also set as active tray in Spoolman
        if ams_id is not None and tray_id is not None:
            try:
                # Use the updated spool extras (with the new tag)
                spoolman_service.setActiveTray(spool_id, spool.get("extra"), ams_id, tray_id)
                # Refresh the spool to include the active_tray update
                spool = spoolman_client.getSpoolById(spool_id)
                # Ensure cache is up to date after setActiveTray
                spoolman_service.fetchSpools(cached=False)
            except Exception:
                pass  # Non-critical if tray assignment fails

        # Request immediate AMS update from printer so the new tag is recognized
        try:
            from messages import PUSH_ALL
            client = mqtt_bambulab.getMqttClient()
            if client and mqtt_bambulab.isMqttClientConnected():
                mqtt_bambulab.publish(client, PUSH_ALL)
        except Exception:
            pass  # Non-critical if push fails
        return json_success({
            "spool": serialize_spool(spool),
            "bambu_tag": bambu_tag,
            "ams_id": ams_id,
            "tray_id": tray_id,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("LINK_FAILED", f"Failed to link Bambu tag: {exc}", 500)
