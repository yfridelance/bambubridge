"""
Print History API endpoints.
"""

import json
import traceback

from flask import Blueprint, request

import print_history as print_history_service
import spoolman_client
import spoolman_service
from config import BASE_URL
from .common import json_success, json_error, serialize_spool

prints_bp = Blueprint("prints", __name__)


def _serialize_print(print_record: dict, layer_tracking: dict = None) -> dict:
    """Serialize a print record for API response."""
    print_id = print_record.get("id")

    # Parse filament info JSON
    filament_info = []
    raw_filament = print_record.get("filament_info")
    if raw_filament:
        try:
            filament_info = json.loads(raw_filament) if isinstance(raw_filament, str) else raw_filament
        except json.JSONDecodeError:
            filament_info = []

    # Calculate total cost and filament
    total_cost = 0.0
    total_filament_g = 0.0

    for filament in filament_info:
        grams = filament.get("grams_used") or 0
        total_filament_g += grams
        # Cost calculation would require spool data - simplified here

    # Build image URL if available
    image_url = None
    image_file = print_record.get("image_file")
    if image_file:
        image_url = f"{BASE_URL}/static/prints/{image_file}" if BASE_URL else f"/static/prints/{image_file}"

    # Layer tracking data
    tracking = None
    if layer_tracking and print_id in layer_tracking:
        t = layer_tracking[print_id]
        progress = None
        if t.get("total_layers") and t.get("layers_printed"):
            progress = round((t["layers_printed"] / t["total_layers"]) * 100, 1)

        tracking = {
            "status": t.get("status", "UNKNOWN"),
            "total_layers": t.get("total_layers"),
            "layers_printed": t.get("layers_printed"),
            "filament_grams_billed": t.get("filament_grams_billed"),
            "filament_grams_total": t.get("filament_grams_total"),
            "progress_percent": progress,
            "predicted_end_time": t.get("predicted_end_time"),
            "actual_end_time": t.get("actual_end_time"),
        }

    return {
        "id": print_id,
        "print_date": print_record.get("print_date"),
        "file_name": print_record.get("file_name"),
        "print_type": print_record.get("print_type"),
        "image_url": image_url,
        "total_cost": total_cost,
        "total_filament_g": total_filament_g,
        "filaments": filament_info,
        "layer_tracking": tracking,
    }


@prints_bp.route("/prints", methods=["GET"])
def list_prints():
    """List print history with pagination."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        spool_id = request.args.get("spool_id", type=int)

        # Limit per_page to reasonable bounds
        per_page = min(max(per_page, 1), 100)
        offset = (page - 1) * per_page

        if spool_id:
            # Filter by spool
            prints = print_history_service.get_prints_by_spool(spool_id)
            total = len(prints)
            prints = prints[offset:offset + per_page]
            layer_tracking = {}
        else:
            prints, total = print_history_service.get_prints_with_filament(
                limit=per_page,
                offset=offset
            )
            # Get layer tracking for these prints
            print_ids = [p["id"] for p in prints]
            layer_tracking = print_history_service.get_layer_tracking_for_prints(print_ids)

        pages = (total + per_page - 1) // per_page if per_page else 1

        return json_success({
            "prints": [_serialize_print(p, layer_tracking) for p in prints],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("PRINTS_FETCH_FAILED", f"Failed to fetch print history: {exc}", 500)


@prints_bp.route("/prints/<int:print_id>", methods=["GET"])
def get_print(print_id: int):
    """Get a specific print by ID."""
    try:
        prints, _ = print_history_service.get_prints_with_filament(limit=None, offset=None)

        for p in prints:
            if p["id"] == print_id:
                layer_tracking = print_history_service.get_layer_tracking_for_prints([print_id])
                return json_success(_serialize_print(p, layer_tracking))

        return json_error("PRINT_NOT_FOUND", f"Print '{print_id}' not found", 404)
    except Exception as exc:
        traceback.print_exc()
        return json_error("PRINT_FETCH_FAILED", f"Failed to fetch print: {exc}", 500)


@prints_bp.route("/prints/<int:print_id>/filaments/<int:ams_slot>", methods=["PATCH"])
def update_print_filament(print_id: int, ams_slot: int):
    """Update the spool assignment for a specific filament slot in a print."""
    try:
        body = request.get_json(silent=True) or {}
        new_spool_id = body.get("spool_id")

        if new_spool_id is None:
            return json_error("INVALID_REQUEST", "Field 'spool_id' is required.", 400)

        # Get current filament usage for this slot
        current = print_history_service.get_filament_for_slot(print_id, ams_slot)
        if not current:
            return json_error("FILAMENT_NOT_FOUND", f"No filament found for print {print_id}, slot {ams_slot}", 404)

        old_spool_id = current.get("spool_id")
        grams_used = current.get("grams_used") or 0
        length_used = current.get("length_used")

        # If changing spool, adjust consumption
        if old_spool_id and old_spool_id != new_spool_id:
            # Reverse consumption from old spool (negative consume)
            try:
                spoolman_client.consumeSpool(old_spool_id, -grams_used, -length_used if length_used else None)
            except Exception:
                pass  # Old spool might no longer exist

        if new_spool_id:
            # Add consumption to new spool
            try:
                spoolman_client.consumeSpool(new_spool_id, grams_used, length_used)
            except Exception as exc:
                return json_error("CONSUME_FAILED", f"Failed to update spool consumption: {exc}", 500)

        # Update database
        print_history_service.update_filament_spool(print_id, ams_slot, new_spool_id)

        # Get updated spool info
        spool_data = None
        if new_spool_id:
            try:
                spool = spoolman_client.getSpoolById(new_spool_id)
                if spool:
                    spool_data = serialize_spool(spool)
            except Exception:
                pass

        return json_success({
            "print_id": print_id,
            "ams_slot": ams_slot,
            "spool_id": new_spool_id,
            "spool": spool_data,
            "grams_used": grams_used,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("UPDATE_FAILED", f"Failed to update filament assignment: {exc}", 500)


@prints_bp.route("/prints/<int:print_id>/tracking", methods=["GET"])
def get_print_tracking(print_id: int):
    """Get layer tracking data for a specific print."""
    try:
        tracking = print_history_service.get_layer_tracking_for_prints([print_id])

        if print_id not in tracking:
            return json_error("TRACKING_NOT_FOUND", f"No tracking data for print '{print_id}'", 404)

        t = tracking[print_id]
        progress = None
        if t.get("total_layers") and t.get("layers_printed"):
            progress = round((t["layers_printed"] / t["total_layers"]) * 100, 1)

        return json_success({
            "print_id": print_id,
            "status": t.get("status", "UNKNOWN"),
            "total_layers": t.get("total_layers"),
            "layers_printed": t.get("layers_printed"),
            "filament_grams_billed": t.get("filament_grams_billed"),
            "filament_grams_total": t.get("filament_grams_total"),
            "progress_percent": progress,
            "predicted_end_time": t.get("predicted_end_time"),
            "actual_end_time": t.get("actual_end_time"),
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("TRACKING_FETCH_FAILED", f"Failed to fetch tracking data: {exc}", 500)
