import signal
import sys
from flask import Flask, send_from_directory
from pathlib import Path
from flask_cors import CORS

from config import LIVE_READONLY
from filament import generate_filament_brand_code, generate_filament_temperatures
from messages import AMS_FILAMENT_SETTING
import mqtt_bambulab
import test_data
from spoolman_service import normalize_color_hex
from logger import log

_TEST_PATCH_CONTEXT = None
if test_data.TEST_MODE_FLAG:
  _TEST_PATCH_CONTEXT = test_data.activate_test_data_patches()

USE_TEST_DATA = test_data.test_data_active()
READ_ONLY_MODE = (not USE_TEST_DATA) and LIVE_READONLY

if not USE_TEST_DATA:
  mqtt_bambulab.init_mqtt()

import ha_mqtt
ha_mqtt.init()

app = Flask(__name__)

# React frontend directory
FRONTEND_DIR = Path(__file__).resolve().parent / "frontend" / "dist"



def _select_spool_color_hex(spool_data):
  filament = spool_data.get("filament", {})
  multi = filament.get("multi_color_hexes")
  candidate = ""

  if multi:
    if isinstance(multi, (list, tuple)) and multi:
      candidate = multi[0]
    elif isinstance(multi, str):
      candidate = multi.split(",")[0]

  if not candidate:
    candidate = filament.get("color_hex") or ""

  return normalize_color_hex(candidate)

def setActiveSpool(ams_id, tray_id, spool_data):
  if USE_TEST_DATA or READ_ONLY_MODE:
    return None

  if not mqtt_bambulab.isMqttClientConnected():
    return None
  
  ams_message = AMS_FILAMENT_SETTING
  ams_message["print"]["sequence_id"] = 0
  ams_message["print"]["ams_id"] = int(ams_id)
  ams_message["print"]["tray_id"] = int(tray_id)
  color_hex = _select_spool_color_hex(spool_data)
  if color_hex:
    ams_message["print"]["tray_color"] = color_hex.upper() + "FF"
  else:
    ams_message["print"]["tray_color"] = ""
      
  filament_extra = spool_data["filament"].get("extra") or {}
  if "nozzle_temperature" in filament_extra:
    nozzle_temperature_range = filament_extra["nozzle_temperature"].strip("[]").split(",")
    ams_message["print"]["nozzle_temp_min"] = int(nozzle_temperature_range[0])
    ams_message["print"]["nozzle_temp_max"] = int(nozzle_temperature_range[1])
  else:
    nozzle_temperature_range_obj = generate_filament_temperatures(spool_data["filament"]["material"],
                                                                  spool_data["filament"]["vendor"]["name"])
    ams_message["print"]["nozzle_temp_min"] = int(nozzle_temperature_range_obj["filament_min_temp"])
    ams_message["print"]["nozzle_temp_max"] = int(nozzle_temperature_range_obj["filament_max_temp"])

  ams_message["print"]["tray_type"] = spool_data["filament"]["material"]

  filament_brand_code = {}
  filament_brand_code["brand_code"] = filament_extra.get("filament_id", "").strip('"')
  filament_brand_code["sub_brand_code"] = ""

  if filament_brand_code["brand_code"] == "":
    filament_brand_code = generate_filament_brand_code(spool_data["filament"]["material"],
                                                      spool_data["filament"]["vendor"]["name"],
                                                      filament_extra.get("type", ""))
    
  ams_message["print"]["tray_info_idx"] = filament_brand_code["brand_code"]

  # TODO: test sub_brand_code
  # ams_message["print"]["tray_sub_brands"] = filament_brand_code["sub_brand_code"]
  ams_message["print"]["tray_sub_brands"] = ""

  log(ams_message)
  mqtt_bambulab.publish(mqtt_bambulab.getMqttClient(), ams_message)

@app.route("/")
def home():
  return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/assets/<path:filename>")
def frontend_assets(filename):
  return send_from_directory(FRONTEND_DIR / "assets", filename)


@app.route("/logo.webp")
def serve_logo():
  return send_from_directory(FRONTEND_DIR, "logo.webp")


@app.route("/logo_dark.webp")
def serve_logo_dark():
  return send_from_directory(FRONTEND_DIR, "logo_dark.webp")


@app.route("/favicon.ico")
def serve_favicon():
  return send_from_directory(FRONTEND_DIR, "favicon.ico")


@app.route("/manifest.webmanifest")
def serve_manifest():
  return send_from_directory(FRONTEND_DIR, "manifest.webmanifest")


@app.route("/registerSW.js")
def serve_register_sw():
  return send_from_directory(FRONTEND_DIR, "registerSW.js")


@app.route("/sw.js")
def serve_sw():
  return send_from_directory(FRONTEND_DIR, "sw.js")

@app.route('/health', methods=['GET'])
def health():
  return "OK", 200


# Register legacy REST API blueprint (for backwards compatibility)
from api_routes import api_bp
app.register_blueprint(api_bp)

# Register new modular API v1 blueprints
from api.v1 import register_api_blueprints
register_api_blueprints(app)

# Enable CORS for API endpoints
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Start SSE state monitor for real-time updates
from api.v1.realtime import start_state_monitor, stop_state_monitor
start_state_monitor(interval=2.0)


def _graceful_shutdown(signum, _frame):
  log(f"🛑 received signal {signum}, shutting down gracefully")
  try:
    stop_state_monitor()
  except Exception as exc:
    log(f"⚠️ stop_state_monitor failed: {exc}")
  try:
    mqtt_bambulab.cleanup()
  except Exception as exc:
    log(f"⚠️ mqtt cleanup failed: {exc}")
  try:
    ha_mqtt.cleanup()
  except Exception as exc:
    log(f"⚠️ ha_mqtt cleanup failed: {exc}")
  sys.exit(0)


for _sig in (signal.SIGTERM, signal.SIGINT):
  try:
    signal.signal(_sig, _graceful_shutdown)
  except ValueError:
    # signal.signal only works in the main thread; under Gunicorn workers
    # the master forwards SIGTERM, so this path is exercised on shutdown.
    pass


# Serve React frontend static files and SPA catch-all
@app.route("/<path:path>")
def serve_frontend(path):
  # Try to serve the file from frontend/dist
  file_path = FRONTEND_DIR / path
  if file_path.is_file():
    return send_from_directory(FRONTEND_DIR, path)
  # For SPA routing, return index.html for non-file paths
  return send_from_directory(FRONTEND_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, threaded=True)
