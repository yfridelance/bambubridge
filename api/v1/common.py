"""
Common utilities for API v1 endpoints.
"""

import json
from typing import Any, Dict, List, Optional, Tuple

from flask import jsonify

import mqtt_bambulab
import spoolman_service
import test_data
from config import EXTERNAL_SPOOL_AMS_ID, PRINTER_ID, PRINTER_NAME, LIVE_READONLY

# Read-only mode check
READ_ONLY_MODE = (not test_data.test_data_active()) and LIVE_READONLY
ACTIVE_PRINTER_ID = (PRINTER_ID or "").upper() or "PRINTER_1"


def json_success(data: Any, status: int = 200):
    """Return a successful JSON response."""
    return jsonify({"success": True, "data": data}), status


def json_error(code: str, message: str, status: int = 400):
    """Return an error JSON response."""
    return jsonify({"success": False, "error": {"code": code, "message": message}}), status


def printer_matches(printer_id: str) -> bool:
    """Check if the given printer_id matches the active printer.

    Accepts both the actual printer serial number and 'PRINTER_1' as valid IDs
    since this system supports only one printer.
    """
    normalized = str(printer_id or "").upper()
    return normalized == ACTIVE_PRINTER_ID or normalized == "PRINTER_1"


def clean_json_value(value: Any) -> Any:
    """Parse a JSON string value if possible."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def serialize_spool(spool: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a spool object for API response."""
    filament = spool.get("filament", {}) or {}
    extra = spool.get("extra", {}) or {}

    tag = clean_json_value(extra.get("tag"))

    assigned_ams_id = None
    assigned_tray_index = None
    active_tray = extra.get("active_tray")
    if active_tray:
        try:
            tray_uid = json.loads(active_tray)
            parts = tray_uid.split("_")
            if len(parts) >= 2:
                assigned_tray_index = int(parts[-1])
                assigned_ams_id = int(parts[-2])
        except Exception:
            assigned_ams_id = None
            assigned_tray_index = None

    return {
        "id": str(spool.get("id")),
        "name": filament.get("name") or spool.get("name") or f"Spool {spool.get('id')}",
        "material": filament.get("material") or "",
        "vendor": (filament.get("vendor") or {}).get("name"),
        "color": filament.get("multi_color_hexes") or filament.get("color_hex") or "",
        "diameter_mm": filament.get("diameter"),
        "weight_g": spool.get("initial_weight") or filament.get("weight"),
        "remaining_g": spool.get("remaining_weight"),
        "remaining_length_mm": spool.get("remaining_length"),
        "tag": tag,
        "location": spool.get("location"),
        "ams_id": assigned_ams_id,
        "tray_index": assigned_tray_index,
        "last_used": spool.get("last_used"),
        "registered": spool.get("registered"),
        "filament_extra": filament.get("extra", {}),
    }


def find_spool_for_tray(spools: List[Dict[str, Any]], ams_id: int, tray_id: int) -> Optional[Dict[str, Any]]:
    """Find a spool assigned to a specific tray."""
    tray_uid = spoolman_service.trayUid(ams_id, tray_id)
    for spool in spools:
        active = clean_json_value((spool.get("extra") or {}).get("active_tray"))
        if active and active == tray_uid:
            return spool
    return None


