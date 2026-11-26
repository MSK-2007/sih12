# RESQAI — PHASE 28.8: EDGE FUNCTION REMEDIATION & TEST REPORT

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco`  
**Execution Boundary:** Local audit, remediation, and verification only. No remote SQL, no Edge Function deployment, no secret updates, no `ADMIN` bootstrap, and no Phase 29 work performed.

**Final Verdict:** `READY FOR OWNER DEPLOYMENT REVIEW`

---

## 1. Vulnerabilities & Defects Remediated Locally (Phase C)

| Severity | Function / Module | Issue Identified | Local Remediation Applied |
| :---: | :--- | :--- | :--- |
| **CRITICAL** | [ingest-imd-alerts](file:///c:/Manish/sih1/supabase/functions/ingest-imd-alerts/index.ts) | `catch` block called undeclared `createClient(...)`, used hardcoded project URL fallback, leaked raw `err?.message` with `status: 200`. | Switched error audit log to `getServiceSupabaseClient()`, scrubbed errors via `scrubSecrets()`, returned sanitized `sanitizeJsonError(500, 'IMD weather alert ingestion failed.')`. |
| **HIGH** | [ingest-fire-events](file:///c:/Manish/sih1/supabase/functions/ingest-fire-events/index.ts) | Unvalidated `body.bbox` and `body.source` interpolated directly into NASA FIRMS URL alongside `FIRMS_MAP_KEY` (path traversal / key exposure risk); raw errors returned in `status: 500`. | Added strict `validateBbox()` and `ALLOWED_FIRMS_SOURCES` allowlist; validated CSV coordinates; added `AbortSignal.timeout(10_000)`; applied `scrubSecrets()` and `sanitizeJsonError(500, ...)`. |
| **HIGH** | [gemini-assistant](file:///c:/Manish/sih1/supabase/functions/gemini-assistant/index.ts) | `executeTool('get_incident_details')` interpolated Gemini `toolArgs.incident_id` directly into PostgREST `.or(...)`; `history` turns and `session_id` lacked structural validation. | Replaced `.or(...)` with `isValidUuid()` -> `.eq('id', ...)` or alphanumeric-sanitized `.ilike('incident_number', ...)`; validated `history` roles (`user`/`model`) & lengths (`<= 2000`), `session_id` pattern, and `get_incident_timeline` UUID. |
| **MEDIUM** | [_shared/security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts) + all 11 functions | Unbounded `req.json()` allowed oversized payload abuse across functions; shared UUID/BBox/secret-scrubbing utilities were missing. | Added `parseJsonWithLimit()` (`413` on oversized, `400` on malformed/non-object JSON), `isValidUuid()`, `validateBbox()`, `scrubSecrets()`, and applied across all 11 handlers. |
| **MEDIUM** | `analyze-incident`, `analyze-external-event`, `explain-reallocation`, `ingest-earthquakes`, `ingest-weather`, `ingest-alerts`, `monitor-data-providers`, `process-live-events` | Several functions returned raw `error?.message` on `500`, omitted `AbortSignal.timeout(...)` on outbound `fetch()`, or skipped validation of coordinates / UUIDs / `providers` array. | Replaced raw error responses with `sanitizeJsonError(500, ...)`; added timeouts (`8s`–`15s`), coordinate/UUID/provider allowlist checks, and `scrubSecrets()` on diagnostic writes. |

---

## 2. Automated Verification & Scope Distinction (Phase E & Phase F)

| Command / Suite | Result | Exact Counts & Scope |
| :--- | :--- | :--- |
| `npm run lint` (`tsc --noEmit`) | **PASSED** (`exit 0`) | 0 TypeScript errors in `src/`. |
| `npm run build` (`tsc && vite build`) | **PASSED** (`exit 0`) | `2,631` modules transformed (`15.82s`). |
| `npm test` (`vitest run`) | **PASSED** (`exit 0`) | **21/21** test files, **114/114** tests passing (`11.51s`), including **6/6** tests in [phase28_8EdgeFunctionsSecurity.test.ts](file:///c:/Manish/sih1/tests/security/phase28_8EdgeFunctionsSecurity.test.ts). |
| Deno CLI (`Get-Command deno`) | **NOT AVAILABLE** | `deno` binary is not installed in the local Windows environment; live Deno runtime execution & bundle checks were not run locally. |

### Test Scope Clarification
- **Mocked Runtime Unit Tests** ([phase28_8EdgeFunctionsSecurity.test.ts](file:///c:/Manish/sih1/tests/security/phase28_8EdgeFunctionsSecurity.test.ts)): Directly executed exported TypeScript guards from `_shared/security.ts` (`requireAuthenticatedUser`, `parseJsonWithLimit`, `validateCoordinates`, `validateBbox`, `isValidUuid`, `scrubSecrets`, `sanitizeJsonError`) inside Vitest using mocked ESM `@supabase/supabase-js` responses (`missing/invalid/expired JWT`, inactive profiles, `FIELD_RESPONDER` vs `DISPATCHER` vs `ADMIN`, invalid/valid `CRON_SECRET`, malformed/oversized payloads, coordinate/bbox traversal, secret scrubbing).
- **Source Contract Checks:** Verified all 11 `supabase/functions/*/index.ts` files import `parseJsonWithLimit`, avoid undeclared `createClient(`, avoid hardcoded keys, and enforce `validateBbox` / `ALLOWED_FIRMS_SOURCES` / no `.or(...)` interpolation.
- **Not Executed:** Real remote Deno isolate execution (`deno test` / live deployed Supabase Edge Function HTTP calls) requires installing Deno locally or deploying to `itmeoierfppvoaljebco` with secrets configured.

---

## 3. Remaining Blockers & Exact Next Action

### Remaining Blockers Before Live Edge Function Activation
1. **Missing Edge Function Secrets on Supabase Project `itmeoierfppvoaljebco`:** `CRON_SECRET`, `GEMINI_API_KEY`, and `FIRMS_MAP_KEY` must be provisioned by the owner via `supabase secrets set` or Dashboard.
2. **Pending Database Prerequisites:** Confirm Phase 28.5 SQL catalog outputs, apply [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql), and execute [PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md).
3. **Edge Functions Not Yet Deployed:** The 11 updated functions + [config.toml](file:///c:/Manish/sih1/supabase/config.toml) exist locally only; remote deployment awaits owner approval.
4. **Live Deno / Post-Deploy Verification Pending:** Because `deno` is not installed locally and functions are not deployed, live end-to-end HTTP verification (`401`/`403`/`200`/`413`) must run after deployment.

### Exact Next Action
1. Execute [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql) and [PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md) in **Supabase Dashboard → SQL Editor**.
2. Set `CRON_SECRET`, `GEMINI_API_KEY`, and `FIRMS_MAP_KEY` on `itmeoierfppvoaljebco` and deploy all 11 Edge Functions following [PHASE_28_8_EDGE_FUNCTION_DEPLOYMENT_MATRIX.md](file:///c:/Manish/sih1/docs/PHASE_28_8_EDGE_FUNCTION_DEPLOYMENT_MATRIX.md).
