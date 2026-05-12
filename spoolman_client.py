import json

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import SPOOLMAN_API_V1, SPOOL_SORTING
from logger import append_to_rotating_file, log

SPOOLMAN_LOG_FILE = "/home/app/logs/spoolman.log"
DEFAULT_TIMEOUT = 10  # seconds


def _build_session():
  # Retry only idempotent verbs. POST is intentionally absent to avoid
  # double-booking filament consumption on transient failures.
  retry = Retry(
    total=3,
    backoff_factor=0.3,
    status_forcelist=(500, 502, 503, 504, 429),
    allowed_methods=frozenset(["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
    raise_on_status=False,
  )
  adapter = HTTPAdapter(max_retries=retry)
  session = requests.Session()
  session.mount("http://", adapter)
  session.mount("https://", adapter)
  return session


_session = _build_session()


def _log_spoolman_change(action, spool_id=None, payload=None, status=None):
  parts = [action]

  if spool_id is not None:
    parts.append(f"spool_id={spool_id}")

  if status is not None:
    parts.append(f"status={status}")

  if payload is not None:
    try:
      payload_str = json.dumps(payload)
    except TypeError:
      payload_str = str(payload)
    parts.append(f"payload={payload_str}")

  try:
    append_to_rotating_file(SPOOLMAN_LOG_FILE, " | ".join(parts))
  except Exception:
    pass

def patchExtraTags(spool_id, old_extras, new_extras):
  for key, value in new_extras.items():
    old_extras[key] = value

  resp = _session.patch(f"{SPOOLMAN_API_V1}/spool/{spool_id}", json={
    "extra": old_extras
  }, timeout=DEFAULT_TIMEOUT)
  _log_spoolman_change(
    "patch_extra_tags",
    spool_id=spool_id,
    payload={"extra": old_extras},
    status=resp.status_code,
  )
  #print(resp.text)
  #print(resp.status_code)


def getSpoolById(spool_id):
  response = _session.get(f"{SPOOLMAN_API_V1}/spool/{spool_id}", timeout=DEFAULT_TIMEOUT)
  #print(response.status_code)
  #print(response.text)
  return response.json()


def fetchSpoolList():
  if SPOOL_SORTING:
    response = _session.get(f"{SPOOLMAN_API_V1}/spool?sort={SPOOL_SORTING}", timeout=DEFAULT_TIMEOUT)
  else:
    response = _session.get(f"{SPOOLMAN_API_V1}/spool", timeout=DEFAULT_TIMEOUT)

  #print(response.status_code)
  #print(response.text)
  return response.json()

def consumeSpool(spool_id, use_weight=None, use_length=None):
  if use_weight is None and use_length is None:
    raise ValueError("use_weight or use_length is required")

  payload = {}
  if use_weight is not None:
    payload["use_weight"] = use_weight
  if use_length is not None:
    payload["use_length"] = use_length

  log(f'Consuming {payload} from spool {spool_id}')

  response = _session.put(f"{SPOOLMAN_API_V1}/spool/{spool_id}/use", json=payload, timeout=DEFAULT_TIMEOUT)
  _log_spoolman_change(
    "consume_spool",
    spool_id=spool_id,
    payload=payload,
    status=response.status_code,
  )
  #print(response.status_code)
  #print(response.text)

def fetchSettings():
  response = _session.get(f"{SPOOLMAN_API_V1}/setting/", timeout=DEFAULT_TIMEOUT)
  #print(response.status_code)
  #print(response.text)

  # JSON in ein Python-Dictionary laden
  data = response.json()

  # Extrahiere die Werte aus den relevanten Feldern
  extra_fields_spool = json.loads(data["extra_fields_spool"]["value"])
  extra_fields_filament = json.loads(data["extra_fields_filament"]["value"])
  base_url = data["base_url"]["value"]
  currency = data["currency"]["value"]

  settings = {}
  settings["extra_fields_spool"] = extra_fields_spool 
  settings["extra_fields_filament"] = extra_fields_filament
  settings["base_url"] = base_url.replace('"', '')
  settings["currency"] = currency.replace('"', '')

  return settings
