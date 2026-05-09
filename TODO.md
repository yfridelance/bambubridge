# TODO - BambuBridge (ehemals OpenSpoolMan)

Dieses Dokument trackt offene Aufgaben und geplante Features.

---

## Offene Fragen & Design-Entscheidungen

### External Spool Verhalten
- **Datei:** `mqtt_bambulab.py:301`
- **Frage:** Was passiert bei externem Spool? Sind `ams` und `tray_tar` gesetzt?
- **Status:** Dokumentation/Testing erforderlich

### Mismatch-Handling AMS/SpoolMan
- **Datei:** `spoolman_service.py:415`
- **Frage:** Was soll passieren bei Mismatch zwischen AMS-Daten und SpoolMan-Daten?
- **Status:** Design-Entscheidung offen

### Leerer TODO
- **Datei:** `mqtt_bambulab.py:349`
- **Aktion:** Entfernen oder mit Kontext füllen

---

## Geplante Features

### AMS → SpoolMan Sync (deaktiviert)
- **Datei:** `mqtt_bambulab.py:494-497`
- **Beschreibung:** Auskommentierter Code zum Synchronisieren von `remain`-Werten vom AMS zu SpoolMan
- **Hinweis:** "Doesn't work for AMS Lite" - möglicherweise für andere AMS-Modelle nutzbar
- **Status:** Feature deaktiviert, Evaluierung erforderlich

### Issue-Typ-Erkennung im UI
- **Datei:** `app.py:162`
- **Beschreibung:** Verschiedene Issue-Typen erkennen und anzeigen:
  - Neuer Bambu Lab Spool (nicht in SpoolMan)
  - Tag-Mismatch
  - Material/Typ-Mismatch
  - Farb-Mismatch
- **Status:** Nicht implementiert

### External Spool Reset Handler
- **Datei:** `app.py:299, 452`
- **Beschreibung:** Korrektes Handling wenn externe Spool-Info via Bambu Lab Interface zurückgesetzt wird
- **Status:** Nicht implementiert

### sub_brand_code Aktivierung
- **Datei:** `app.py:432`
- **Beschreibung:** `sub_brand_code` testen und aktivieren
- **Status:** Testing erforderlich

---

## Frontend-Migration (React)

### Feature-Parität erreichen
- [x] Dashboard mit AMS-Übersicht
- [x] Spool-Liste mit Filterung
- [x] Print-Historie
- [x] Settings-Seite
- [ ] NFC-Tag-Management (teilweise)
- [ ] Fill-Tray Workflow
- [ ] Issue-Diagnostik

### Nach Feature-Parität
- [ ] Jinja2-Templates entfernen
- [ ] SSE für Realtime-Updates optimieren
- [ ] Mobile PWA verbessern

---

## Rebranding zu BambuBridge

### Dateien umbenennen/aktualisieren
- [x] `README.md` - Hauptdokumentation
- [x] `agents.md` - Entwickler-Leitfaden
- [x] `config.py` - Environment-Variablen (BAMBUBRIDGE_* + OPENSPOOLMAN_* Aliasse)
- [x] `helm/openspoolman/` → `helm/bambubridge/`
- [x] `docker-compose.yaml` + `compose.yaml`
- [x] `package.json` (Root + Frontend)
- [x] `frontend/src/App.tsx` - Title/Branding
- [x] `frontend/index.html` - Title/PWA
- [x] `frontend/vite.config.ts` - PWA Manifest
- [x] `templates/base.html` - Legacy-UI GitHub Link
- [x] `.github/workflows/*.yml`
- [x] `docs/api.md`
- [x] `api/v1/__init__.py`

### Assets aktualisieren
- [ ] Logo erstellen/aktualisieren
- [ ] Favicon
- [ ] Screenshots in Dokumentation

---

## Technische Schulden

- [ ] Docker-Container-Größe reduzieren
- [ ] QR-Code-Unterstützung für Spool-Labels
- [ ] Spool-Suche/Filter in Liste verbessern
- [ ] API-Dokumentation (OpenAPI/Swagger)

---

## Langfristig

- [ ] Multi-Printer-Unterstützung
- [ ] Video-Showcase erstellen
- [ ] Cloud-Service für NFC-Tag-Redirect (optional)

---

## Erledigte Aufgaben

- [x] TODO.md erstellen (2025-05-09)
- [x] agents.md mit Frontend-Sektionen erweitern (2025-05-09)
- [x] Rebranding zu BambuBridge durchgeführt (2025-05-09)
  - config.py mit BAMBUBRIDGE_* Aliassen
  - Alle Dokumentation aktualisiert
  - Frontend-Branding (Title, PWA)
  - Docker/Helm umbenannt
  - GitHub Workflows aktualisiert

---

## Notizen

### Architektur-Entscheidungen
- SpoolMan bleibt die Datenquelle für Spool-Daten
- BambuBridge ist eine Integrationsschicht, kein Fork
- Dual-Frontend während Migration: Jinja2 (Legacy) + React (Neu)

### Abwärtskompatibilität
- OPENSPOOLMAN_* Environment-Variablen bleiben als Aliasse erhalten
- Mindestens 6 Monate Übergangszeit für Rebranding
