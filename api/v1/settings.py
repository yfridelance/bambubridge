"""
Settings API endpoints.
"""

import traceback

from flask import Blueprint

import spoolman_client
from config import (
    AUTO_SPEND,
    BASE_URL,
    PRINTER_ID,
    PRINTER_NAME,
    SPOOLMAN_BASE_URL,
    SPOOLMAN_API_URL,
    EXTERNAL_SPOOL_AMS_ID,
    EXTERNAL_SPOOL_ID,
)
from .common import json_success, json_error, READ_ONLY_MODE, ACTIVE_PRINTER_ID

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/settings", methods=["GET"])
def get_settings():
    """Get application settings."""
    try:
        return json_success({
            "printer_id": ACTIVE_PRINTER_ID,
            "printer_name": PRINTER_NAME,
            "base_url": BASE_URL,
            "spoolman_url": SPOOLMAN_BASE_URL,
            "spoolman_api_url": SPOOLMAN_API_URL,
            "auto_spend": AUTO_SPEND,
            "read_only_mode": READ_ONLY_MODE,
            "external_spool_ams_id": EXTERNAL_SPOOL_AMS_ID,
            "external_spool_id": EXTERNAL_SPOOL_ID,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("SETTINGS_FETCH_FAILED", f"Failed to fetch settings: {exc}", 500)


@settings_bp.route("/settings/spoolman", methods=["GET"])
def get_spoolman_settings():
    """Get settings from Spoolman."""
    try:
        settings = spoolman_client.fetchSettings()

        # Extract relevant settings
        currency = None
        extra_fields = {}

        if settings:
            for setting in settings:
                key = setting.get("key")
                value = setting.get("value")

                if key == "currency":
                    currency = value
                elif key and key.startswith("extra_field_"):
                    extra_fields[key] = value

        return json_success({
            "currency": currency,
            "extra_fields": extra_fields,
            "raw_settings": settings,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("SPOOLMAN_SETTINGS_FAILED", f"Failed to fetch Spoolman settings: {exc}", 500)
