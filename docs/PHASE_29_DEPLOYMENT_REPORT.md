# RESQAI — PHASE 29: EDGE FUNCTION DEPLOYMENT & BACKEND ACTIVATION REPORT

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `resqai` (`itmeoierfppvoaljebco`, `https://itmeoierfppvoaljebco.supabase.co`)

**Final Verdict:** `BLOCKED`

> **Stop Trigger (Step 4 Prerequisite Gate):** `npx supabase` (`v3.4.0`) is installed and authenticated to project `itmeoierfppvoaljebco`, and all 11 local Edge Functions passed Step 3 security review. However, **`supabase secrets list` proved that `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, and `CRON_SECRET` are all missing remotely**. Per Phase 29 Step 4 (*"Once all prerequisites pass: Deploy all 11 functions... If owner authentication or secret provisioning is required, stop and provide exact commands for the owner"*), deployment and live smoke tests were **not executed** so owner secret provisioning occurs first.

---

## 1. State Reconciliation (Step 1)

### 1A. Local Git & Worktree State
- Working tree has active local Phase 25–28.8 modifications and untracked reports/migrations/functions (`supabase/config.toml`, `supabase/functions/_shared/security.ts`, all 11 `supabase/functions/*/index.ts`, migrations `016`–`023`, security suites passing **21/21 files, 114/114 tests**).
- `supabase/.temp/project-ref` = `itmeoierfppvoaljebco`; `supabase/.temp/linked-project.json` confirms linked project `resqai` (`production`).

### 1B. Migration History (`001`–`023`) vs Remote State
- `npx --yes supabase migration list --linked` shows `001`–`016` recorded in `supabase_migrations.schema_migrations` and `017`–`023` showing `"remote": ""` because the owner executed `017`–`023` via **Supabase Dashboard SQL Editor** rather than `supabase db push`.
- Do **not** run `supabase db push` or re-execute `021`–`023`.
- Previous live PostgREST `anon` probes (`Phase 28.4`) confirmed `HTTP 401` (`42501 permission denied for table ...`) across all 25 `public` tables and `HTTP 401` on helper RPCs (`get_auth_user_role`, `is_admin`, `is_dispatcher_or_admin`, `is_field_responder`, `is_responder_assigned_to_incident`), directly matching `022` enforcement.

### 1C. First `ADMIN` Profile Check Boundary
- Local `.env` stores only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OSRM_ROUTING_URL` (no `ADMIN` credentials, JWT, or `service_role` key).
- Unauthenticated `GET /rest/v1/profiles` returns `HTTP 401` (`42501`, expected). Authenticated read-only confirmation of the owner's bootstrapped `ADMIN` profile should be performed using the signed-in `ADMIN` session in the ResQAI app or via SQL Editor (`SELECT id, email, role, is_active FROM public.profiles WHERE role::text = 'ADMIN';`).

---

## 2. Deployment Prerequisites & Secret Availability (Step 2)

| Prerequisite | Status | Details |
| :--- | :--- | :--- |
| **Supabase CLI (`npx supabase`)** | **AVAILABLE & AUTHENTICATED** | `supabase` CLI `3.4.0` available via `npx --yes supabase`, linked to `itmeoierfppvoaljebco`. |
| **Edge Function Code & Config** | **READY LOCALLY** | All 11 `supabase/functions/*/index.ts`, `_shared/security.ts`, and `supabase/config.toml` verified. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | **PRESENT (Supabase-managed)** | Confirmed via `supabase secrets list` (names only). |
| `GEMINI_API_KEY` | **MISSING — OWNER ACTION REQUIRED** | Absent from `supabase secrets list`. |
| `FIRMS_MAP_KEY` | **MISSING — OWNER ACTION REQUIRED** | Absent from `supabase secrets list`. |
| `CRON_SECRET` | **MISSING — OWNER ACTION REQUIRED** | Absent from `supabase secrets list`. |

---

## 3. Step 3 — Local Security Review & Current Remote Inventory

All 11 local Edge Functions passed security review against Phase 28.8 criteria (`requireAuthenticatedUser`, `checkRateLimit`, `parseJsonWithLimit`, timeouts, `sanitizeJsonError`, coordinate/UUID/BBox checks, `scrubSecrets`), while the remote project still runs either stale pre-Phase 28 versions or `404` missing deployments:

| # | Function Name | Local Auth & Gateway (`config.toml`) | Local Security Review | Current Remote State (`supabase functions list` + `OPTIONS`) |
| :-: | :--- | :--- | :---: | :--- |
| 1 | `analyze-incident` | `verify_jwt = true`, `['ADMIN', 'DISPATCHER']`, interactive JWT only (`allowServiceOrCron = false`) | **PASS** | Active **v2** (`verify_jwt: false` remotely — **STALE**) |
| 2 | `explain-reallocation` | `verify_jwt = true`, `['ADMIN', 'DISPATCHER']`, interactive JWT only | **PASS** | **NOT DEPLOYED** (`HTTP 404`) |
| 3 | `gemini-assistant` | `verify_jwt = true`, `['ADMIN', 'DISPATCHER']`, interactive JWT only, `.or()` injection removed | **PASS** | **NOT DEPLOYED** (`HTTP 404`) |
| 4 | `analyze-external-event` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true` | **PASS** | Active **v3** (`verify_jwt: false` remotely — **STALE**) |
| 5 | `ingest-earthquakes` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true` | **PASS** | Active **v5** (`verify_jwt: false` remotely — **STALE**) |
| 6 | `ingest-fire-events` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true`, `validateBbox()` + source allowlist | **PASS** | Active **v2** (`verify_jwt: false` remotely — **STALE**) |
| 7 | `ingest-imd-alerts` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true`, catch client bug fixed | **PASS** | Active **v2** (`verify_jwt: false` remotely — **STALE**) |
| 8 | `ingest-weather` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']`, `allowServiceOrCron = true` | **PASS** | Active **v2** (`verify_jwt: false` remotely — **STALE**) |
| 9 | `ingest-alerts` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true` | **PASS** | Active **v2** (`verify_jwt: false` remotely — **STALE**) |
| 10 | `monitor-data-providers` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true`, `providers` allowlisted | **PASS** | **NOT DEPLOYED** (`HTTP 404`) |
| 11 | `process-live-events` | `verify_jwt = false`, `['ADMIN', 'DISPATCHER']`, `allowServiceOrCron = true` | **PASS** | **NOT DEPLOYED** (`HTTP 404`) |

