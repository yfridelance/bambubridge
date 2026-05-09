# agents.md — BambuBridge (formerly OpenSpoolMan)

This document is for AI coding agents (and humans) making changes to **BambuBridge**.
Follow it as the default "operating manual" when creating PRs.

> **Note:** This project is being rebranded from "OpenSpoolMan" to "BambuBridge".
> Environment variables with `OPENSPOOLMAN_*` prefix remain supported as aliases.

## 1) Project intent (do not drift)
BambuBridge is a **Bambu Lab Filament Bridge** that connects:
- **SpoolMan** (filament database and inventory management)
- **Bambu Lab printers** (via MQTT/LAN)
- **AMS units** (automatic filament matching and tracking)

Key clarifications:
- This is an **integration layer**, NOT a SpoolMan fork
- SpoolMan remains the source of truth for spool data
- BambuBridge adds Bambu Lab-specific features on top

Core principles:
- Keep all operations **local-first** (LAN where possible).
- NFC is **optional**; the web UI must remain fully usable without NFC.
- The system is an "adapter + UI" on top of SpoolMan, not a replacement.

If a proposed change alters any of these fundamentals, stop and propose it as a design discussion first.

---

## 2) Non-negotiables (hard rules)
### Security & privacy
- Never commit secrets (printer access codes, API keys, cookies, tokens, personal URLs).
- Do not log secrets. Mask them if you must log configuration.
- Treat everything coming from MQTT / HTTP as untrusted input.

### Backwards compatibility
- Preserve existing env vars and default behaviors unless explicitly versioned.
- UI behavior must remain functional for:
  - No NFC usage
  - SpoolMan available/unavailable (graceful handling)
  - AUTO_SPEND disabled

### Reliability
- Network calls must have **timeouts**, error handling, and retry/backoff where appropriate.
- Never introduce busy loops. Prefer event-driven updates or bounded polling.

---

## 3) Repository map (high-level)

### Backend (Python/Flask)
- `app.py` / `wsgi.py`: Application entry points
- `api/v1/`: **Modular REST API blueprints**
  - `ams.py`: AMS tray management
  - `spools.py`: Spool CRUD operations
  - `prints.py`: Print history
  - `tags.py`: NFC tag management
  - `realtime.py`: SSE for live updates
  - `printers.py`: Printer info
  - `settings.py`: System settings
- `api_routes.py`: **Legacy** - kept for backwards compatibility
- `mqtt_bambulab.py`: Bambu printer connectivity (LAN / MQTT)
- `spoolman_client.py`, `spoolman_service.py`: SpoolMan integration layer
- `filament.py`, `filament_usage_tracker.py`, `print_history.py`: domain logic

### Frontend (React 19 + TypeScript)
- `frontend/`: **New SPA application**
  - `src/pages/`: Page components (Home, Spools, Prints, Tags, Settings)
  - `src/components/`: Reusable UI components
  - `src/providers/`: Data provider (REST) and live provider (SSE)
  - `src/contexts/`: React contexts (Theme)
  - `src/locales/`: I18n translations (en/de)
  - `src/types/`: TypeScript type definitions
- Uses Refine framework with Ant Design
- PWA-capable (offline support)

### Legacy Frontend (Jinja2)
- `templates/`: Server-rendered HTML templates (**deprecation planned**)
- `static/`: Static assets for legacy UI

### Infrastructure
- `scripts/`: helper scripts (e.g., initialization / tooling)
- `data/`: runtime artifacts (DBs, mismatch logs)
- `tests/`: Python tests
- `e2e/`, `playwright.config.js`: end-to-end UI tests
- `docker-compose.yaml` / `compose.yaml` / `Dockerfile`: containerization
- `helm/openspoolman`: Helm chart

---

## 4) How to run locally (known-good paths)

### 4.1 Local Python run (development)
1. Configure environment (see §5). Create `config.env` from `config.env.template` or export env vars.
2. Start the server:
   - `python wsgi.py`

Notes:
- Default listen port is `8001` (to avoid clashing with SpoolMan).
- Depending on SSL mode and mapping you may also access `https://<host>:8443`.

### 4.2 Docker (deployment / reproducible dev)
- Configure env vars, then:
  - `docker compose up -d`

Use `docker compose port openspoolman 8001` to see mapped host port if needed.

### 4.3 Kubernetes (Helm)
- Use the bundled chart:
  - `helm dependency update helm/openspoolman`
  - `helm upgrade --install openspoolman helm/openspoolman -f values.yaml --namespace openspoolman --create-namespace`
- Validate:
  - `kubectl get pods -n openspoolman`

---

## 5) Configuration contract (environment variables)
### Required / core
- `OPENSPOOLMAN_BASE_URL`
  - HTTPS URL where OpenSpoolMan is reachable
  - **No trailing slash**
  - Required for NFC writes
- `PRINTER_ID`
  - Printer settings → Setting → Device → Printer SN
