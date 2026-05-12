import builtins
from functools import partial
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from config.env when present so live runs have access
# to printer and Spoolman credentials without manual exports.
load_dotenv(Path(__file__).resolve().parent / "config.env")
EXTERNAL_SPOOL_AMS_ID = 255 # don't change
EXTERNAL_SPOOL_ID = 254 #  don't change

builtins.print = partial(builtins.print, flush=True)


def _env(name: str, legacy_name: str | None = None) -> str | None:
    """Get environment variable with optional legacy alias support."""
    value = os.getenv(name)
    if value is None and legacy_name:
        value = os.getenv(legacy_name)
    return value


def _env_to_bool(name: str, default: bool = False, legacy_name: str | None = None) -> bool:
    value = _env(name, legacy_name)
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes", "on")


def _env_to_int(name: str, default: int, legacy_name: str | None = None) -> int:
    value = _env(name, legacy_name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


# Where will this app be accessible
# Supports both BAMBUBRIDGE_* (new) and OPENSPOOLMAN_* (legacy) prefixes
BASE_URL = _env("BAMBUBRIDGE_BASE_URL", "OPENSPOOLMAN_BASE_URL")
PRINTER_ID = (os.getenv("PRINTER_ID") or "").upper()  # Printer serial number - Run init_bambulab.py
PRINTER_CODE = os.getenv("PRINTER_ACCESS_CODE")  # Printer access code - Run init_bambulab.py
PRINTER_IP = os.getenv("PRINTER_IP")  # Printer local IP address - Check wireless on printer
PRINTER_NAME = os.getenv("PRINTER_NAME")  # Printer name - Check wireless on printer
SPOOLMAN_BASE_URL = os.getenv("SPOOLMAN_BASE_URL") or os.getenv("SPOOLMAN_UI_URL")
SPOOLMAN_API_URL = os.getenv("SPOOLMAN_API_URL") or SPOOLMAN_BASE_URL
SPOOLMAN_API_V1 = f"{SPOOLMAN_API_URL}/api/v1"
AUTO_SPEND = _env_to_bool("AUTO_SPEND", False)
TRACK_LAYER_USAGE = _env_to_bool("TRACK_LAYER_USAGE", False)
SPOOL_SORTING = os.getenv(
    "SPOOL_SORTING", "filament.material:asc,filament.vendor.name:asc,filament.name:asc"
)
DISABLE_MISMATCH_WARNING = _env_to_bool("DISABLE_MISMATCH_WARNING", False)
CLEAR_ASSIGNMENT_WHEN_EMPTY = _env_to_bool("CLEAR_ASSIGNMENT_WHEN_EMPTY", False)
COLOR_DISTANCE_TOLERANCE = _env_to_int("COLOR_DISTANCE_TOLERANCE", 40)
LOG_DIR = os.getenv("LOG_DIR", os.path.join(Path(__file__).resolve().parent, "logs"))

# Runtime mode flags (supports both BAMBUBRIDGE_* and OPENSPOOLMAN_* prefixes)
LIVE_READONLY = _env("BAMBUBRIDGE_LIVE_READONLY", "OPENSPOOLMAN_LIVE_READONLY") == "1"
PRINT_HISTORY_DB = _env("BAMBUBRIDGE_PRINT_HISTORY_DB", "OPENSPOOLMAN_PRINT_HISTORY_DB")

# Test mode flags (primarily for development)
TEST_DATA_ENABLED = _env("BAMBUBRIDGE_TEST_DATA", "OPENSPOOLMAN_TEST_DATA") == "1"
TEST_SNAPSHOT_PATH = _env("BAMBUBRIDGE_TEST_SNAPSHOT", "OPENSPOOLMAN_TEST_SNAPSHOT")

REPO_URL = _env("BAMBUBRIDGE_REPO_URL") or "https://github.com/yfridelance/bambubridge"
