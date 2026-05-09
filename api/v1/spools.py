"""
Spool API endpoints.
"""

import traceback

from flask import Blueprint, request

import spoolman_client
import spoolman_service
from .common import json_success, json_error, serialize_spool, clean_json_value

spools_bp = Blueprint("spools", __name__)


@spools_bp.route("/spools", methods=["GET"])
def list_spools():
    """List all spools with optional filtering."""
    try:
        # Get query parameters
        material = request.args.get("material")
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", type=int, default=0)

        spools = spoolman_service.fetchSpools()

        # Filter by material if specified
        if material:
            spools = [s for s in spools if (s.get("filament", {}) or {}).get("material") == material]

        total = len(spools)

        # Apply pagination
        if offset:
            spools = spools[offset:]
        if limit:
            spools = spools[:limit]

        return json_success({
            "spools": [serialize_spool(spool) for spool in spools],
            "total": total,
            "offset": offset,
            "limit": limit,
        })
    except Exception as exc:
        traceback.print_exc()
        return json_error("SPOOL_FETCH_FAILED", f"Failed to fetch spools: {exc}", 500)


@spools_bp.route("/spools/<int:spool_id>", methods=["GET"])
def get_spool(spool_id: int):
    """Get a specific spool by ID."""
    try:
        spool = spoolman_client.getSpoolById(spool_id)
        if not spool or spool.get("id") is None:
            return json_error("SPOOL_NOT_FOUND", f"Spool '{spool_id}' not found", 404)

        return json_success(serialize_spool(spool))
    except Exception as exc:
        traceback.print_exc()
        return json_error("SPOOL_FETCH_FAILED", f"Failed to fetch spool: {exc}", 500)


@spools_bp.route("/spools/by-tag/<tag_id>", methods=["GET"])
def get_spool_by_tag(tag_id: str):
    """Get a spool by its NFC tag ID."""
    try:
        spools = spoolman_service.fetchSpools()

        for spool in spools:
            extra = spool.get("extra", {}) or {}
            tag = clean_json_value(extra.get("tag"))

            if tag and str(tag) == tag_id:
                return json_success(serialize_spool(spool))

        return json_error("SPOOL_NOT_FOUND", f"No spool found with tag '{tag_id}'", 404)
    except Exception as exc:
        traceback.print_exc()
        return json_error("SPOOL_FETCH_FAILED", f"Failed to search spool by tag: {exc}", 500)


@spools_bp.route("/spools/<int:spool_id>/consume", methods=["POST"])
def consume_spool(spool_id: int):
    """Record filament consumption for a spool."""
    try:
        body = request.get_json(silent=True) or {}
        weight_g = body.get("weight_g")
        length_mm = body.get("length_mm")

        if weight_g is None and length_mm is None:
            return json_error("INVALID_REQUEST", "Either 'weight_g' or 'length_mm' is required.", 400)

        # Use Spoolman's consume endpoint
        result = spoolman_client.consumeSpool(spool_id, weight_g, length_mm)

        if not result:
            return json_error("CONSUME_FAILED", "Failed to record consumption", 500)

        # Fetch updated spool data
        spool = spoolman_client.getSpoolById(spool_id)
        if spool:
            return json_success(serialize_spool(spool))

        return json_success({"consumed": True, "spool_id": spool_id})
    except Exception as exc:
        traceback.print_exc()
        return json_error("CONSUME_FAILED", f"Failed to record consumption: {exc}", 500)


@spools_bp.route("/materials", methods=["GET"])
def list_materials():
    """Get a list of unique materials from all spools."""
    try:
        spools = spoolman_service.fetchSpools()

        materials = set()
        for spool in spools:
            filament = spool.get("filament", {}) or {}
            material = filament.get("material")
            if material:
                materials.add(material)

        return json_success(sorted(list(materials)))
    except Exception as exc:
        traceback.print_exc()
        return json_error("MATERIALS_FETCH_FAILED", f"Failed to fetch materials: {exc}", 500)