- `PRINTER_ACCESS_CODE`
  - Setting → LAN Only Mode → Access Code
  - (LAN Only Mode toggle may stay off)
- `PRINTER_IP`
  - Setting → LAN Only Mode → IP Address
- `SPOOLMAN_BASE_URL`
  - URL of SpoolMan without trailing slash

### Feature toggles
- `AUTO_SPEND`
  - `True` enables legacy slicer-estimate tracking.
- `TRACK_LAYER_USAGE`
  - `True` switches to per-layer tracking/consumption **only if** `AUTO_SPEND=True`.
  - If `AUTO_SPEND=False`, tracking remains disabled regardless of `TRACK_LAYER_USAGE`.
- `DISABLE_MISMATCH_WARNING`
  - `True` hides mismatch warnings in the UI (still detected and logged).
- `CLEAR_ASSIGNMENT_WHEN_EMPTY`
  - `True` clears SpoolMan assignment and resets AMS tray when the printer reports an empty slot.

### Data sources
- Print history DB default: `data/3d_printer_logs.db`
- Override via: `OPENSPOOLMAN_PRINT_HISTORY_DB`
- Mismatch log output: `logs/filament_mismatch.json` (now includes the detected color distance when a color mismatch occurs)

### Important operational note
If you change `OPENSPOOLMAN_BASE_URL`, NFC tags must be reconfigured.

---

## 6) SpoolMan integration contract (must remain stable)
### SpoolMan label workflow
- SpoolMan can print QR-code labels. When using them with OpenSpoolMan:
  - Set SpoolMan’s base URL to OpenSpoolMan **before** generating labels
  - Otherwise labels point back to SpoolMan, not OpenSpoolMan

### Required extra fields in SpoolMan
Agents must not “simplify away” these fields without an explicit migration plan.

Add these extra fields in SpoolMan:
- Filaments:
  - `type` (Choice)
  - `nozzle_temperature` (Integer Range)
  - `filament_id` (Text)
- Spools:
  - `tag` (Text)
  - `active_tray` (Text)

(Exact choice values are defined in the README; keep behavior compatible with existing installations.)

### Windows note (Bambu Studio)
Filament IDs can be sourced from Bambu Studio’s filament base directory (see README). Do not hardcode user paths; keep it documentation-only.

---

## 7) Filament matching rules (do not regress)
OpenSpoolMan matches SpoolMan spools to AMS tray metadata:
- Spool `material` must match AMS `tray_type` (main type).
- For Bambu filaments, AMS reports a sub-brand; it must match the spool’s sub-brand.
  - Model this either as:
    - `material = full Bambu material` (e.g., `PLA Wood`) and `type` empty, OR
    - `material = base` (e.g., `PLA`) and `type = add-on` (e.g., `Wood`)
- Parenthesized notes in `material` are ignored during matching (e.g., `PLA CF (recycled)`).

If matching fails:
- Prefer improving diagnostics and tooling.
- The UI warning can be hidden with `DISABLE_MISMATCH_WARNING=true` but mismatches must still be logged.

---

## 8) Change workflow for agents (how to work in this repo)

### 8.1 Before coding
1. Read `README.md` sections: installation, environment configuration, matching rules, AUTO_SPEND notes.
2. Identify the minimal module(s) involved:
   - Printer connectivity: `mqtt_bambulab.py`
   - SpoolMan calls: `spoolman_client.py` / `spoolman_service.py`
   - Domain logic: `filament*.py`, `print_history.py`
   - UI: `templates/`, `static/`
3. Decide whether you need:
   - Python tests (`tests/`)
   - E2E tests (`e2e/` via Playwright)

### 8.2 Coding standards (practical)
- Keep functions small and testable.
- Prefer explicit types where they improve clarity (especially for payloads).
- Validate external payloads defensively (missing keys, type mismatches).
- When reading runtime state (e.g., `PRINTER_STATE`, MQTT payloads), prefer accessing the original object via `.get(...)` rather than copying into temporary locals unless the value needs transformation; this keeps guard logic close to the source and avoids stale snapshots.
- Avoid introducing new dependencies without a strong justification.
- Keep logging structured and helpful; never leak secrets.

### 8.3 Testing expectations
Minimum expectations before PR:
- If logic changes: update/add Python tests under `tests/`.
- If UI changes: ensure at least a smoke check and, when possible, run the E2E suite.
- If env/config changes: update README + `config.env.template` accordingly.

Notes:
- Python tests are configured via `pytest.ini`.
- E2E is set up via `playwright.config.js` and `package.json`. Use the existing npm scripts rather than inventing new ones unless necessary.

### 8.4 PR checklist (agents must include in PR description)
- [ ] Scope is minimal; no unrelated refactors
- [ ] No secrets or sensitive values introduced
- [ ] Errors handled (timeouts, retries/backoff if applicable)
- [ ] Tests added/updated (or justification if not)
- [ ] README/config updated if behavior or configuration changed
- [ ] Docker/Helm impact considered (ports, env vars, volumes)
- [ ] Filament matching rules preserved (or explicitly enhanced with tests)

