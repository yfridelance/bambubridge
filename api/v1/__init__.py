"""
BambuBridge API v1

This module registers all API v1 blueprints.
"""

from flask import Blueprint

from .printers import printers_bp
from .ams import ams_bp
from .spools import spools_bp
from .prints import prints_bp
from .tags import tags_bp
from .settings import settings_bp
from .realtime import realtime_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")


def register_api_blueprints(app):
    """Register all API v1 blueprints with the Flask app."""
    app.register_blueprint(printers_bp, url_prefix="/api/v1")
    app.register_blueprint(ams_bp, url_prefix="/api/v1")
    app.register_blueprint(spools_bp, url_prefix="/api/v1")
    app.register_blueprint(prints_bp, url_prefix="/api/v1")
    app.register_blueprint(tags_bp, url_prefix="/api/v1")
    app.register_blueprint(settings_bp, url_prefix="/api/v1")
    app.register_blueprint(realtime_bp, url_prefix="/api/v1")