---

## 4. Deployment & Live Smoke Test Status (Steps 4 & 5)

- **Remote Deployment Result:** **NOT EXECUTED** (paused cleanly at Step 4 gate because `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, and `CRON_SECRET` are missing remotely).
- **Live Smoke Tests:** **NOT EXECUTED** (cannot test live `CRON_SECRET`, live Gemini responses, or the 4 undeployed functions until secrets are set and all 11 functions are deployed).

---

## 5. Exact Owner Commands to Complete Phase 29 Activation

Run the following commands from `c:\Manish\sih1` (replace placeholders locally in your shell; never commit secrets):

### Step A — Generate & Set Missing Edge Function Secrets
```powershell
# Generate a strong >= 32-byte cryptographically random CRON_SECRET in PowerShell (do not print or commit)
$bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$cronSecret = [Convert]::ToBase64String($bytes)

npx --yes supabase secrets set --project-ref itmeoierfppvoaljebco `
  CRON_SECRET="$cronSecret" `
  GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>" `
  FIRMS_MAP_KEY="<YOUR_NASA_FIRMS_MAP_KEY>"
```

Verify secret names exist (never exposes values):
```powershell
npx --yes supabase secrets list --project-ref itmeoierfppvoaljebco
```

### Step B — Deploy All 11 Edge Functions (`supabase/config.toml` applies per-function `verify_jwt`)
```powershell
npx --yes supabase functions deploy `
  analyze-incident `
  explain-reallocation `
  gemini-assistant `
  analyze-external-event `
  ingest-earthquakes `
  ingest-fire-events `
  ingest-imd-alerts `
  ingest-weather `
  ingest-alerts `
  monitor-data-providers `
  process-live-events `
  --project-ref itmeoierfppvoaljebco
```

Verify deployed versions & `verify_jwt` flags (`analyze-incident`, `explain-reallocation`, `gemini-assistant` = `true`; remaining 8 = `false`):
```powershell
npx --yes supabase functions list --project-ref itmeoierfppvoaljebco
```

### Step C — Authenticated Live Smoke Verification Checklist
After Steps A & B succeed, run live verification covering:
1. Unauthenticated `POST` to any of the 11 functions -> `HTTP 401`.
2. `FIELD_RESPONDER` JWT on `analyze-incident` / `ingest-earthquakes` -> `HTTP 403`; on `ingest-weather` -> `HTTP 200` (upstream Open-Meteo fresh response; distinguish upstream fetch from `weather_observations` DB persistence).
3. `ADMIN` or `DISPATCHER` JWT on `analyze-incident`, `explain-reallocation`, `gemini-assistant`, `analyze-external-event`, `monitor-data-providers`, `process-live-events` -> `HTTP 200` with live Gemini output.
4. `x-cron-secret: <CRON_SECRET>` on `monitor-data-providers` & `ingest-*` -> `HTTP 200`; same `x-cron-secret` on `analyze-incident` -> `HTTP 401`.
5. Oversized (`> 64KB`/`16KB` -> `413`) and malformed JSON (`400`) and invalid `bbox` (`400`) payloads -> rejected without secret leakage.

---

## 6. Remaining Blockers & Next Steps for Phase 30

### Remaining Blockers
1. Missing remote secrets: `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`.
2. 4 missing + 7 stale Edge Function deployments on `itmeoierfppvoaljebco` (including `analyze-incident` currently having `verify_jwt: false` remotely).
3. Live authenticated smoke tests not yet executed post-deployment.

### Next Steps for Phase 30 (Once Phase 29 Deployment & Smoke Tests Pass)
1. Configure server-side `pg_cron` schedules sending `x-cron-secret` to `monitor-data-providers` and `process-live-events` so live ingestion & AI triage run continuously without requiring an open browser tab.
2. Add server-side `service_role` persistence to `ingest-weather` (`weather_observations` table) and replace the `404` primary IMD URL (`mausam.imd.gov.in/api/nowcast`) or promote Open-Meteo as primary regional weather alert source.
3. Run end-to-end authenticated UI verification across `ADMIN`, `DISPATCHER`, and `FIELD_RESPONDER` flows on live `itmeoierfppvoaljebco`.

---

## Final Verdict

**`BLOCKED`** — Blocked on missing remote secrets (`GEMINI_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`) and pending deployment of all 11 Edge Functions (`4` missing + `7` stale remotely).
