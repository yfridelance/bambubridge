# TODO - BambuBridge

Dieses Dokument trackt offene Aufgaben und geplante Features.

---

## Offene Fragen & Design-Entscheidungen

### External Spool Verhalten
- **Datei:** `mqtt_bambulab.py` (Bereich der Tray-Mapping-Logik)
- **Frage:** Was passiert bei externem Spool? Sind `ams` und `tray_tar` gesetzt?
- **Status:** Dokumentation/Testing erforderlich

### Mismatch-Handling AMS/SpoolMan
- **Datei:** `spoolman_service.py`
- **Frage:** Was soll passieren bei Mismatch zwischen AMS-Daten und SpoolMan-Daten?
- **Status:** Design-Entscheidung offen

---

## Geplante Features

### AMS → SpoolMan Sync (deaktiviert)
- **Datei:** `mqtt_bambulab.py` (auskommentierter Block beim `tray`-Update)
- **Beschreibung:** Auskommentierter Code zum Synchronisieren von `remain`-Werten vom AMS zu SpoolMan
- **Hinweis:** "Doesn't work for AMS Lite" — möglicherweise für andere AMS-Modelle nutzbar
- **Status:** Feature deaktiviert, Evaluierung erforderlich

### sub_brand_code Aktivierung
- **Datei:** `app.py` (Filament-Mapping)
- **Beschreibung:** `sub_brand_code` testen und aktivieren
- **Status:** Testing gegen echte Hardware erforderlich

### QR-Code-Unterstützung für Spool-Labels
- **Status:** Konzept offen — Format (vCard, URL?), Drucker-Workflow

### API-Dokumentation (OpenAPI/Swagger)
- **Status:** Eigener PR — entweder manuelles `openapi.yaml` oder Migration auf `flask-smorest`

### Frontend
- [ ] SSE für Realtime-Updates weiter optimieren (Reconnect-Backoff, Resilience)
- [ ] Mobile PWA verbessern (Touch-Targets, Offline-Fallback)
- [ ] Frontend-Unit-Tests (Vitest) — aktuell 0 Tests in `frontend/src/`
- [ ] `eslint.config.js` für ESLint v9 nachziehen — `.eslintrc` wird nicht mehr akzeptiert
- [ ] Spool-Suche/Filter in Liste verbessern

---

## Technische Schulden

- [ ] Frontend-Bundle-Splitting — Hauptbundle ist >1.6 MB (siehe `vite build`-Warnung)

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
- [x] Frontend-Migration Feature-Parität erreicht (2026-05-09)
  - WriteTagPage mit Web NFC API
  - LinkBambuPage für Bambu-Tag-Verknüpfung
  - Issues-Seite mit Diagnose und Lösungsoptionen
- [x] Jinja2-Templates Cleanup (2026-05-09)
  - Legacy Routes entfernt
  - templates/ Verzeichnis gelöscht
  - Nur noch React SPA Frontend
- [x] External Spool Reset Handler (commit `abc2ae2`)
- [x] Issue-Typ-Erkennung im UI (Frontend `pages/issues/`)
- [x] Docker-Container-Größe reduzieren (multi-stage build)
- [x] Leeren TODO-Kommentar in `mqtt_bambulab.py` entfernt (commit `588f9e5`)
- [x] Screenshots in Dokumentation (`docs/`)
- [x] Homelab-Härtung (PR #18, 2026-05-12)
  - i18n `common.view`-Fix
  - Helm: Probes & Resources
  - SpoolMan-Retry/Backoff
  - Graceful MQTT-Shutdown auf SIGTERM/SIGINT
  - SQLite-Schema-Migrationen
- [x] Spool-Detailansicht implementiert (PR #18, 2026-05-12)
- [x] Print-Detailansicht implementiert (2026-05-12)

---

## Notizen

### Architektur-Entscheidungen
- SpoolMan bleibt die Datenquelle für Spool-Daten
- BambuBridge ist eine Integrationsschicht, kein Fork
- Frontend: React SPA mit Vite/PWA

### Abwärtskompatibilität
- OPENSPOOLMAN_* Environment-Variablen bleiben als Aliasse erhalten
- Mindestens 6 Monate Übergangszeit für Rebranding
