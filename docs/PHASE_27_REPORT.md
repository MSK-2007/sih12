# RESQAI — PHASE 27 REPORT: CORE WORKFLOW FIXES & INTELLIGENCE PIPELINE

**Date:** 2026-11-26  
**Project:** ResQAI (`itmeoierfppvoaljebco`)  
**Phase 27 Status:** **COMPLETE (ALL APPLICATION WORKFLOW FIXES, INTELLIGENCE PIPELINE INTEGRATIONS, AND 86/86 TESTS VERIFIED; OPTIONAL DB TRIGGER MIGRATION `021` PREPARED FOR SQL EDITOR)**

---

## 1. Remote Migration Verification Results (Step 1)

Executed read-only `@supabase/supabase-js` verification against `https://itmeoierfppvoaljebco.supabase.co` after the owner ran `017`, `018.reviewed`, `019.reviewed`, and `020`:

### 1.1 Tables & Historical Data Preservation (**VERIFIED LIVE**)
- **New `018` & `019` tables confirmed live:** `reallocation_audit_logs` (`0`), `reallocation_events` (`0`), `provider_health` (`5` seeded rows), `ai_event_timeline` (`0`), `ai_assistant_conversations` (`0`).
- **Core tables confirmed live:** `incidents` (`0`), `resources` (`0`), `resource_assignments` (`0`), `hospitals` (`0`), `profiles` (`0`), `notifications` (`0`), `environmental_alerts` (`0`), `simulation_runs` (`0`), `simulation_events` (`0`).
- **Historical operational data preserved intact:** `external_events` (`313` rows), `external_ingestion_logs` (`38` rows), `weather_observations` (`15` rows), `incident_ai_analysis` (`1` row).

