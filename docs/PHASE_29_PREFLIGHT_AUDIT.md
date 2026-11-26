# RESQAI — PHASE 29 PRE-FLIGHT: LIVE BACKEND & AI READINESS AUDIT

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco` (`https://itmeoierfppvoaljebco.supabase.co`)  
**Audit Mode:** Strictly **READ-ONLY** (no SQL migrations executed, no application files edited, no Edge Functions deployed, no secrets modified/printed, no remote database mutations).

**Verdict:** `BLOCKED`

> **Blocking Summary:** Phase 29 AI activation is currently **BLOCKED** because 4 of 11 Edge Functions (`explain-reallocation`, `gemini-assistant`, `monitor-data-providers`, `process-live-events`) return **`HTTP 404 Not Found`** remotely, the other 7 deployed Edge Functions carry **stale pre-Phase 28/28.8 bundles**, no server-side `pg_cron` jobs exist (`useLiveStatus` polling fails on `404`), remote `CRON_SECRET` / `GEMINI_API_KEY` / `FIRMS_MAP_KEY` secrets remain unprovisioned/unconfirmed, official IMD `mausam.imd.gov.in/api/nowcast` returns **`HTTP 404`**, and `023_signup_role_hardening.sql` + First `ADMIN` Bootstrap await owner execution.

---

## 1. Edge Function Deployment Status (Deployed vs Local)

Verified live via read-only `OPTIONS https://itmeoierfppvoaljebco.supabase.co/functions/v1/<name>` probes (and local CLI availability check: `supabase` CLI is **not** installed locally, so `supabase functions list` could not be inspected).

| # | Edge Function | Remote `OPTIONS` Status | Remote vs Local Parity | `config.toml` `verify_jwt` | Classification & Auth Mode |
| :-: | :--- | :---: | :--- | :---: | :--- |
| 1 | `analyze-incident` | **`HTTP 200`** (`ok`) | **STALE** (Phase 28/28.8 local updates not deployed) | `true` | `INTERACTIVE_AUTHENTICATED` (`ADMIN`/`DISPATCHER` JWT only) |
| 2 | `analyze-external-event` | **`HTTP 200`** (`ok`) | **STALE** (Phase 28/28.8 local updates not deployed) | `false` | `HYBRID` (Operator JWT, `CRON_SECRET`, or `SERVICE_ROLE`) |
| 3 | `explain-reallocation` | **`HTTP 404`** (Not Found) | **NOT DEPLOYED** | `true` | `INTERACTIVE_AUTHENTICATED` (`ADMIN`/`DISPATCHER` JWT only) |
| 4 | `gemini-assistant` | **`HTTP 404`** (Not Found) | **NOT DEPLOYED** | `true` | `INTERACTIVE_AUTHENTICATED` (`ADMIN`/`DISPATCHER` JWT only) |
| 5 | `ingest-earthquakes` | **`HTTP 200`** (`ok`) | **STALE** (Phase 28/28.8 local updates not deployed) | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 6 | `ingest-fire-events` | **`HTTP 200`** (`ok`) | **STALE** (missing Phase 28.8 `bbox`/`source` guards) | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 7 | `ingest-imd-alerts` | **`HTTP 200`** (`ok`) | **STALE** (missing Phase 28.8 `catch` `createClient` fix) | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 8 | `ingest-weather` | **`HTTP 200`** (`ok`) | **STALE** (Phase 28/28.8 local updates not deployed) | `false` | `HYBRID` (`ADMIN`/`DISPATCHER`/`FIELD_RESPONDER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 9 | `ingest-alerts` | **`HTTP 200`** (`ok`) | **STALE** (Phase 28/28.8 local updates not deployed) | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 10 | `monitor-data-providers` | **`HTTP 404`** (Not Found) | **NOT DEPLOYED** | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |
| 11 | `process-live-events` | **`HTTP 404`** (Not Found) | **NOT DEPLOYED** | `false` | `HYBRID` (`ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, `SERVICE_ROLE`) |