---

## 9) Deployment artifacts (keep in sync)
If you touch runtime behavior, check:
- Docker:
  - `Dockerfile`
  - `docker-compose.yaml` / `compose.yaml` env var passing and volumes
- Helm:
  - `helm/openspoolman` chart values and templates
  - Ensure env vars and defaults align with README

Do not silently change exposed ports or default bindings without updating:
- README
- Compose
- Helm chart

---

## 10) Troubleshooting guidance (for maintainers and future agents)
When debugging:
- Confirm `SPOOLMAN_BASE_URL` and `OPENSPOOLMAN_BASE_URL` have **no trailing slash**.
- Confirm printer values:
  - `PRINTER_IP` reachable from the OpenSpoolMan host/container
  - `PRINTER_ACCESS_CODE` correct
- Inspect mismatch log:
  - `logs/filament_mismatch.json`
- Confirm print history DB path:
  - `data/3d_printer_logs.db` or `OPENSPOOLMAN_PRINT_HISTORY_DB`

For AUTO_SPEND / tracking:
- Ensure `AUTO_SPEND=True` before expecting any tracking.
- `TRACK_LAYER_USAGE=True` only matters when `AUTO_SPEND=True`.

---

## 11) What not to do (common failure modes)
- Do not hardcode user-specific paths, hostnames, or ports.
- Do not break “no NFC” operation.
- Do not require cloud access for core workflows.
- Do not change matching semantics without tests and clear migration notes.
- Do not broaden logs to include access codes or private URLs.

---

## 12) AMS tray assignment behavior
- Cloud prints already contain `ams_mapping` in their `project_file` payload, so OpenSpoolMan can map every logical filament to a tray immediately.
- Local prints (LAN mode) do not ship `ams_mapping` upfront, so we delay applying AMS mappings until the printer reports a concrete `tray_tar` (typically during stage 4 / filament change). That’s why the MQTT log often shows `tray_tar=255` for seconds and only flips to the real tray once the tray itself is loaded.

---

## 13) When you are unsure
Prefer these options, in order:
1. Add instrumentation and tests rather than guessing.
2. Make the smallest change that improves correctness.
3. Document assumptions in the PR description and in code comments where necessary.

---

## 14) Frontend development guidelines

### Technology stack
- **React 19** + TypeScript 5.6
- **Refine framework** (@refinedev/core 5.x, @refinedev/antd 6.x)
- **Ant Design 5.x** - UI component library
- **React Router 7** - Routing
- **Vite 6** - Build tool and dev server
- **i18next** - Internationalization (en/de)
- **Workbox** - PWA/Service Worker

### Development commands
```bash
cd frontend
npm install
npm run dev      # Start dev server (proxies /api to backend)
npm run build    # Production build
npm run preview  # Preview production build
```

### Conventions
- Use functional components with hooks
- Prefer Refine's data provider patterns for API calls
- Follow Ant Design's design guidelines
- Keep translations in `frontend/src/locales/`
- Use TypeScript strict mode

### API integration
- Use the `/api/v1/` endpoints (see `api/v1/` blueprints)
- Real-time updates via SSE (`/api/v1/realtime/events`)
- Data provider: `frontend/src/providers/dataProvider.ts`
- Live provider: `frontend/src/providers/liveProvider.ts`

### State management
- Use Refine's built-in state management where possible
- React Context for global state (Theme)
- Avoid Redux unless absolutely necessary

---

## 15) Dual-frontend strategy (migration notes)

### Current state
The project has two frontends:
1. **Jinja2 templates** (`templates/`): Legacy, server-rendered
2. **React SPA** (`frontend/`): New, feature-rich

### Migration guidelines
- **New features**: Implement in React frontend first
- **Bug fixes**: Apply to both frontends if applicable
- **Deprecation**: Jinja2 templates will be removed after React frontend reaches feature parity

### Feature parity checklist
- [x] Dashboard with AMS overview
- [x] Spool list with filtering
- [x] Print history
- [x] Settings page
- [ ] NFC tag management (partial)
- [ ] Fill tray workflow
- [ ] Issue diagnostics

---

## 16) API versioning

### Current API structure
- **v1 API** (`/api/v1/`): Current, stable, modular blueprints
- **Legacy API** (`api_routes.py`): Deprecated, kept for backwards compatibility

### Adding new endpoints
1. Create or modify blueprint in `api/v1/`
2. Register in `api/v1/__init__.py` if new blueprint
3. Document in `docs/api.md`
4. Add TypeScript types in `frontend/src/types/`

### Response format
All v1 endpoints should return:
```json
{
  "success": true,
  "data": { ... }
}
```
Or on error:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## 17) Task tracking

Open tasks and known issues are tracked in `TODO.md` at the repository root.
When working on a task, update the TODO.md to reflect progress.

End of file.
