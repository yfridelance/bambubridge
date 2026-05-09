"""
Real-time events API using Server-Sent Events (SSE).
"""

import json
import queue
import threading
import time
import traceback
from typing import Any, Dict, List

from flask import Blueprint, Response

import mqtt_bambulab
from config import EXTERNAL_SPOOL_AMS_ID

realtime_bp = Blueprint("realtime", __name__)

# Global event subscribers
_event_subscribers: List[queue.Queue] = []
_subscribers_lock = threading.Lock()

# Last known state for change detection
_last_ams_state: Dict[str, Any] = {}
_state_lock = threading.Lock()


def broadcast_event(event_type: str, data: dict):
    """Broadcast an event to all connected SSE clients."""
    event = json.dumps({"type": event_type, "data": data, "timestamp": time.time()})

    with _subscribers_lock:
        dead_subscribers = []
        for q in _event_subscribers:
            try:
                q.put_nowait(event)
            except queue.Full:
                dead_subscribers.append(q)

        # Clean up dead subscribers
        for q in dead_subscribers:
            _event_subscribers.remove(q)


def _build_state_hash(config: dict) -> str:
    """Build a hashable string representation of AMS state.

    Avoids json.dumps which fails with mixed int/str keys in models_by_id.
    """
    parts = []

    # Hash AMS units state
    for ams in config.get("ams", []):
        ams_id = ams.get("id", "?")
        humidity = ams.get("humidity", "?")
        temp = ams.get("temp", "?")
        parts.append(f"ams:{ams_id}:h{humidity}:t{temp}")

        for tray in ams.get("tray", []):
            tray_id = tray.get("id", "?")
            color = tray.get("tray_color", "")
            remain = tray.get("remain", "?")
            tray_type = tray.get("tray_type", "")
            tag_uid = tray.get("tag_uid", "")
            parts.append(f"tray:{ams_id}:{tray_id}:{color}:{remain}:{tray_type}:{tag_uid}")

    # Hash external tray state
    vt_tray = config.get("vt_tray", {})
    if vt_tray:
        parts.append(f"vt:{vt_tray.get('tray_color', '')}:{vt_tray.get('remain', '')}:{vt_tray.get('tag_uid', '')}")

    return "|".join(parts)


def _check_for_changes():
    """Check for AMS state changes and broadcast events."""
    global _last_ams_state

    try:
        config = mqtt_bambulab.getLastAMSConfig() or {}
        current_state = _build_state_hash(config)

        with _state_lock:
            if current_state != _last_ams_state.get("hash"):
                _last_ams_state["hash"] = current_state

                # Broadcast AMS update
                broadcast_event("ams_update", {
                    "ams": config.get("ams", []),
                    "vt_tray": config.get("vt_tray"),
                })

        # Check printer connection status
        connected = mqtt_bambulab.isMqttClientConnected()
        last_connected = _last_ams_state.get("connected")

        if connected != last_connected:
            _last_ams_state["connected"] = connected
            broadcast_event("printer_status", {
                "online": connected,
            })

    except Exception:
        traceback.print_exc()


def _event_generator(client_queue: queue.Queue):
    """Generate SSE events for a single client."""
    try:
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': time.time()})}\n\n"

        while True:
            try:
                # Wait for events with timeout for keepalive
                event = client_queue.get(timeout=15)
                yield f"data: {event}\n\n"
            except queue.Empty:
                # Send keepalive comment
                yield ": keepalive\n\n"
    except GeneratorExit:
        pass
    finally:
        with _subscribers_lock:
            if client_queue in _event_subscribers:
                _event_subscribers.remove(client_queue)


@realtime_bp.route("/events")
def sse_stream():
    """SSE endpoint for real-time updates."""
    client_queue = queue.Queue(maxsize=100)

    with _subscribers_lock:
        _event_subscribers.append(client_queue)

    return Response(
        _event_generator(client_queue),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@realtime_bp.route("/events/test", methods=["POST"])
def test_event():
    """Send a test event to all connected clients (for debugging)."""
    broadcast_event("test", {"message": "This is a test event"})
    return {"success": True, "message": "Test event broadcast"}


# Background thread to periodically check for changes
_monitor_thread = None
_monitor_running = False


def start_state_monitor(interval: float = 2.0):
    """Start the background thread that monitors for state changes."""
    global _monitor_thread, _monitor_running

    if _monitor_thread is not None and _monitor_thread.is_alive():
        return

    _monitor_running = True

    def monitor_loop():
        while _monitor_running:
            _check_for_changes()
            time.sleep(interval)

    _monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    _monitor_thread.start()


def stop_state_monitor():
    """Stop the background state monitor."""
    global _monitor_running
    _monitor_running = False


# Auto-start monitor when module is loaded (will be started when Flask app runs)
# The actual start is deferred to avoid issues during import
