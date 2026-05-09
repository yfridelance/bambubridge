"""
AMS and Tray API endpoints.
"""

import traceback

from flask import Blueprint, request

import mqtt_bambulab
import spoolman_client
import spoolman_service
from config import EXTERNAL_SPOOL_AMS_ID, EXTERNAL_SPOOL_ID
import spoolman_service as spool_svc
from .common import (
    json_success,
    json_error,
    printer_matches,
    load_trays,
    resolve_tray_context,
    serialize_tray,
    find_spool_for_tray,
    ACTIVE_PRINTER_ID,
    READ_ONLY_MODE,
)

ams_bp = Blueprint("ams", __name__)


@ams_bp.route("/printers/<printer_id>/ams", methods=["GET"])
def get_ams(printer_id: str):
    """Get all AMS data for a printer."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    try:
        config = mqtt_bambulab.getLastAMSConfig() or {}
        spools = spoolman_service.fetchSpools()
        ams_models = mqtt_bambulab.getDetectedAmsModelsById()

        # Build AMS units structure
        ams_units = []
        for ams in config.get("ams", []):
            ams_id = int(ams.get("id", 0))
            ams_model = ams_models.get(str(ams_id)) or ams_models.get(ams_id) or "AMS"

            trays = []
            for tray in ams.get("tray", []):
                trays.append(serialize_tray(tray, spools, ams_id))

            ams_units.append({
                "id": ams_id,
                "model": ams_model,
                "humidity": ams.get("humidity"),
                "temperature": ams.get("temp"),
                "trays": trays,
            })

        # External tray
        external_tray = None
        vt_tray = config.get("vt_tray")
        if vt_tray:
            external_tray = serialize_tray(vt_tray, spools, EXTERNAL_SPOOL_AMS_ID)

        payload = {
            "printer_id": ACTIVE_PRINTER_ID,
            "external_tray": external_tray,
            "ams_units": ams_units,
        }
        return json_success(payload)
    except Exception as exc:
        traceback.print_exc()
        return json_error("AMS_FETCH_FAILED", f"Failed to fetch AMS data: {exc}", 500)


@ams_bp.route("/printers/<printer_id>/trays", methods=["GET"])
def get_all_trays(printer_id: str):
    """Get all trays (flat list) for a printer."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    try:
        trays, _ = load_trays()
        return json_success(trays)
    except Exception as exc:
        traceback.print_exc()
        return json_error("TRAYS_FETCH_FAILED", f"Failed to fetch trays: {exc}", 500)


@ams_bp.route("/printers/<printer_id>/trays/<int:tray_index>", methods=["GET"])
def get_tray(printer_id: str, tray_index: int):
    """Get a specific tray by index."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    try:
        trays, _ = load_trays()
        for tray in trays:
            if tray["index"] == tray_index:
                return json_success(tray)

        return json_error("TRAY_NOT_FOUND", f"Tray '{tray_index}' not found", 404)
    except Exception as exc:
        traceback.print_exc()
        return json_error("TRAY_FETCH_FAILED", f"Failed to fetch tray: {exc}", 500)


@ams_bp.route("/printers/<printer_id>/ams/<int:tray_index>/assign", methods=["POST"])
def assign_tray(printer_id: str, tray_index: int):
    """Assign a spool to a tray."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Live read-only mode: assigning spools to trays is disabled.", 403)

    if not mqtt_bambulab.isMqttClientConnected():
        return json_error("PRINTER_OFFLINE", "MQTT is disconnected. Is the printer online?", 503)

    body = request.get_json(silent=True) or {}
    spool_id = body.get("spool_id")

    if not spool_id:
        return json_error("INVALID_REQUEST", "Field 'spool_id' is required.", 400)

    ams_id = body.get("ams_id")
    if ams_id is None:
        ams_id, resolved_tray = resolve_tray_context(tray_index)
        if resolved_tray is None:
            return json_error("TRAY_NOT_FOUND", f"Tray '{tray_index}' not found", 404)
    else:
        try:
            ams_id = int(ams_id)
        except (TypeError, ValueError):
            return json_error("INVALID_REQUEST", "ams_id must be an integer when provided.", 400)
        resolved_tray = tray_index

    try:
        spool_data = spoolman_client.getSpoolById(spool_id)
    except Exception as exc:
        traceback.print_exc()
        return json_error("SPOOL_FETCH_FAILED", f"Failed to fetch spool '{spool_id}': {exc}", 502)

    if not spool_data or spool_data.get("id") is None:
        return json_error("SPOOL_NOT_FOUND", f"Spool '{spool_id}' not found", 404)

    try:
        mqtt_bambulab.setActiveTray(spool_id, spool_data.get("extra"), ams_id, resolved_tray)

        # Reuse the existing assignment logic from app.setActiveSpool
        from app import setActiveSpool
        setActiveSpool(ams_id, resolved_tray, spool_data)
    except Exception as exc:
        traceback.print_exc()
        return json_error("ASSIGN_FAILED", f"Failed to assign spool '{spool_id}' to tray '{tray_index}': {exc}", 500)

    return json_success({
        "printer_id": ACTIVE_PRINTER_ID,
        "tray_index": tray_index,
        "ams_id": ams_id,
        "spool_id": spool_id
    })


@ams_bp.route("/printers/<printer_id>/ams/<int:tray_index>/unassign", methods=["POST"])
def unassign_tray(printer_id: str, tray_index: int):
    """Unassign a spool from a tray."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Live read-only mode: unassigning spools from trays is disabled.", 403)

    body = request.get_json(silent=True) or {}
    spool_id = body.get("spool_id")

    try:
        import spoolman_service

        spool = None
        if spool_id:
            spool = spoolman_client.getSpoolById(spool_id)
        else:
            spools = spoolman_service.fetchSpools()
            ams_id, _ = resolve_tray_context(tray_index)
            if ams_id is None:
                return json_error("TRAY_NOT_FOUND", f"Tray '{tray_index}' not found", 404)
            spool = find_spool_for_tray(spools, ams_id, tray_index)

        if not spool or spool.get("id") is None:
            return json_error("SPOOL_NOT_FOUND", "No spool assigned to this tray", 404)

        extras = spool.get("extra") or {}
        spoolman_client.patchExtraTags(spool["id"], extras, {"active_tray": ""})

        return json_success({
            "printer_id": ACTIVE_PRINTER_ID,
            "tray_index": tray_index,
            "spool_id": spool["id"],
            "unassigned": True,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("UNASSIGN_FAILED", f"Failed to unassign tray: {exc}", 500)


@ams_bp.route("/printers/<printer_id>/external-spool/reset", methods=["POST"])
def reset_external_spool(printer_id: str):
    """Reset/unassign the external spool."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    if READ_ONLY_MODE:
        return json_error("READ_ONLY_MODE", "Live read-only mode: resetting external spool is disabled.", 403)

    try:
        # Clear the active spool assignment for external tray
        spool_svc.clear_active_spool_for_tray(EXTERNAL_SPOOL_ID, 0)

        return json_success({
            "printer_id": ACTIVE_PRINTER_ID,
            "external_spool_reset": True,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("RESET_FAILED", f"Failed to reset external spool: {exc}", 500)
