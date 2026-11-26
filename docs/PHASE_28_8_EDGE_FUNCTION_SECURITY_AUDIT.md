# RESQAI — PHASE 28.8: EDGE FUNCTION SECURITY AUDIT

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco`  
**Scope:** Complete security audit and classification of all 11 Supabase Edge Functions and shared middleware ([security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts), [config.toml](file:///c:/Manish/sih1/supabase/config.toml)). No remote deployment or remote SQL was executed.

---

## 1. Classification Summary (Phase B)

| Classification | Count | Functions | Gateway `verify_jwt` | Handler Auth Policy |
| :--- | :---: | :--- | :---: | :--- |
| `INTERACTIVE_AUTHENTICATED` | 3 | `analyze-incident`, `explain-reallocation`, `gemini-assistant` | `true` | `requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER'])` — **strictly human Bearer JWT + active profile** (`allowServiceOrCron` omitted/`false`). |
| `HYBRID` | 8 | `analyze-external-event`, `ingest-earthquakes`, `ingest-fire-events`, `ingest-imd-alerts`, `ingest-weather`, `ingest-alerts`, `monitor-data-providers`, `process-live-events` | `false` | `requireAuthenticatedUser(req, allowedRoles, { allowServiceOrCron: true })` — **independently validates Bearer JWT + active profile + role, OR constant-time `x-cron-secret` (`CRON_SECRET`), OR constant-time `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`**. |
| `SCHEDULED_CRON` (pure) | 0 | — | — | *(All 8 background functions also support authenticated operator UI triggers in `src/services/`, making them `HYBRID` rather than cron-only.)* |
| `INTERNAL_SERVICE` (pure) | 0 | — | — | *(Even `analyze-external-event` and `ingest-alerts` enforce explicit `ADMIN`/`DISPATCHER` or machine secret checks.)* |

