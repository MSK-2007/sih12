# RESQAI — PHASE 28.8: EDGE FUNCTION DEPLOYMENT MATRIX

**Date:** 2026-11-26  
**Supabase Project:** `itmeoierfppvoaljebco`  
**Gateway Config Source:** [supabase/config.toml](file:///c:/Manish/sih1/supabase/config.toml)

---

## 1. Secret Readiness Audit (Do Not Expose Values)

| Secret Name | Provisioned Automatically by Supabase? | Expected Usage | Current Status |
| :--- | :---: | :--- | :--- |
| `SUPABASE_URL` | Yes | All DB-connected Edge Functions | Managed by Supabase Edge runtime |
| `SUPABASE_ANON_KEY` | Yes | User JWT verification (`requireAuthenticatedUser`) | Managed by Supabase Edge runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin profile lookup, DB writes, internal `functions.invoke()` | Managed by Supabase Edge runtime |
| `CRON_SECRET` | **No (Owner must set)** | `x-cron-secret` header verification for scheduled `HYBRID` functions | **MISSING / REQUIRED BEFORE CRON** (generate >= 32 random bytes) |
| `GEMINI_API_KEY` | **No (Owner must set)** | `analyze-incident`, `analyze-external-event`, `explain-reallocation`, `gemini-assistant`, `monitor-data-providers` | **MISSING / REQUIRED FOR AI** (deterministic fallback activates if unset) |
| `FIRMS_MAP_KEY` | **No (Owner must set)** | `ingest-fire-events` (NASA FIRMS API) | **MISSING / REQUIRED FOR NASA FIRMS** (returns `UNAVAILABLE` / `DEGRADED` if unset) |

---

## 2. Function-by-Function Deployment Matrix

| Function Name | `config.toml` `verify_jwt` | Authentication Mode | Required Role / Machine Secret | Required Env Vars | Local Readiness | Remaining Deployment Blockers |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| `analyze-incident` | `true` | `INTERACTIVE_AUTHENTICATED` | User JWT + active `ADMIN` or `DISPATCHER` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` | Ready locally | Deploy bundle + set `GEMINI_API_KEY` |
| `explain-reallocation` | `true` | `INTERACTIVE_AUTHENTICATED` | User JWT + active `ADMIN` or `DISPATCHER` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` | Ready locally | Deploy bundle + set `GEMINI_API_KEY` |
| `gemini-assistant` | `true` | `INTERACTIVE_AUTHENTICATED` | User JWT + active `ADMIN` or `DISPATCHER` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` | Ready locally | Deploy bundle + set `GEMINI_API_KEY` |
| `analyze-external-event` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `GEMINI_API_KEY` & `CRON_SECRET` |
| `ingest-earthquakes` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` |
| `ingest-fire-events` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `FIRMS_MAP_KEY` & `CRON_SECRET` |
| `ingest-imd-alerts` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` |
| `ingest-weather` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER`/`FIELD_RESPONDER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` |
| `ingest-alerts` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` |
| `monitor-data-providers` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` & `GEMINI_API_KEY` |
| `process-live-events` | `false` | `HYBRID` | `ADMIN`/`DISPATCHER` JWT, `CRON_SECRET`, or `SERVICE_ROLE` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Ready locally | Deploy bundle + set `CRON_SECRET` |

---

## 3. Safe Deployment Plan (Owner Execution Only — Do Not Run Here)

1. **Database Prerequisites First:**
   - Ensure `021`, `022`, and [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql) are applied and verified in SQL Editor.
   - Complete the one-time first `ADMIN` bootstrap ([PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md)).
2. **Set Edge Function Secrets (Never print or commit secret values):**
   ```powershell
   supabase secrets set --project-ref itmeoierfppvoaljebco CRON_SECRET=<RANDOM_32+_BYTE_SECRET> GEMINI_API_KEY=<YOUR_GEMINI_KEY> FIRMS_MAP_KEY=<YOUR_FIRMS_KEY>
   ```
3. **Deploy All 11 Edge Functions (`supabase/config.toml` applies per-function `verify_jwt`):**
   ```powershell
   supabase functions deploy analyze-incident explain-reallocation gemini-assistant analyze-external-event ingest-earthquakes ingest-fire-events ingest-imd-alerts ingest-weather ingest-alerts monitor-data-providers process-live-events --project-ref itmeoierfppvoaljebco
   ```
4. **Configure Scheduled Invocations (`pg_cron`):**
   - Pass header `x-cron-secret: <CRON_SECRET>` when scheduling `monitor-data-providers`, `process-live-events`, or `ingest-*` (and never schedule `analyze-incident`, `explain-reallocation`, or `gemini-assistant`).
5. **Post-Deployment Smoke Verification:**
   - Unauthenticated request to any of the 11 endpoints -> `HTTP 401`.
   - `FIELD_RESPONDER` JWT on `analyze-incident` / `ingest-earthquakes` -> `HTTP 403`; on `ingest-weather` -> `HTTP 200`.
   - `DISPATCHER` / `ADMIN` JWT on `analyze-incident` / `gemini-assistant` -> `HTTP 200`.
   - `x-cron-secret` on `monitor-data-providers` -> `HTTP 200`; `x-cron-secret` on `analyze-incident` -> `HTTP 401`.