> **Security Note on Hybrid Verification:** Because `verify_jwt = false` functions have not been redeployed with [security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts) and [config.toml](file:///c:/Manish/sih1/supabase/config.toml), unauthenticated `POST` probes were intentionally **skipped** to remain strictly read-only against potentially unhardened pre-Phase 28 remote handlers.

---

## 2. Secrets Availability Check (No Values Exposed)

Local `.env` contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OSRM_ROUTING_URL`. Neither `supabase` CLI nor remote secret listings are available from this workspace, and `monitor-data-providers` returns `HTTP 404`.

| Secret | Scope | Current Availability Status |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Edge Functions (`analyze-incident`, `analyze-external-event`, `explain-reallocation`, `gemini-assistant`, `monitor-data-providers`) | **UNVERIFIED / OWNER MUST PROVISION** (AI features fall back deterministically if absent) |
| `FIRMS_MAP_KEY` | Edge Function (`ingest-fire-events`) | **UNVERIFIED / ASSUMED MISSING** (`fireService.ts` / `020` history flags missing key; NASA FIRMS live feed blocked until set) |
| `CRON_SECRET` | Edge Functions (`allowServiceOrCron: true` group) + `pg_cron` | **UNVERIFIED / OWNER MUST PROVISION** (>= 32 random bytes needed for scheduled cron auth) |

---

## 3. Live Data Ingestion & Source Classification Audit

Direct read-only `GET` tests were executed against public upstream endpoints; database persistence & Edge Function `POST` execution were **not** triggered (read-only rule).

| Source | Upstream HTTP Test | Provider Status | Fresh External Data? | Persisted to Supabase? | Latest Timestamp Observed | Dashboard Retrieval Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Open-Meteo Weather** (`ingest-weather` upstream) | `GET api.open-meteo.com/v1/forecast` -> **`HTTP 200`** | **LIVE (Upstream) / MANUAL CLIENT PERSISTENCE ONLY** | **Yes** (`22.4°C`, `rain 0.00`, `code 3`) | **Not automated** (`ingest-weather` returns JSON only; `weatherService.ts` attempts client-side insert, blocked for `FIELD_RESPONDER` under `022` RLS) | `2026-11-26T20:45` (IST) | **Authenticated only** (`anon` blocked `401 / 42501`; `FIELD_RESPONDER` + `DISPATCHER` + `ADMIN` can `SELECT` via `022`) |
| **USGS Earthquakes** (`ingest-earthquakes` upstream) | `GET earthquake.usgs.gov/.../all_day.geojson` -> **`HTTP 200`** | **LIVE (Upstream) / STALE EDGE FUNCTION** | **Yes** (`242` seismic events) | **Not verified live** (no `POST` run; prior baseline `external_events` includes historical rows pending Check 9/S1 SQL outputs) | `2026-11-26T15:15:09Z` (`generated: 2026-11-26T15:16:29Z`) | **Authenticated only** (`anon` blocked `401 / 42501`; authenticated users read `external_events`) |
| **IMD Alerts** (`ingest-imd-alerts` upstream) | `GET mausam.imd.gov.in/api/nowcast` -> **`HTTP 404 Not Found`** | **DEGRADED / CACHED FALLBACK** (Primary IMD 404 -> Open-Meteo nowcast backup; `FALLBACK_ALERTS` in UI if offline) | Primary IMD endpoint offline (`404`); Open-Meteo backup live (`200`) | **Not verified live** (`ingest-imd-alerts` remote bundle lacks Phase 28.8 catch fix) | Backup upstream `2026-11-26T20:45` (IST) | **Authenticated only** (`anon` blocked `401 / 42501`) |
| **NASA FIRMS Active Fire** (`ingest-fire-events`) | Not probed directly (requires secret `FIRMS_MAP_KEY`) | **OFFLINE / BLOCKED** (`FIRMS_MAP_KEY` unprovisioned & remote handler lacks Phase 28.8 fixes) | **No** | **No** | N/A | Returns `CACHED` DB rows if present, else `OFFLINE` (`errorMessage: FIRMS_MAP_KEY secret is not configured`) |
| **Local / Static Fallbacks** | Client fallbacks in `weatherService.ts` (`DEFAULT_WEATHER`), `earthquakeService.ts` (`FALLBACK_EARTHQUAKES`), `environmentalAlertsService.ts` (`FALLBACK_ALERTS`) | **SIMULATED / FALLBACK** (used strictly when Edge Function + DB fail) | No | No | Generated client-side on fallback | Marked `OFFLINE` or `CACHED`/`STALE` — never labeled `ONLINE` |

---

## 4. Automatic Synchronisation Audit

- **Server-Side Schedules (`pg_cron`):** **NONE CONFIGURED.** Searching `supabase/**/*.sql` and `supabase/config.toml` for `pg_cron` or `cron.schedule` returned **zero matches**.
- **Client-Side Timers ([useLiveStatus.ts](file:///c:/Manish/sih1/src/hooks/useLiveStatus.ts)):**
  - `HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000` (5 min) calls `runHealthCheck()` -> `monitor-data-providers` (**currently `HTTP 404` remotely**).
  - `EVENT_PIPELINE_INTERVAL_MS = 2 * 60 * 1000` (2 min) calls `runEventPipeline()` -> `process-live-events` (**currently `HTTP 404` remotely**).
- **Conclusion:** **Automatic background synchronisation does NOT currently operate.** Without server-side `pg_cron` jobs + deployed `monitor-data-providers`/`process-live-events` + `CRON_SECRET`, zero automated ingestion or AI event pipeline runs occur when no operator browser tab has `useLiveStatus` mounted, and even when mounted today those calls hit `HTTP 404`.

---

## 5. Gemini AI Readiness Audit

| Component | Target Model & Prompt Guardrails | Response Parsing & Error Handling | Persistence & Status |
| :--- | :--- | :--- | :--- |
| `analyze-incident` | `gemini-1.5-flash` (`temperature: 0.2`, JSON mode); forbids selecting vehicle IDs. | Safe `JSON.parse` + rule-based JSON fallback; local Phase 28.8 has `15s` timeout & `sanitizeJsonError(500)`. | Client (`aiAnalysis.ts`) inserts into `incident_ai_analysis` (`DISPATCHER`/`ADMIN` only under `022`). **Remote bundle stale.** |
| `analyze-external-event` | `gemini-1.5-flash`; forbids dispatch or vehicle IDs; injects `hospitals`, `resources`, `incidents`, `environmental_alerts` context. | `validateGeminiAnalysis()` + `generateDeterministicFallback()`; local Phase 28.8 has `15s` timeout & sanitized errors. | Server upserts `incident_ai_analysis` via `service_role` on `external_event_id`. **Remote bundle stale.** |
| `explain-reallocation` | `gemini-1.5-flash`; summarizes deterministic engine reallocation (`summary`, `reason`, `operator_action`, `risk`). | `JSON.parse` + deterministic fallback on failure; human confirmation still mandatory. | Returned inline to `reallocation.ts` (`recommendation.geminiSummary`). **NOT DEPLOYED (`HTTP 404`).** |
| `gemini-assistant` | `gemini-1.5-flash` multi-turn (`MAX_ITERATIONS = 5`) with 8 strictly read-only `TOOL_DECLARATIONS` (`SELECT` only). | Local Phase 28.8 removes `.or(...)` injection, bounds `history`, validates `session_id`/`UUID`, `25s` timeout. | Server inserts `ai_assistant_conversations` via `service_role`. **NOT DEPLOYED (`HTTP 404`).** |
| `monitor-data-providers` | Pings `gemini-1.5-flash` (`maxOutputTokens: 5`, `8s` timeout) alongside `usgs`, `imd`, `nasa_firms`, `supabase_realtime`. | Local Phase 28.8 scrubs secrets before `provider_health` upsert. | Upserts `provider_health` (`ONLINE`/`DEGRADED`/`OFFLINE`). **NOT DEPLOYED (`HTTP 404`).** |

---

## 6. Frontend Integration Trace & Broken Links

Trace: `External Provider → Edge Function → Supabase → Realtime / Query → React Dashboard`

1. **Broken Link — Missing Remote Pipeline & AI Endpoints (`404`):** `SystemHealthPage` / `useLiveStatus` -> `monitor-data-providers` & `process-live-events` (`404`); `Reallocation` -> `explain-reallocation` (`404`); AI Assistant -> `gemini-assistant` (`404`).
2. **Broken Link — Stale Security & Validation in 7 Deployed Functions:** `analyze-incident`, `analyze-external-event`, `ingest-*` lack deployed Phase 28/28.8 fixes (`verify_jwt` alignment, `_shared/security.ts` hybrid checks, `ingest-imd-alerts` catch fix, `ingest-fire-events` `bbox` guard).
3. **Broken Link — No Server-Side `pg_cron` Jobs:** Data sync depends solely on browser `useLiveStatus` `setInterval`, which stops when tabs close.
4. **Architectural Gap — `ingest-weather` Persistence:** [weatherService.ts](file:///c:/Manish/sih1/src/services/weatherService.ts#L57-L70) performs `supabase.from('weather_observations').insert(...)` client-side instead of inside `ingest-weather` via `service_role`. Under `022` RLS (`Dispatcher or admin write weather_observations`), `FIELD_RESPONDER` or `pg_cron` calls to `ingest-weather` fetch live Open-Meteo data but **cannot persist** rows to `weather_observations`.
5. **Uncompleted DB/Auth Gates:** [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql), Phase 28.5 catalog SQL review, and First `ADMIN` Bootstrap ([PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md)) must complete so operators can sign in as verified `ADMIN`/`DISPATCHER` accounts (`anon` PostgREST reads are blocked `401 / 42501` by `022`).

---

## 7. Exact Remaining Blockers & Recommended Activation Order

### Remaining Blockers
1. **Unverified Phase 28.5 SQL Catalog Outputs & Unapplied `023`:** Confirm `021`/`022` live catalog results ([PHASE_28_5_VERIFICATION_RESULTS_ANALYSIS.md](file:///c:/Manish/sih1/docs/PHASE_28_5_VERIFICATION_RESULTS_ANALYSIS.md)) and apply [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql).
2. **No Bootstrapped `ADMIN` Account Confirmed:** Execute [PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md) so authenticated operator flows and smoke tests can run.
3. **Missing Remote Edge Function Secrets:** `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`.
4. **4 Missing + 7 Stale Remote Edge Functions:** All 11 functions + [config.toml](file:///c:/Manish/sih1/supabase/config.toml) must be deployed.
5. **Missing `pg_cron` Schedules & IMD Endpoint Replacement/Persistence Fix:** Server-side `pg_cron` schedules are absent, `mausam.imd.gov.in/api/nowcast` returns `404` (relying on Open-Meteo backup), and `ingest-weather` does not persist `weather_observations` server-side via `service_role`.

### Recommended Activation Order
1. **Database & Identity:** Verify Phase 28.5 SQL catalog outputs -> execute `023_signup_role_hardening.sql` -> run First `ADMIN` Bootstrap ([PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md)).
2. **Edge Secrets:** Provision `CRON_SECRET`, `GEMINI_API_KEY`, and `FIRMS_MAP_KEY` on `itmeoierfppvoaljebco` (`supabase secrets set`).
3. **Edge Deploy:** Deploy all 11 Edge Functions with [supabase/config.toml](file:///c:/Manish/sih1/supabase/config.toml) (`verify_jwt` rules).
4. **Post-Deploy Auth & Feed Verification:** Smoke-test `analyze-incident`, `analyze-external-event`, `explain-reallocation`, `gemini-assistant`, `ingest-earthquakes`, `ingest-fire-events`, `ingest-imd-alerts`, `ingest-weather`, `monitor-data-providers`, and `process-live-events` with real `ADMIN`/`DISPATCHER`/`FIELD_RESPONDER` JWTs and `x-cron-secret`.
5. **Phase 29 Activation & Server Sync Hardening:** Persist `weather_observations` server-side inside `ingest-weather` via `service_role`, configure `pg_cron` jobs sending `x-cron-secret` for automated background ingestion/pipeline sync, and update IMD primary endpoint or promote Open-Meteo regional warning source explicitly.

---

## Final Verdict

**`BLOCKED`** — Do not begin Phase 29 AI activation until the 4 missing Edge Functions + 7 stale Edge Functions are deployed with `CRON_SECRET` / `GEMINI_API_KEY` / `FIRMS_MAP_KEY`, `023` + First `ADMIN` Bootstrap are executed, and post-deployment authenticated end-to-end smoke checks pass.
