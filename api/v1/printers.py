"""
Printer API endpoints.
"""

import traceback

from flask import Blueprint

import mqtt_bambulab
from .common import (
    json_success,
    json_error,
    printer_matches,
    load_printer_summary,
    ACTIVE_PRINTER_ID,
)

printers_bp = Blueprint("printers", __name__)


@printers_bp.route("/printers", methods=["GET"])
def list_printers():
    """List all printers."""
    try:
        printer = load_printer_summary()
        return json_success([printer])
    except Exception as exc:
        traceback.print_exc()
        return json_error("PRINTER_FETCH_FAILED", f"Failed to load printer info: {exc}", 500)


@printers_bp.route("/printers/<printer_id>", methods=["GET"])
def get_printer(printer_id: str):
    """Get a specific printer by ID."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    try:
        printer = load_printer_summary()
        return json_success(printer)
    except Exception as exc:
        traceback.print_exc()
        return json_error("PRINTER_FETCH_FAILED", f"Failed to load printer info: {exc}", 500)


@printers_bp.route("/printers/<printer_id>/status", methods=["GET"])
def get_printer_status(printer_id: str):
    """Get detailed printer status including MQTT connection."""
    if not printer_matches(printer_id):
        return json_error("PRINTER_NOT_FOUND", f"Printer '{printer_id}' not found", 404)

    try:
        model = mqtt_bambulab.getPrinterModel() or {}

        status = {
            "printer_id": ACTIVE_PRINTER_ID,
            "online": mqtt_bambulab.isMqttClientConnected(),
            "mqtt_connected": mqtt_bambulab.isMqttClientConnected(),
            "model": model.get("model"),
        }

        return json_success(status)
    except Exception as exc:
        traceback.print_exc()
        return json_error("STATUS_FETCH_FAILED", f"Failed to fetch printer status: {exc}", 500)
