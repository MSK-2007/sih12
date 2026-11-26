# RESQAI — PHASE 29.3: POST-DEPLOYMENT LIVE VERIFICATION REPORT

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `resqai` (`itmeoierfppvoaljebco`, `https://itmeoierfppvoaljebco.supabase.co`, region `ap-south-1`)  
**Scope:** Read-only remote verification, unauthenticated/invalid-auth boundary tests, log inspection, and local regression checks. No SQL migrations, schema changes, secret modifications, function redeployments, production data mutations, or Phase 30 scheduling were executed.

**Final Verdict:** `PARTIALLY VERIFIED`

> **Verdict Rationale:** All **11/11** Edge Functions are now `ACTIVE` remotely, remote `verify_jwt` flags match [supabase/config.toml](file:///c:/Manish/sih1/supabase/config.toml) **11/11**, `GEMINI_API_KEY` and `CRON_SECRET` are present remotely, all **11/11** endpoints reject unauthenticated/invalid-JWT requests with `HTTP 401`, `function_logs` show zero errors/timeouts/secret leaks, and local `lint`/`build`/`test` (`22/22` files, `119/119` tests) passed. Verification is **PARTIALLY VERIFIED** (rather than `VERIFIED`) because: (1) **`FIRMS_MAP_KEY` is still missing** in remote secrets, and (2) **authenticated `ADMIN`/`DISPATCHER` and positive `CRON_SECRET` smoke tests** (live Gemini `gemini-3.8-flash` roundtrips and positive `monitor-data-providers` checks) could not be run from this environment without owner session credentials.

---

## 1. Deployment Inventory & Remote `verify_jwt` Configuration

Verified directly from `npx --yes supabase functions list --project-ref itmeoierfppvoaljebco` (`v3.4.0`), **not** assumed from local files:

| # | Function Name | Status | Version | Deployed Timestamp (UTC) | Remote `verify_jwt` | Local `config.toml` | Match? |
| :-: | :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| 1 | `analyze-incident` | `ACTIVE` | **5** | `2026-11-26T15:33:36.923Z` | **`true`** | `true` | Yes |
| 2 | `explain-reallocation` | `ACTIVE` | **1** | `2026-11-26T15:33:45.223Z` | **`true`** | `true` | Yes |
| 3 | `gemini-assistant` | `ACTIVE` | **1** | `2026-11-26T15:33:53.060Z` | **`true`** | `true` | Yes |
| 4 | `analyze-external-event` | `ACTIVE` | **6** | `2026-11-26T15:33:59.363Z` | **`false`** | `false` | Yes |
| 5 | `ingest-earthquakes` | `ACTIVE` | **8** | `2026-11-26T15:34:05.548Z` | **`false`** | `false` | Yes |
| 6 | `ingest-fire-events` | `ACTIVE` | **5** | `2026-11-26T15:34:12.132Z` | **`false`** | `false` | Yes |
| 7 | `ingest-imd-alerts` | `ACTIVE` | **5** | `2026-11-26T15:34:18.047Z` | **`false`** | `false` | Yes |
| 8 | `ingest-weather` | `ACTIVE` | **5** | `2026-11-26T15:34:24.358Z` | **`false`** | `false` | Yes |
| 9 | `ingest-alerts` | `ACTIVE` | **5** | `2026-11-26T15:34:30.479Z` | **`false`** | `false` | Yes |
| 10 | `monitor-data-providers` | `ACTIVE` | **1** | `2026-11-26T15:34:37.169Z` | **`false`** | `false` | Yes |
| 11 | `process-live-events` | `ACTIVE` | **1** | `2026-11-26T15:34:43.991Z` | **`false`** | `false` | Yes |

### Code Compatibility & Secrets Verification
- **Deployment timing & handler parity:** All 11 functions were deployed at `15:33:36Z`–`15:34:43Z` UTC (after Phase 29.1 updates to [supabase/functions/_shared/gemini.ts](file:///c:/Manish/sih1/supabase/functions/_shared/gemini.ts) and all 5 AI functions), and every endpoint returns `_shared/security.ts`'s `{"success":false,"error":"Missing bearer authorization token"}` on unauthenticated requests. Direct inspection of the remote source archive (`supabase functions download`) was not run to avoid overwriting or writing temporary project files.
- **Secrets (`supabase secrets list`, names only):**
  - `GEMINI_API_KEY`: **PRESENT** (`updated_at: 2026-11-26T15:27:03.320Z`)
  - `CRON_SECRET`: **PRESENT** (`updated_at: 2026-11-26T15:32:29.100Z`)
  - **`FIRMS_MAP_KEY`: MISSING** (not present in remote secret list)
  - All 7 Supabase-managed secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`): **PRESENT**

---

## 2. Authentication Test Results (Live Read-Only Probes)

Executed `POST` probes (`apikey` header only unless noted, empty `{}` JSON body, zero DB writes):

| Endpoint | Probe Type | HTTP Status | Exact Response / Behavior |
| :--- | :--- | :---: | :--- |
| All 11 endpoints (`analyze-incident` through `process-live-events`) | Unauthenticated (`no-auth`, `apikey` only) | **`HTTP 401`** (11/11) | `{"success":false,"error":"Missing bearer authorization token"}` |
| `analyze-incident` (`verify_jwt=true`) | Malformed JWT (`Bearer invalid.jwt.token`) | **`HTTP 401`** | `{"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}` (blocked at Supabase gateway) |
| `monitor-data-providers` (`verify_jwt=false`) | Malformed JWT (`Bearer invalid.jwt.token`) | **`HTTP 401`** | `{"success":false,"error":"Invalid or expired authentication token"}` (blocked by `_shared/security.ts`) |
| `monitor-data-providers` (`verify_jwt=false`) | Invalid `x-cron-secret` (`invalid-cron-probe`) | **`HTTP 401`** | `{"success":false,"error":"Missing bearer authorization token"}` (constant-time digest mismatch rejected) |

---

## 3. Controlled Live Smoke Test & Gemini Connectivity Status

- **Live Authenticated & Cron Smoke Tests (`gemini-assistant`, `analyze-incident`, `explain-reallocation`, `monitor-data-providers`, positive `CRON_SECRET`):** **NOT EXECUTED.** No authenticated `ADMIN`/`DISPATCHER` JWT or raw `CRON_SECRET` value exists locally in `.env` (which holds only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OSRM_ROUTING_URL`), and obtaining one requires interactive owner sign-in or reading owner secrets.
- **Gemini Connectivity Status:** `GEMINI_API_KEY` is confirmed present remotely and local source targets `gemini-3.8-flash` via `x-goog-api-key`, **but end-to-end live `gemini-3.8-flash` inference remains unverified** until an authenticated `ADMIN`/`DISPATCHER` session runs the smoke checklist in Section 7.

---

## 4. External Ingestion Safety, DB Mutation Risks & Upstream Provider Status

Handlers were inspected before testing so no mutating ingestion or AI pipeline was triggered:

| Function | Mutates DB When Authorized? | Tables Written | Upstream Provider Availability |
| :--- | :--- | :--- | :--- |
| `ingest-earthquakes` | **Yes** (no dry-run mode) | `external_events`, `external_ingestion_logs` | **LIVE** (USGS feed returned `HTTP 200`, `242` features in Phase 29 preflight) |
| `ingest-fire-events` | **Yes** (even missing key logs `FAILED` row) | `external_events`, `external_ingestion_logs` | **BLOCKED** (`FIRMS_MAP_KEY` missing remotely) |
| `ingest-imd-alerts` | **Yes** (no dry-run mode) | `environmental_alerts`, `external_ingestion_logs` | **DEGRADED** (Primary `mausam.imd.gov.in/api/nowcast` returns `HTTP 404`; Open-Meteo backup `HTTP 200`) |
| `analyze-external-event` | **Yes** (when `external_event_id` present) | `incident_ai_analysis` | Depends on `GEMINI_API_KEY` (present remotely) |
| `process-live-events` | **Yes** (no dry-run mode) | `ai_event_timeline`, `incident_updates`, `provider_health` (+ invokes `analyze-external-event`) | Depends on `external_events` + `GEMINI_API_KEY` |
| `monitor-data-providers` | **Yes** (invokes USGS, IMD, FIRMS + writes health) | `provider_health` + triggers `ingest-*` writes | Invoking `monitor-data-providers` executes live ingestion (`providers: ["gemini"]` limits scope to Gemini ping + `provider_health` upsert) |
| `gemini-assistant` | Conditional (`session_id` present) | `ai_assistant_conversations` only (tools are `SELECT`-only) | Depends on `GEMINI_API_KEY` |
| `ingest-weather` | **No** (returns JSON only) | None (client `weatherService.ts` writes `weather_observations`) | **LIVE** (Open-Meteo returned `HTTP 200` at `2026-11-26T20:45` IST) |
| `ingest-alerts` | **No** (returns normalized JSON) | None | Local synthesized alert payload |
| `analyze-incident` | **No** (returns JSON only) | None (client `aiAnalysis.ts` writes `incident_ai_analysis`) | Depends on `GEMINI_API_KEY` |
| `explain-reallocation` | **No** (returns JSON only) | None | Depends on `GEMINI_API_KEY` |

---

## 5. Remote Runtime Logs Inspection (`supabase logs --remote`)

Inspected last 40 records across `--service functions` and `--service function-edge` (`--since 2h`):
- **`functions` (`function_logs`, 40 records):** `17 info`, `23 log` (`booted`, `Listening on http://localhost:9999/`, runtime `supabase-edge-runtime-1.79.1 (compatible with Deno v2.1.4)`). **Zero** Gemini errors, **zero** missing env errors, **zero** DB permission errors, **zero** timeouts, and **zero** secret leaks.
- **`function-edge` (`function_edge_logs`, 40 records):** `18 info`, `22 warn` — all 22 `warn` rows correspond strictly to pre-deployment `OPTIONS 404` checks (`15:15Z`, `15:19Z`) and this verification's unauthenticated/invalid-JWT `POST 401` checks (`15:37Z`). **Zero** `5xx` errors and **zero** leaked secrets.

---

## 6. Local Regression Checks

Executed cleanly on `c:\Manish\sih1`:
- `npm run lint` (`tsc --noEmit`): **PASSED** (`exit 0`, 0 TypeScript errors)
- `npm run build` (`tsc && vite build`): **PASSED** (`exit 0`, `2,632` modules transformed in `12.55s`)
- `npm test` (`vitest run`): **PASSED** (`exit 0`, **22/22** test files, **119/119** tests passing in `10.46s`)

---

## 7. Remaining Blockers & Owner Verification Steps

1. **Missing `FIRMS_MAP_KEY` Secret:** Provision `FIRMS_MAP_KEY` via `npx --yes supabase secrets set --project-ref itmeoierfppvoaljebco FIRMS_MAP_KEY="<KEY>"` when NASA FIRMS satellite ingestion is desired.
2. **Authenticated Live Smoke Tests Still Required (Run as Signed-In `ADMIN` / `DISPATCHER`):**
   - Sign into the ResQAI web app (`/login`) as your bootstrapped `ADMIN` user (so a real user JWT exists without pasting tokens into files):
     - Trigger `AiAssistantPanel` with a harmless question (`"Which resources are currently available?"`) -> confirm `200` and `model: gemini-3.8-flash` (not `error-fallback`).
     - Open an existing incident -> run AI analysis (`analyze-incident`) -> confirm `modelName: gemini-3.8-flash`.
     - Trigger reallocation explanation on an existing recommendation (`explain-reallocation`) **without** clicking Confirm Reallocation.
     - On `SystemHealthPage`, trigger health check (or `monitor-data-providers` with `{ "providers": ["gemini"] }`) -> confirm `gemini` reports `ONLINE` (note running full `monitor-data-providers` writes `provider_health` and triggers `ingest-*`).
   - Optionally verify positive `CRON_SECRET` header locally in your own shell against `ingest-weather` (`read-only`, returns JSON without DB writes) using the `$cronSecret` you provisioned, confirming `HTTP 200` on `ingest-weather` and `HTTP 401` when sent to `analyze-incident`.
