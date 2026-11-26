# RESQAI — PHASE 28.3: CRITICAL SECURITY REMEDIATION REPORT

**Date:** 2026-11-26  
**Project:** `c:\Manish\sih1`  
**Supabase Project Reference:** `itmeoierfppvoaljebco`  
**Scope:** Local remediation of all critical & medium security gaps identified in Phase 28.2 (no remote SQL execution, no Edge Function deployment, no live data changes, Phase 29 not started).

**Final Verdict:** `READY FOR OWNER REVIEW`

---

## 1. Executive Summary

All security defects identified in the Phase 28.2 audit have been remediated locally and verified against the local TypeScript compiler, Vite production bundle, mocked unit/runtime suites, and static SQL/TOML contract checks:

1. **Fixed `SECURITY DEFINER` Trigger Bypass (`current_user` vs `session_user`):** Replaced the broken `current_user IN ('postgres', 'supabase_admin')` check across all protected-column triggers with `auth.role() = 'service_role' OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL)`.
2. **Enforced Strict Column-Level Guards & Responder Unit Ownership:**
   - Added `guard_assignment_protected_columns()` on `public.resource_assignments`.
   - Added `guard_resource_protected_columns()` on `public.resources`.
   - Upgraded `guard_incident_protected_columns()` on `public.incidents` to a strict `to_jsonb(OLD) || jsonb_build_object('status', ..., 'resolved_at', ..., 'updated_at', ...)` allowlist.