> **Gateway vs Handler Principle:** `verify_jwt = false` in [config.toml](file:///c:/Manish/sih1/supabase/config.toml) is used solely so Supabase's gateway passes `pg_cron` (`x-cron-secret`) and internal `service_role` calls through to `_shared/security.ts`. Every `verify_jwt = false` handler independently authenticates callers via `requireAuthenticatedUser(..., { allowServiceOrCron: true })` before any DB read, external HTTP call, or DB mutation.

---

## 2. Shared Security Middleware Audit (`_shared/security.ts`)

| Control | Implementation | Limitations / Notes |
| :--- | :--- | :--- |
| **Token & Profile Verification** | `requireAuthenticatedUser()` calls `authClient.auth.getUser(token)` then queries `public.profiles` (`role`, `is_active`) via `service_role`; rejects inactive/missing profiles (`403`) and unauthorized roles (`403`). | Relies on `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` present in Deno runtime env. |
| **Constant-Time Secret Compare** | `timingSafeEqualSecret()` hashes both inputs via SHA-256 (`crypto.subtle.digest`) and XOR-folds all 32 bytes; prevents secret-length timing leaks and rejects empty strings. | Requires non-empty `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` secrets to be configured remotely. |
| **Payload Size & JSON Bounds** | `parseJsonWithLimit()` checks `Content-Length` and UTF-8 byte size, returning `413` on oversized requests and `400` on malformed/non-object JSON. | Protects against oversized payload stuffing. |
| **Coordinate, BBox & UUID Validation** | `validateCoordinates()`, `validateBbox()`, `isValidUuid()` enforce finite geographic bounds and strict identifier patterns. | Prevents path traversal and PostgREST filter injection. |
| **Secret Scrubbing & Error Masking** | `scrubSecrets()` strips `?key=`, `/api/area/csv/<key>`, `Bearer <token>`, `sb_secret_*`, `AIza*`; `sanitizeJsonError()` strips stack/internal details. | Safe for external HTTP responses and DB telemetry fields. |
| **Rate Limiting** | `checkRateLimit()` tracks request counts per `function:userId` in a per-isolate `Map`. | **Limitation:** Per-isolate memory resets on cold starts and is not shared across distributed edge regions. Never relied on as the sole security boundary (authentication & RBAC always execute first). |
| **CORS** | `corsHeaders` allows `authorization, x-client-info, apikey, x-cron-secret, content-type` with `Access-Control-Allow-Origin: *`. | Security relies on Bearer JWT / `CRON_SECRET` headers, not ambient cookies. |

---

## 3. Function-by-Function Security Audit (Phase A)

### Legend for Common Questions
- **Q1 (Gateway `verify_jwt`)**: `true` for the 3 `INTERACTIVE_AUTHENTICATED` functions; `false` for the 8 `HYBRID` functions.
- **Q2 (Independent handler auth)**: `Yes` via `requireAuthenticatedUser()` on all 11 functions.
- **Q3 (Active profile & role validated)**: `Yes` (`is_active !== false` + role allowlist) for all JWT callers.
- **Q4 (Unauthenticated privileged ops blocked?)**: `Yes` (`HTTP 401` before any DB/upstream call).
- **Q5 (`FIELD_RESPONDER` blocked from dispatcher ops?)**: `Yes` (`HTTP 403`) on 10 functions; permitted **only** on `ingest-weather` (`['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']`) for weather telemetry lookup.
- **Q7 (Secrets exclusively via `Deno.env.get`)**: `Yes` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`).
- **Q9 (Rate limiting)**: `checkRateLimit()` enforced after auth; per-isolate only (supplemented by gateway/auth gating).
- **Q10 (Scheduled cron safety)**: `No` (`INTERACTIVE_AUTHENTICATED`) for Group A; `Yes` (`HYBRID` with `CRON_SECRET` + `SERVICE_ROLE`) for Group B/C.

| # | Function | Class | Q1 `verify_jwt` | Allowed Roles / Machine Auth | Q6 Input & Query Safety (Post-Remediation) | Q8 Error Sanitization (Post-Remediation) |
| :-: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | [analyze-incident](file:///c:/Manish/sih1/supabase/functions/analyze-incident/index.ts) | `INTERACTIVE_AUTHENTICATED` | `true` | `ADMIN`, `DISPATCHER` | `parseJsonWithLimit(64KB)`, non-empty `title <= 300`, optional `validateCoordinates`, Gemini `15s` timeout. Advisory only (never picks vehicle IDs). | Sanitized (`sanitizeJsonError(500, 'AI incident analysis failed.')`). |
| 2 | [explain-reallocation](file:///c:/Manish/sih1/supabase/functions/explain-reallocation/index.ts) | `INTERACTIVE_AUTHENTICATED` | `true` | `ADMIN`, `DISPATCHER` | `parseJsonWithLimit(64KB)`, `triggerIncident.title` validated (`<= 300`), Gemini `15s` timeout. Explanation only; human confirmation required. | Sanitized (deterministic fallback JSON on upstream failure; HTTP status only logged). |
| 3 | [gemini-assistant](file:///c:/Manish/sih1/supabase/functions/gemini-assistant/index.ts) | `INTERACTIVE_AUTHENTICATED` | `true` | `ADMIN`, `DISPATCHER` | `parseJsonWithLimit(64KB)`, `message` `1..4000`, sanitized `history` (`user`/`model` <= 2000 chars), validated `session_id`; `.or(...)` injection removed (`isValidUuid` / alphanumeric `.ilike()`). Read-only tools only. | Sanitized (`'Assistant request could not be processed.'`). |
| 4 | [analyze-external-event](file:///c:/Manish/sih1/supabase/functions/analyze-external-event/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(64KB)`, `isValidUuid(external_event_id)`, `validateCoordinates` on inline event, Gemini `15s` timeout. Advisory triage (`incident_ai_analysis` upsert via `service_role`). | Sanitized (`sanitizeJsonError(500, 'External event AI analysis failed.')`). |
| 5 | [ingest-earthquakes](file:///c:/Manish/sih1/supabase/functions/ingest-earthquakes/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | Fixed upstream USGS URL (`https://earthquake.usgs.gov/...`), `parseJsonWithLimit(16KB)`, `validateCoordinates` on GeoJSON coords, `10s` timeout. | Sanitized (`sanitizeJsonError(500, 'USGS earthquake ingestion failed.')`). |
| 6 | [ingest-fire-events](file:///c:/Manish/sih1/supabase/functions/ingest-fire-events/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, `validateBbox()` blocks path traversal/query injection into FIRMS URL, `ALLOWED_FIRMS_SOURCES` allowlist, `validateCoordinates` on CSV rows, `10s` timeout. | Scrubbed via `scrubSecrets()`, `FIRMS_MAP_KEY` redacted in logs, sanitized 500 JSON error. |
| 7 | [ingest-imd-alerts](file:///c:/Manish/sih1/supabase/functions/ingest-imd-alerts/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, `validateCoordinates`, bounded `district`/`state` (`<= 100`), `5s–6s` timeouts. Removed undeclared `createClient` & hardcoded URL fallback. | Scrubbed DB error log via `scrubSecrets()`, sanitized 500 response (`sanitizeJsonError`). |
| 8 | [ingest-weather](file:///c:/Manish/sih1/supabase/functions/ingest-weather/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `FIELD_RESPONDER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, `validateCoordinates`, bounded `locationName`, `8s` timeout. Read-only fetch + normalized return (no DB writes). | Sanitized (`sanitizeJsonError(500, 'Weather ingestion failed.')`). |
| 9 | [ingest-alerts](file:///c:/Manish/sih1/supabase/functions/ingest-alerts/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, `validateCoordinates`, bounded `zone` (`<= 150`). | Sanitized (`sanitizeJsonError(500, 'Alert ingestion failed.')`). |
| 10 | [monitor-data-providers](file:///c:/Manish/sih1/supabase/functions/monitor-data-providers/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, `providers` allowlisted to 5 known keys, `validateCoordinates`, `validateBbox`, propagates internal `service_role` calls cleanly. | `scrubSecrets()` applied on caught diagnostics before `provider_health` storage/response. |
| 11 | [process-live-events](file:///c:/Manish/sih1/supabase/functions/process-live-events/index.ts) | `HYBRID` | `false` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `parseJsonWithLimit(16KB)`, validates event/incident coordinates before Haversine distance match; only creates timeline/notes (never auto-dispatches or overrides human approval). | Sanitized (`sanitizeJsonError(500, 'Live event processing failed.')`). |

---

## 4. Decision-Support & Human-In-The-Loop Integrity

Across `analyze-incident`, `analyze-external-event`, `explain-reallocation`, `gemini-assistant`, and `process-live-events`:
- Gemini prompts explicitly forbid selecting concrete resource codes (`AMB-01`, etc.), approving dispatches, or altering assignments.
- `gemini-assistant` exposes strictly read-only database tools (`SELECT` only).
- Dispatch confirmation (`confirmDispatch`) and dynamic reallocation (`confirmReallocation`) remain strictly gated behind authenticated `ADMIN`/`DISPATCHER` human approval.