def serialize_tray(tray: Dict[str, Any], spools: List[Dict[str, Any]], ams_id: int) -> Dict[str, Any]:
    """Serialize a tray object for API response."""
    tray_id = int(tray.get("id") or 0)
    matched_spool = find_spool_for_tray(spools, ams_id, tray_id)

    filament = matched_spool.get("filament", {}) if matched_spool else {}
    spool_name = filament.get("name") if matched_spool else None
    spool_id = matched_spool.get("id") if matched_spool else None
    vendor = (filament.get("vendor") or {}).get("name")
    material = filament.get("material") or tray.get("tray_type") or ""

    tray_color_raw = tray.get("tray_color") or ""
    tray_color = spoolman_service.normalize_color_hex(tray_color_raw)
    tray_color_value = f"#{tray_color}" if tray_color else ""

    spool_color_value = ""
    color_mismatch = False
    color_mismatch_message = ""
    has_multi_color = False
    raw_multi_color = filament.get("multi_color_hexes")
    if raw_multi_color:
        has_multi_color = True
        first_color = None
        if isinstance(raw_multi_color, list):
            first_color = raw_multi_color[0] if raw_multi_color else None
        else:
            first_color = str(raw_multi_color).split(",")[0]
        normalized = spoolman_service.normalize_color_hex(first_color or "")
        if normalized:
            spool_color_value = f"#{normalized}"
    else:
        normalized = spoolman_service.normalize_color_hex(filament.get("color_hex") or "")
        if normalized:
            spool_color_value = f"#{normalized}"

    if not has_multi_color and tray_color_value and spool_color_value:
        distance = spoolman_service.color_distance(tray_color_value, spool_color_value)
        if distance is not None and distance > spoolman_service.COLOR_DISTANCE_TOLERANCE:
            color_mismatch = True
            color_mismatch_message = "Colors are not similar."

    color_value = spool_color_value or tray_color_value
    active = bool(tray.get("state") == 3 or matched_spool)
    is_loaded = bool(tray.get("remain")) or bool(matched_spool)
    remaining_g = None
    if matched_spool:
        remaining_g = matched_spool.get("remaining_weight")
        if remaining_g is None:
            remaining_g = matched_spool.get("remain")
    else:
        remaining_g = tray.get("remain")

    # Get issue info from augmented tray data if available
    issue = tray.get("issue", False)
    issue_type = None
    if tray.get("mismatch"):
        issue_type = "material_mismatch"
    elif tray.get("color_mismatch"):
        issue_type = "color_mismatch"
    elif tray.get("unmapped_bambu_tag"):
        issue_type = "unmapped_tag"
    elif tray.get("non_bambu_spool"):
        issue_type = "non_bambu_spool"

    return {
        "index": tray_id,
        "ams_id": ams_id,
        "spool_id": spool_id,
        "spool_name": spool_name,
        "material": material,
        "color": color_value,
        "tray_color": tray_color_value,
        "spool_color": spool_color_value,
        "color_mismatch": color_mismatch,
        "color_mismatch_message": color_mismatch_message,
        "spool_vendor": vendor,
        "remaining_g": remaining_g,
        "active": active,
        "is_loaded": is_loaded,
        "issue": issue,
        "issue_type": issue_type,
        "unmapped_bambu_tag": tray.get("unmapped_bambu_tag"),
        "non_bambu_spool": bool(tray.get("non_bambu_spool")),
    }


def load_printer_summary() -> Dict[str, Any]:
    """Load printer summary information."""
    model = mqtt_bambulab.getPrinterModel()
    name = PRINTER_NAME or model.get("devicename") or "Printer"

    return {
        "id": ACTIVE_PRINTER_ID,
        "name": name,
        "model": model.get("model"),
        "online": mqtt_bambulab.isMqttClientConnected(),
        "last_seen": None,
    }


def load_trays() -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Load all trays with their spool assignments."""
    config = mqtt_bambulab.getLastAMSConfig() or {}
    spools = spoolman_service.fetchSpools()

    trays: List[Dict[str, Any]] = []

    vt_tray = config.get("vt_tray")
    if vt_tray:
        trays.append(serialize_tray(vt_tray, spools, EXTERNAL_SPOOL_AMS_ID))

    for ams in config.get("ams", []):
        ams_id = int(ams.get("id", 0))
        for tray in ams.get("tray", []):
            trays.append(serialize_tray(tray, spools, ams_id))

    return trays, config


def resolve_tray_context(tray_index: int) -> Tuple[Optional[int], Optional[int]]:
    """Resolve AMS ID and tray index from a global tray index."""
    config = mqtt_bambulab.getLastAMSConfig() or {}

    vt_tray = config.get("vt_tray")
    if vt_tray and int(vt_tray.get("id", -1)) == tray_index:
        return EXTERNAL_SPOOL_AMS_ID, tray_index

    for ams in config.get("ams", []):
        ams_id = int(ams.get("id", -1))
        for tray in ams.get("tray", []):
            if int(tray.get("id", -1)) == tray_index:
                return ams_id, tray_index

    return None, None