3. **Hardened `SECURITY DEFINER` Functions & SQL Privileges:** Added `SET search_path = ''`, explicit `public.` qualification, function `REVOKE`/`GRANT`, table/sequence/schema `REVOKE`/`GRANT`, and `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public` in migration `022`.
4. **Aligned Edge Gateway & Timing-Safe Secret Verification:** Added [supabase/config.toml](file:///c:/Manish/sih1/supabase/config.toml) setting `verify_jwt = true` for interactive AI functions and `verify_jwt = false` for the 8 cron/service-capable functions; replaced string-length-dependent comparison with fixed 32-byte SHA-256 digest comparison (`timingSafeEqualSecret`) in [supabase/functions/_shared/security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts).
5. **Closed Service-Layer Auth Gap:** Added `await assertAuthorizedActor('FIELD_STATUS_UPDATE', 'updateResourceLocation')` and finite GPS bounds validation in [src/services/resources.ts](file:///c:/Manish/sih1/src/services/resources.ts).
6. **Hardened First `ADMIN` Bootstrap Runbook:** Updated [docs/PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md) to resolve `email` from verified non-deleted `auth.users` rows and record `audit_logs.user_id = NULL` with `actor_session_user: session_user`.

---

## 2. Modified & Created Files

| Artifact | Purpose of Change |
| :--- | :--- |
| [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) | Fixed `current_user` bypass in `guard_profile_privilege_columns()`; added strict JSONB incident allowlist, `guard_resource_protected_columns()`, `guard_assignment_protected_columns()`; hardened all 5 RBAC helpers with `SET search_path = ''` and `REVOKE`/`GRANT`; added Section 14 SQL `REVOKE`/`GRANT` & `ALTER DEFAULT PRIVILEGES`. |
| [config.toml](file:///c:/Manish/sih1/supabase/config.toml) | Created Supabase gateway configuration (`project_id = "itmeoierfppvoaljebco"`) setting `verify_jwt = true` on `analyze-incident`, `explain-reallocation`, `gemini-assistant` and `verify_jwt = false` on the 8 scheduled/internal functions. |
| [security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts) | Replaced `timingSafeEqualString` with `timingSafeEqualSecret()` using `crypto.subtle.digest('SHA-256', ...)` constant-time 32-byte comparison. |
| [resources.ts](file:///c:/Manish/sih1/src/services/resources.ts) | Added `assertAuthorizedActor('FIELD_STATUS_UPDATE', 'updateResourceLocation')` and finite coordinate checks (`[-90, 90]`, `[-180, 180]`) in `updateResourceLocation()`. |
| [PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md) | Updated Section 4 Step 3 First `ADMIN` Bootstrap SQL to validate `auth.users` (`email_confirmed_at IS NOT NULL AND deleted_at IS NULL`) and log `user_id = NULL` with `actor_session_user`. |
| [phase28_3Remediation.test.ts](file:///c:/Manish/sih1/tests/security/phase28_3Remediation.test.ts) | Added 12 targeted tests covering all Phase 28.3 remediations (SQL contracts, mocked services, Edge runtime with mocked ESM Supabase client & `Deno.env`, `config.toml`, bootstrap SQL). |
| [PHASE_28_3_SECURITY_REMEDIATION_REPORT.md](file:///c:/Manish/sih1/docs/PHASE_28_3_SECURITY_REMEDIATION_REPORT.md) | This remediation report. |

---

## 3. Root Cause Fix: `guard_profile_privilege_columns()` (`current_user` vs `session_user`)

Inside a PostgreSQL `SECURITY DEFINER` function owned by `postgres`, `current_user` evaluates to `'postgres'` for **every** invocation—including HTTP requests routed through PostgREST as `authenticated`. As a result, checking `current_user IN ('postgres', 'supabase_admin')` bypassed role/active-status protection completely.

All four column-guard triggers in [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) now use:

```sql
IF auth.role() = 'service_role'
   OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
  RETURN NEW;
END IF;
```

- **PostgREST `authenticated` requests:** `session_user` is `'authenticator'` and `auth.uid()` is non-null, so the bypass **never** fires for `FIELD_RESPONDER`, `DISPATCHER`, or even `ADMIN` (unless `public.is_admin()` passes for `guard_profile_privilege_columns()`, which also logs `ROLE_CHANGED` to `public.audit_logs`).
- **Supabase SQL Editor / migrations:** `session_user` is `'postgres'` or `'supabase_admin'` and `auth.uid()` is `NULL`, permitting trusted administrative SQL Editor bootstrap.
- **Trusted server jobs / Edge Functions using `service_role`:** `auth.role() = 'service_role'` permits controlled service operations.

---

## 4. Column-Level Trigger Enforcement Summary (`022`)

| Trigger / Function | Protected Table | Non-Dispatcher / Non-Admin Enforcement |
| :--- | :--- | :--- |
| `guard_profile_privilege_columns()` | `public.profiles` | Blocks changes to `role` and `is_active` unless `public.is_admin()`; writes `ROLE_CHANGED` audit record. |
| `guard_incident_protected_columns()` | `public.incidents` | Strict JSONB allowlist (`to_jsonb(OLD) \|\| jsonb_build_object('status', NEW.status, 'resolved_at', NEW.resolved_at, 'updated_at', NEW.updated_at)`). Paired with RLS `UPDATE` ownership check `public.is_responder_assigned_to_incident(id)`. |
| `guard_resource_protected_columns()` | `public.resources` | Requires `OLD.assigned_user_id = auth.uid()`; blocks edits to `id`, `resource_code`, `name`, `resource_type`, `capability`, `capacity`, `department_id`, `station_name`, `is_active`, `assigned_user_id`, `created_at`; requires any non-null changed `current_assignment_id` to match an active `'ACCEPTED' \| 'DISPATCHED' \| 'IN_PROGRESS'` row in `public.resource_assignments` for `OLD.id`. |
| `guard_assignment_protected_columns()` | `public.resource_assignments` | Requires `public.resources.assigned_user_id = auth.uid()` for `OLD.resource_id`; freezes `id`, `incident_id`, `resource_id`, `recommended_at`, `distance_km`, `estimated_response_minutes`, `allocation_score`, `recommendation_reason`, `assigned_by`, `created_at`; blocks setting `'CANCELLED'`, `'REJECTED'`, `'RECOMMENDED'`; permits only valid forward responder transitions (`RECOMMENDED -> ACCEPTED\|DISPATCHED`, `ACCEPTED -> DISPATCHED\|IN_PROGRESS`, `DISPATCHED -> IN_PROGRESS\|COMPLETED`, `IN_PROGRESS -> COMPLETED`). |

All five RBAC helper functions (`get_auth_user_role()`, `is_admin()`, `is_dispatcher_or_admin()`, `is_field_responder()`, `is_responder_assigned_to_incident(UUID)`) specify `SECURITY DEFINER`, `SET search_path = ''`, explicit `public.` table references, `REVOKE ALL ... FROM PUBLIC, anon`, and `GRANT EXECUTE ... TO authenticated, service_role`. Trigger functions revoke `EXECUTE` from `PUBLIC, anon, authenticated` and grant only to `service_role`.

---

## 5. Table-by-Table SQL Grant + RLS Permission Matrix (`022` Section 14)

Because PostgREST maps `ADMIN`, `DISPATCHER`, and `FIELD_RESPONDER` sessions onto the shared PostgreSQL role `authenticated`, SQL `REVOKE`/`GRANT` locks down `PUBLIC`/`anon`, enforces table-wide mutability boundaries on `authenticated`, and pairs with RLS policies + `BEFORE UPDATE` triggers for per-role enforcement:

| Table Group | `PUBLIC` / `anon` | `authenticated` SQL Grants | `service_role` | Effective Per-Role Control |
| :--- | :--- | :--- | :--- | :--- |
| `audit_logs`, `incident_updates` | None | `SELECT, INSERT` (no `UPDATE`/`DELETE`) | `ALL` | Append-only; `audit_logs` select restricted to `ADMIN`; `incident_updates` scoped to dispatchers/assigned responders. |
| `external_ingestion_logs`, `provider_health`, `ai_event_timeline` | None | `SELECT` only | `ALL` | Service-owned ingestion telemetry; client writes rejected at SQL grant layer. |
| `external_events` | None | `SELECT, UPDATE` | `ALL` | Edge Functions ingest via `service_role`; `ADMIN`/`DISPATCHER` read & link `incident_id`. |
| `weather_observations`, `incident_ai_analysis` | None | `SELECT, INSERT` | `ALL` | Read + `DISPATCHER`/`ADMIN` triage inserts (no `UPDATE`/`DELETE`). |
| `notifications` | None | `SELECT, INSERT, UPDATE` | `ALL` | User-scoped read/acknowledge; no `DELETE`. |
| Operational & RBAC tables (`profiles`, `departments`, `locations`, `hospitals`, `incidents`, `resources`, `resource_assignments`, `reallocation_*`, `environmental_alerts`, `simulation_*`, `analytics_results`, `ai_assistant_conversations`) | None | `SELECT, INSERT, UPDATE, DELETE` | `ALL` | Enforced by table RLS policies (`is_admin()`, `is_dispatcher_or_admin()`, `assigned_user_id = auth.uid()`, `user_id = auth.uid()`) plus the 4 `guard_*` triggers. |
| Future objects created by `postgres` (`14D`) | None (`ALTER DEFAULT PRIVILEGES`) | None (`ALTER DEFAULT PRIVILEGES`) | `ALL` | Fail-closed defaults for future migrations. |

Schema & sequence locks: `REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;`, `REVOKE USAGE ON SCHEMA public FROM anon;`, `GRANT USAGE ON SCHEMA public TO authenticated, service_role;`, `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;`, `GRANT USAGE, SELECT ON SEQUENCE public.incident_number_seq TO authenticated, service_role;`.

---

## 6. Edge Function Gateway (`supabase/config.toml`) & `_shared/security.ts`

- **`supabase/config.toml`** sets `project_id = "itmeoierfppvoaljebco"`:
  - `verify_jwt = true` (**Interactive human JWT required at gateway; `allowServiceOrCron` not enabled**):
    - `analyze-incident`
    - `explain-reallocation`
    - `gemini-assistant`
  - `verify_jwt = false` (**Gateway allows machine/cron requests through to `requireAuthenticatedUser(..., { allowServiceOrCron: true })`**):
    - `analyze-external-event`
    - `ingest-earthquakes`
    - `ingest-fire-events`
    - `ingest-imd-alerts`
    - `ingest-weather`
    - `ingest-alerts`
    - `monitor-data-providers`
    - `process-live-events`
- **`timingSafeEqualSecret(a, b)`** hashes both strings via `crypto.subtle.digest('SHA-256', ...)` and XOR-folds all 32 bytes so mismatched secret lengths do not leak timing information and empty inputs return `false`.

---

## 7. Automated Verification Results & Test Scope Boundaries

All automated checks were run cleanly after the final edit:

| Check Command | Result | Scope & Exact Counts |
| :--- | :--- | :--- |
| `npm run lint` (`tsc --noEmit`) | **PASSED** (`exit 0`) | 0 TypeScript errors across `src/`. |
| `npm run build` (`tsc && vite build`) | **PASSED** (`exit 0`) | `2,631` modules transformed in `11.98s`; clean production bundle in `dist/`. |
| `npm test` (`vitest run`) | **PASSED** (`exit 0`) | **19/19** test files, **104/104** tests passing (`9.58s`), including **12/12** new tests in [phase28_3Remediation.test.ts](file:///c:/Manish/sih1/tests/security/phase28_3Remediation.test.ts). |

### Test Scope Clarification (No Overclaiming)
- **Mocked Service Unit Tests** (Tests 7–8 in `phase28_3Remediation.test.ts` + `rbacAndSecurity.test.ts`): Executed against mocked `src/services/supabase` client sessions (`FIELD_RESPONDER`, `DISPATCHER`, `ADMIN`, unauthenticated); verified `assertAuthorizedActor` + GPS validation on `updateResourceLocation()` and role continuity across `createIncident`, `confirmDispatch`, `updateResourceStatus`, `updateUserRoleAsAdmin`.
- **Mocked Edge Runtime Tests** (Tests 9–10): Executed `timingSafeEqualSecret()` and `requireAuthenticatedUser()` directly in Vitest with mocked `https://esm.sh/@supabase/supabase-js@2.39.8` and stubbed `Deno.env`; `deno` binary is not installed in the local Windows environment.
- **Static SQL / Config / Runbook Contract Tests** (Tests 1–6, 11–12): Parsed local files (`022_rbac_security_rls_hardening.sql`, `supabase/config.toml`, `supabase/functions/*/index.ts`, `docs/PHASE_28_1_DEPLOYMENT_AUDIT.md`) to assert exact SQL constructs, trigger clauses, `REVOKE`/`GRANT` rules, `verify_jwt` alignment, and bootstrap audit logic.
- **Remote PostgreSQL / Live Supabase:** Migrations `021` and `022`, `supabase/config.toml`, and updated Edge Functions have **not** been executed or deployed remotely yet; live PostgreSQL trigger execution (`session_user` / `to_jsonb` / RLS across real PostgREST JWTs) remains to be verified post-deployment by the owner.

---

## 8. Remaining Pre-Deploy & Operational Risks

1. **Pending Remote Deployment:** Remote project `itmeoierfppvoaljebco` is still running pre-`021`/`022` SQL and previously deployed Edge Functions until the owner executes the deployment steps below.
2. **Existing Schema Compatibility (`to_jsonb` in `guard_incident_protected_columns`):** Because `to_jsonb(NEW) IS DISTINCT FROM v_allowed` rejects any change outside `status`, `resolved_at`, and `updated_at`, any future non-dispatcher trigger or `FIELD_RESPONDER` workflow updating another column on `incidents` will fail unless explicitly added to the allowlist or performed by `DISPATCHER`/`ADMIN`/`service_role`.
3. **Responder Unit Assignment Prerequisite:** `FIELD_RESPONDER` accounts can read/update only `public.resources` rows where `assigned_user_id = auth.uid()` and assignments linked to those units; admins/dispatchers must assign `assigned_user_id` before field responder login testing.
4. **Per-Isolate Rate Limiter:** `checkRateLimit()` in `_shared/security.ts` remains per-Deno-isolate memory; sustained multi-region abuse requires edge WAF/API gateway rate limiting.

---

## 9. Ordered Owner Deployment Steps

1. Run read-only SQL prechecks from [PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md) Section 6 in Supabase Dashboard SQL Editor.
2. Execute [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) in Supabase Dashboard SQL Editor.
3. Execute [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) in Supabase Dashboard SQL Editor.
4. Configure Edge Function secrets (`CRON_SECRET`, `GEMINI_API_KEY`, `FIRMS_MAP_KEY`) via Supabase CLI or Dashboard.
5. Deploy all 11 Edge Functions (`supabase functions deploy <name> --project-ref itmeoierfppvoaljebco`) using [supabase/config.toml](file:///c:/Manish/sih1/supabase/config.toml).
6. Run the hardened First `ADMIN` Bootstrap SQL from [PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md) Section 4 Step 3 with your verified `auth.users` UUID.
7. Run live multi-role smoke tests against `itmeoierfppvoaljebco` covering `anon` rejection, `FIELD_RESPONDER` trigger enforcement (self-role change blocked, unprotected column edit blocked, valid unit GPS/status update allowed), `DISPATCHER` dispatch/reallocation, `ADMIN` role promotion (`ROLE_CHANGED` audit entry), and `x-cron-secret` scheduling.