### 1.2 Reconciled Columns, Enums & `provider_health` Seed (**VERIFIED LIVE**)
- `environmental_alerts`: `source_alert_id`, `region`, `issued_at`, `received_at`, `status`, `raw_data` — **ALL PRESENT**.
- `incidents`: `environmental_risk_score`, `source_type` — **ALL PRESENT**.
- `resources`: `station_name`, `is_active` — **ALL PRESENT**.
- `external_events`: `incident_id` — **PRESENT**.
- `simulation_runs`: `scenario_id`, `run_key`, `mode`, `speed_multiplier`, `config`, `metrics`, `completed_at` — **ALL PRESENT**.
- `simulation_events`: `simulated_time`, `offset_minutes`, `status` — **ALL PRESENT**.
- Enum read-only filter checks confirmed `profiles.role` (`DISPATCHER`, `FIELD_RESPONDER`), `incidents.injury_level` (`CRITICAL`), and `notifications.type` (`NEW_INCIDENT`, `REALLOCATION_REQUIRED`, `SYSTEM_ERROR`) are valid PostgreSQL enum values.
- `provider_health` returned the 5 seeded rows (`gemini`, `imd`, `nasa_firms`, `supabase_realtime`, `usgs`) with `supabase_realtime.endpoint = "/realtime/v1"` (confirming `020` updated `019`'s seed row).

### 1.3 Catalog Items Requiring Manual SQL Editor Confirmation
PostgREST (`anon`/publishable key) cannot directly read `pg_indexes`, `pg_constraint`, `pg_policies`, `pg_publication_tables`, or `pg_proc` (`handle_new_user()` source). If deeper catalog inspection is desired, run the read-only queries in [PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md#L82-L213) (`C`–`G`) and [Section 5](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md#L672-L728) in the Supabase SQL Editor.

---

## 2. Bugs Identified & Fixed (Steps 2–4)

| Area | Root Cause Identified | Fix Implemented |
| :--- | :--- | :--- |
| **PostgreSQL `assigned_by` UUID failure (`allocation.ts`, `reallocation.ts`, `assignments.ts`)** | `confirmDispatch` and `confirmReallocation` passed `'CONTROL_ROOM_OPERATOR'` into `assigned_by UUID`, causing PostgreSQL `22P02` insert errors while `assignments.ts` silently fell back to memory. | Validated UUID format in `createAssignment()` (`null` when unauthenticated), resolved authenticated user UUID via `supabase.auth.getUser()`, and surfaced DB write errors cleanly. |
| **Dispatch stuck incident status (`allocation.ts`, `reallocation.ts`)** | `confirmDispatch` called `updateIncidentStatus(id, 'DISPATCHED')` from `REPORTED`/`ANALYSING`/`PRIORITIZED`, which `ALLOWED_STATUS_TRANSITIONS` rejects (only `AWAITING_DISPATCH -> DISPATCHED` is valid), and ignored `{ success: false }`. | Added `advanceIncidentToStatus()` in `incidents.ts` to transition step-by-step along `ALLOWED_STATUS_TRANSITIONS` (`REPORTED -> ANALYSING -> PRIORITIZED -> AWAITING_DISPATCH -> DISPATCHED`). |
| **Bypassed status validation (`incidents.ts`, `resources.ts`)** | `updateIncident()` and `updateResource()` allowed direct arbitrary `status` writes bypassing transition validation. | Enforced `isValidStatusTransition()` inside `updateIncident()` and `validateResourceStatusTransition()` inside `updateResource()`. |
| **Double allocation & race conditions (`allocation.ts`, `assignments.ts`, `resources.ts`)** | Concurrent `confirmDispatch()` calls could both pass initial `getResourceById` checks before updating `resources`; `resources.ts` lacked `.eq('status', expected)`; no rollback existed on partial failure. | Added per-resource `activeDispatchLocks`, active-assignment conflict check (`getActiveAssignmentsForResource`), `.eq('status', resource.status)` optimistic lock in `updateResourceStatus()`, and full batch rollback on failure. |
| **Completion/cancellation resource release (`assignments.ts`)** | `updateAssignmentStatus()` updated `resource_assignments` without transitioning resources back to `AVAILABLE` or clearing `current_assignment_id` on `COMPLETED`/`CANCELLED`/`REJECTED`. | Automatically transitions resource to `BUSY` on `IN_PROGRESS` and releases to `AVAILABLE` (`current_assignment_id = null`) on `COMPLETED`/`CANCELLED`/`REJECTED` (plus new `cancelDispatch()` helper & `audit_logs`). |
| **Reallocation state & donor release (`reallocation.ts`)** | `confirmReallocation()` ignored DB history (`reallocation_events`), didn't release donor's active assignment, lacked double-approval guards, and used hardcoded `3.5 km / 7 min / 90`. | Added `resolveRecommendationById()` DB fallback, `activeReallocationLocks`, duplicate approve/reject guard, donor assignment cancellation before reassignment, real route ETA/distance lookup, and `audit_logs`. |
| **Environmental risk & Priority link (`incidents.ts`, `IncidentDetails.tsx`, `externalEventWorkflow.ts`)** | `mapDbIncidentToModel` omitted `environmental_risk_score` & `source_type`; `recalculateIncidentPriority` ignored 50 km environmental hazards and fed `priorityScore` back as `severity`; `externalEventWorkflow` fabricated `60`/`90` fallback scores. | Mapped `environmentalRiskScore` & `sourceType`; integrated 50 km Haversine `evaluateIncidentEnvironmentalContext` / `evaluateEnvironmentalProximityRisks` into `recalculateIncidentPriority` and `externalEventWorkflow`; kept priority calculation deterministic & idempotent. |
| **Live data vs offline honesty (`earthquakeService.ts`, `weatherService.ts`)** | Static fallbacks returned `status: 'ONLINE'`; `earthquakeService` failed when deployed `ingest-earthquakes` returned `{ success: true, eventsCount: 50 }` without `events` array, and DB fallback omitted `.eq('source', 'USGS')`. | Static fallbacks now strictly report `status: 'OFFLINE'` (`success: false` for earthquakes, `isStale: true` for weather); `earthquakeService` supports both payload shapes and filters DB fallback by `source = 'USGS'`. |
| **Resource status descending sort (`resources.ts`)** | `!isAsc` branch duplicated ascending subtraction (`order[a.status] - order[b.status]`). | Fixed descending sort (`order[b.status] - order[a.status]`). |
| **DB-level transition & uniqueness guards** | Server-side triggers did not yet enforce incident/resource transitions or single active assignment index in PostgreSQL. | Authored [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) (`enforce_incident_status_transition`, `enforce_resource_status_transition`, `uk_resource_single_active_assignment`) ready for SQL Editor execution. |

---

## 3. Files Changed

### Modified Application & Type Files
- [src/types/incident.ts](file:///c:/Manish/sih1/src/types/incident.ts) — Added optional `environmentalRiskScore` to `CreateIncidentInput` and `UpdateIncidentInput`.
- [src/services/incidents.ts](file:///c:/Manish/sih1/src/services/incidents.ts) — Lifecycle transition validation, optimistic concurrency, `advanceIncidentToStatus`, `generate_next_incident_number` RPC integration, 50 km environmental risk linkage, `audit_logs`, and full DB model mapping.
- [src/services/resources.ts](file:///c:/Manish/sih1/src/services/resources.ts) — Fixed status sort bug, enforced transition rules in `updateResource`, optimistic status locking and `current_assignment_id` clearing in `updateResourceStatus`.
- [src/services/assignments.ts](file:///c:/Manish/sih1/src/services/assignments.ts) — Assignment transition validation, duplicate active assignment checks, UUID-safe `assigned_by`, automatic resource release (`COMPLETED`/`CANCELLED`/`REJECTED`), `cancelDispatch`, and `audit_logs`.
- [src/services/allocation.ts](file:///c:/Manish/sih1/src/services/allocation.ts) — Mandatory human-approval guard, concurrent lock & rollback, double-allocation prevention, real OSRM/Haversine route scoring, valid incident advancement, and `audit_logs`.
- [src/services/reallocation.ts](file:///c:/Manish/sih1/src/services/reallocation.ts) — DB-backed recommendation resolution, duplicate approve/reject protection, donor assignment release, real route metrics, and `audit_logs`.
- [src/services/environmentalIntelligenceService.ts](file:///c:/Manish/sih1/src/services/environmentalIntelligenceService.ts) — Exported pure deterministic `evaluateEnvironmentalProximityRisks` (50 km Haversine) used by `evaluateIncidentEnvironmentalContext`.
- [src/services/externalEventWorkflow.ts](file:///c:/Manish/sih1/src/services/externalEventWorkflow.ts) — Unified 50 km Haversine risk scoring, valid `PRIORITIZED` → `AWAITING_DISPATCH` progression, and mandatory operator approval gate.
- [src/services/earthquakeService.ts](file:///c:/Manish/sih1/src/services/earthquakeService.ts) — Handled deployed `{ eventsCount }` response, filtered DB cache to `source = 'USGS'`, linked `incident_id`, and returned honest `OFFLINE` status on fallback.
- [src/services/weatherService.ts](file:///c:/Manish/sih1/src/services/weatherService.ts) — Returned honest `OFFLINE` status on client fallback and tracked backend status accurately.
- [src/services/environmentalAlertsService.ts](file:///c:/Manish/sih1/src/services/environmentalAlertsService.ts) — Accurate live/offline tracking and priority recalculation on alert-to-incident conversion.
- [src/services/aiAnalysis.ts](file:///c:/Manish/sih1/src/services/aiAnalysis.ts) — Aligned rule-based fallback with deterministic priority engine + `environmentalRiskScore`.
- [src/components/incidents/IncidentDetails.tsx](file:///c:/Manish/sih1/src/components/incidents/IncidentDetails.tsx) — Passed `environmentalRiskScore` into inline priority breakdown display.

### Added Files
- [supabase/migrations/021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) — **Locally authored (awaiting owner SQL Editor execution)** database triggers & single-active-assignment unique index.
- [tests/integration/phase27Workflows.test.ts](file:///c:/Manish/sih1/tests/integration/phase27Workflows.test.ts) — 7 new integration tests covering lifecycle, approval gates, concurrency, 50 km Haversine environmental matching, reallocation, AI/offline fallbacks, and Supabase persistence contracts.

---

## 4. Live Integrations Actually Tested

| Integration / Endpoint | Observed Result | Honest Status |
| :--- | :--- | :--- |
| `ingest-weather` Edge Function | Returned `HTTP 200`, `success: true`, live Open-Meteo Bengaluru weather (`22.7°C`, `86%` humidity, `GREEN`, `freshness: REAL_TIME`). | **VERIFIED LIVE** |
| `ingest-earthquakes` Edge Function | Returned `HTTP 200` (`{"success":true,"eventsCount":50}`); live `external_events` table holds `313` USGS records. | **VERIFIED LIVE** |
| `ingest-imd-alerts` Edge Function | Returned `HTTP 200` (`{"success":true,"status":"CACHED","alertsCount":0}`). | **VERIFIED LIVE (0 active alerts)** |
| `ingest-fire-events` Edge Function | Returned `HTTP 200` with `success: false`, `status: "UNAVAILABLE"` (`FIRMS_MAP_KEY secret is not configured in Supabase Edge Function secrets.`). | **UNCONFIGURED SECRET (`FIRMS_MAP_KEY`)** |
| `analyze-incident` Edge Function | Returned `HTTP 200` with `{"fallback":true,"message":"GEMINI_API_KEY environment variable missing in Edge Function secrets."}`. Client falls back cleanly to `resqai-rule-engine-fallback`. | **UNCONFIGURED SECRET (`GEMINI_API_KEY`) — FALLBACK VERIFIED** |
| `explain-reallocation`, `gemini-assistant`, `monitor-data-providers`, `process-live-events` | Returned `HTTP 404 NOT_FOUND` on `OPTIONS` (not yet deployed remotely). | **NOT DEPLOYED REMOTELY** |

---

## 5. Verification & Test Suite Results

Executed after all Phase 27 code and test edits (`2026-11-26`):

- `npm run lint` (`tsc --noEmit`): **PASSED** (`exit code 0`, **0 TypeScript errors**)
- `npm run build` (`tsc && vite build`): **PASSED** (`exit code 0`, **2,628 modules transformed**, built in `23.19s`)
- `npm test` (`vitest run`): **PASSED** (`exit code 0`, **17/17 test files**, **86/86 tests passed** — including all 79 Phase 25/26 baseline tests + 7 new tests in [phase27Workflows.test.ts](file:///c:/Manish/sih1/tests/integration/phase27Workflows.test.ts))

---

## 6. Remaining Blockers & Readiness Assessment for Phase 28

### Readiness Assessment: **READY FOR PHASE 28 CODE DEVELOPMENT; DEPLOYMENT SECRETS & EDGE FUNCTION DEPLOY REQUIRED FOR FULL LIVE CLOUD PIPELINE**

1. **Optional Server-Side DB Triggers (`021_workflow_guards_and_rpcs.sql`):** Execute [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) in the Supabase Dashboard SQL Editor to add database-level transition triggers and single-active-assignment indexing matching the verified client logic.
2. **Missing Remote Edge Functions (`4/11`):** Deploy `explain-reallocation`, `gemini-assistant`, `monitor-data-providers`, and `process-live-events` to Supabase, plus updated `ingest-earthquakes` if array return payload is desired.
3. **Edge Function API Secrets:** Set `GEMINI_API_KEY` (and `FIRMS_MAP_KEY` for NASA FIRMS active fire data) in Supabase Edge Function secrets so live Gemini explanations and satellite thermal fire anomalies activate instead of graceful fallback.
4. **Live Authenticated Operational Smoke Test:** Once operator accounts/seed rows are present in `profiles`/`resources`/`incidents` (Phase 28 E2E), perform a live authenticated dispatch + completion + reallocation cycle through the UI.
