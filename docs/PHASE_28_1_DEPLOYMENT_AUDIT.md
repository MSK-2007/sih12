# RESQAI — PHASE 28.1: PRODUCTION SECURITY DEPLOYMENT AUDIT & RUNBOOK

**Date:** 2026-11-26  
**Target Project:** `resqai` (`itmeoierfppvoaljebco`, PostgreSQL `17.6.1.155`)  
**Status:** **PREPARED FOR OWNER EXECUTION — NO REMOTE SQL EXECUTED OR EDGE FUNCTIONS DEPLOYED IN PHASE 28.1**

> **Honesty Boundary:** ResQAI cloud security is **not** production-active until migrations `021` and `022` are executed in the Supabase SQL Editor, all 11 updated Edge Functions (with `_shared/security.ts`) are deployed, the first `ADMIN` profile is bootstrapped, and live multi-role tests pass remotely.

---

## 1. Migration `021` Audit ([021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql))

| Check | Audit Finding |
| :--- | :--- |
| **Existing duplicate active assignments** | Remote `resource_assignments` currently has `0` rows (verified Phase 27). Run Precheck `1A` below before execution anyway; if rows exist later, deduplicate before creating the partial unique index. |
| **Partial unique index statuses** | `uk_resource_single_active_assignment` indexes `(resource_id) WHERE assignment_status IN ('RECOMMENDED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS')`. Matches active states in [assignment.ts](file:///c:/Manish/sih1/src/types/assignment.ts) while permitting unlimited historical `COMPLETED`, `CANCELLED`, and `REJECTED` rows per unit. |
| **Incident transition trigger vs app** | `enforce_incident_status_transition()` (`BEFORE UPDATE OF status ON public.incidents`) matches `ALLOWED_STATUS_TRANSITIONS` in [incident.ts](file:///c:/Manish/sih1/src/types/incident.ts) 1:1 (`REPORTED -> ANALYSING/CLOSED`, `ANALYSING -> PRIORITIZED/CLOSED`, `PRIORITIZED -> AWAITING_DISPATCH/CLOSED`, `AWAITING_DISPATCH -> DISPATCHED/CLOSED`, `DISPATCHED -> IN_PROGRESS/CLOSED`, `IN_PROGRESS -> RESOLVED/CLOSED`, `RESOLVED -> CLOSED`, `CLOSED -> []`). Auto-populates `resolved_at` on `RESOLVED`. |
| **Resource transition trigger vs app** | `enforce_resource_status_transition()` (`BEFORE UPDATE OF status ON public.resources`) matches `ALLOWED_RESOURCE_STATUS_TRANSITIONS` in [resource.ts](file:///c:/Manish/sih1/src/types/resource.ts) 1:1 (`AVAILABLE -> ASSIGNED/BUSY/OFFLINE`, `ASSIGNED -> BUSY/AVAILABLE/OFFLINE`, `BUSY -> AVAILABLE/OFFLINE`, `OFFLINE -> AVAILABLE`), and clears `NEW.current_assignment_id := NULL` on return to `AVAILABLE`. |
| **Workflow compatibility (Dispatch / Complete / Cancel / Reallocate)** | Dispatch (`AVAILABLE -> ASSIGNED`), active field work (`ASSIGNED -> BUSY`), completion/cancellation (`BUSY`/`ASSIGNED -> AVAILABLE`), and reallocation (donor assignment set `CANCELLED` -> unit transitions `ASSIGNED -> AVAILABLE` -> new assignment inserted -> unit transitions `AVAILABLE -> ASSIGNED`) all follow valid trigger edges without violating `uk_resource_single_active_assignment`. Multi-unit dispatch on an already `DISPATCHED` incident updates `incident_updates` only without changing incident status. |
| **Recursive trigger safety** | Both trigger functions only inspect `OLD.*` / `NEW.*` and assign `NEW.*` fields in-memory (`BEFORE UPDATE`). They issue zero secondary `UPDATE` SQL statements; `004_relationships.sql` `update_updated_at_column()` runs cleanly alongside them with zero recursion risk. |
| **Historical record preservation** | No `DELETE`, `TRUNCATE`, or `UPDATE` on existing rows. |
| **RLS / grant interference** | Trigger functions run cleanly with table `UPDATE` execution; ensure `021` runs before or with `022`. |

---

## 2. Migration `022` Audit ([022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql))

### 2.1 Security Fixes Found & Applied During Phase 28.1 Audit
1. **`guard_profile_privilege_columns()` condition tightened:** Removed `OR auth.uid() IS NULL` so admin bypass applies only when `current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role'`.
2. **Incident protected-column trigger added (`guard_incident_protected_columns()`):** Prevents assigned `FIELD_RESPONDER` users from altering `priority_score`, `priority_level`, `severity`, `environmental_risk_score`, `incident_number`, `reported_by`, `created_by`, or `source_type` while still permitting operational status progression on assigned incidents.
3. **Hardened `audit_logs` `INSERT` policy:** Replaced `(user_id IS NULL OR user_id = auth.uid())` with strict `user_id = auth.uid()` AND restricted client insertion of privileged actions (`ROLE_CHANGED`, `ADMIN_ACTION`, `DISPATCH_CONFIRMED`, `REALLOCATION_APPROVED`, `REALLOCATION_REJECTED`) to `is_admin()` / `is_dispatcher_or_admin()`.

### 2.2 `SECURITY DEFINER` Helper Review
- Functions: `get_auth_user_role()`, `is_admin()`, `is_dispatcher_or_admin()`, `is_field_responder()`, `is_responder_assigned_to_incident(uuid)`.
- **Search path safety:** All five explicitly specify `SET search_path = public` (preventing search-path hijacking).
- **Recursive RLS check:** In Supabase SQL Editor execution (`postgres` owner), `SECURITY DEFINER` functions run with table-owner privileges that bypass RLS on `public.profiles`, `public.resources`, and `public.resource_assignments` unless `FORCE ROW LEVEL SECURITY` is enabled (it is **not** enabled). Therefore, `"Authenticated select own or operator profiles"` calling `public.is_dispatcher_or_admin()` will **not** recurse infinitely.
- **Boundary condition:** Never alter these functions' owner away from `postgres` or enable `FORCE ROW LEVEL SECURITY` on `profiles`, `resources`, or `resource_assignments`.

---

## 3. Table-by-Table Permission Matrix (`022_rbac_security_rls_hardening.sql`)

`anon` (unauthenticated) has **NO** `SELECT`, `INSERT`, `UPDATE`, or `DELETE` access on any table below once `022` is applied.

| Table | `SELECT` | `INSERT` | `UPDATE` | `DELETE` | `FIELD_RESPONDER` Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | Own (`auth.uid() = id`) or `DISPATCHER`/`ADMIN` | `ADMIN` / auth trigger (`service_role`) | Own non-privilege columns (`guard_profile_privilege_columns` blocks `role`/`is_active` change); `ADMIN` all + audit | `ADMIN` | Own profile only; cannot change `role` or `is_active` |
| `departments` | All `authenticated` | `ADMIN` | `ADMIN` | `ADMIN` | Read-only |
| `locations` | All `authenticated` | `ADMIN` | `ADMIN` | `ADMIN` | Read-only |
| `hospitals` | All `authenticated` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | Read-only |
| `incidents` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` only if `reported_by = auth.uid()` OR assigned via `is_responder_assigned_to_incident(id)` | `DISPATCHER`, `ADMIN` | `DISPATCHER`/`ADMIN` all; `FIELD_RESPONDER` assigned incidents only (blocked from changing priority/score/ownership by trigger) | `ADMIN` | Assigned/reported incidents only; status updates only |
| `incident_updates` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` for assigned incidents only | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` for assigned incidents only | Denied (immutable timeline) | Denied | Assigned incidents only |
| `resources` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` only where `assigned_user_id = auth.uid()` | `DISPATCHER`, `ADMIN` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` only where `assigned_user_id = auth.uid()` | `ADMIN` | Own assigned unit (`assigned_user_id = auth.uid()`) only |
| `resource_assignments` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` only for own unit (`r.assigned_user_id = auth.uid()`) | `DISPATCHER`, `ADMIN` | `DISPATCHER`/`ADMIN`; `FIELD_RESPONDER` only for own unit | `ADMIN` | Own unit's assignments only |
| `notifications` | Own (`user_id = auth.uid()`) or broadcast (`user_id IS NULL AND is_dispatcher_or_admin()`) | `DISPATCHER`, `ADMIN` | Own (`user_id = auth.uid()`) or `DISPATCHER`/`ADMIN` for role-null alerts | Denied | Own notifications only |
| `audit_logs` | `ADMIN` only | `authenticated` with `user_id = auth.uid()` and role-validated `action` | **Denied (Immutable)** | **Denied (Immutable)** | Append-only own non-privileged logs; cannot read or forge admin/dispatch actions |
| `reallocation_audit_logs` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | **Denied** |
| `reallocation_events` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | **Denied** |
| `environmental_alerts` | All `authenticated` | `DISPATCHER`, `ADMIN` (+ `service_role`) | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | Read-only |
| `external_events` | All `authenticated` | `service_role` only (Edge Functions) | `DISPATCHER`, `ADMIN` | `service_role` | Read-only |
| `external_ingestion_logs` | `DISPATCHER`, `ADMIN` | `service_role` only | `service_role` | `service_role` | **Denied** |
| `weather_observations` | All `authenticated` | `DISPATCHER`, `ADMIN` (+ `service_role`) | `service_role` | `service_role` | Read-only |
| `incident_ai_analysis` | All `authenticated` | `DISPATCHER`, `ADMIN` (+ `service_role`) | `service_role` | `service_role` | Read-only |
| `provider_health` | All `authenticated` | `service_role` only | `service_role` | `service_role` | Read-only |
| `ai_event_timeline` | All `authenticated` | `service_role` only | `service_role` | `service_role` | Read-only |
| `ai_assistant_conversations` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` (+ `service_role`) | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | **Denied** |
| `simulation_runs`, `simulation_events`, `simulation_incidents`, `simulation_results`, `analytics_results` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | `DISPATCHER`, `ADMIN` | **Denied** |
| `storage.objects` (`resqai-*` buckets) | All `authenticated` (`bucket_id LIKE 'resqai-%'`) | `DISPATCHER`, `ADMIN` | `service_role` | `ADMIN` | Read-only (`resqai-*`) |

---

## 4. First `ADMIN` Bootstrap Procedure (No Self-Registration Bypass)

Because remote `public.profiles` currently has `0` rows and `020`/`022` block client self-registration as `ADMIN`:

1. **Create / Verify Auth User in Supabase Dashboard:**
   - Open **Supabase Dashboard → Authentication → Users → Add user** (or have the designated administrator sign up via UI so they receive `FIELD_RESPONDER` via `handle_new_user()`, confirming their email).
   - Copy their exact `id` (UUID) from `auth.users`.
2. **Precheck `auth.users` & `profiles` in SQL Editor:**
   ```sql
   SELECT id, email, email_confirmed_at, created_at
   FROM auth.users
   ORDER BY created_at DESC
   LIMIT 10;

   SELECT id, email, role, is_active FROM public.profiles;
   ```
3. **Provision First `ADMIN` Safely in SQL Editor (runs as `postgres`, preserving trigger integrity without weakening RLS or exposing `service_role`):**
   Replace ONLY `<VERIFIED_ADMIN_USER_UUID>` below. Email, confirmation status, and non-deleted status are verified directly from `auth.users`, and the audit trail attributes the action accurately to `session_user` (with `user_id = NULL` rather than attributing the SQL Editor operator's action to the promoted user):
   ```sql
   DO $$
   DECLARE
     v_admin_id UUID := '<VERIFIED_ADMIN_USER_UUID>'::uuid;
     v_email TEXT;
     v_prev_role TEXT;
   BEGIN
     SELECT email INTO v_email
     FROM auth.users
     WHERE id = v_admin_id
       AND email_confirmed_at IS NOT NULL
       AND deleted_at IS NULL;

     IF v_email IS NULL THEN
       RAISE EXCEPTION 'Verified non-deleted auth.users account not found for UUID %', v_admin_id;
     END IF;

     SELECT role::text INTO v_prev_role FROM public.profiles WHERE id = v_admin_id;

     INSERT INTO public.profiles (id, full_name, email, role, is_active)
     VALUES (v_admin_id, 'ResQAI System Administrator', v_email, 'ADMIN'::public.user_role, TRUE)
     ON CONFLICT (id) DO UPDATE
     SET email = EXCLUDED.email,
         role = 'ADMIN'::public.user_role,
         is_active = TRUE,
         updated_at = NOW();

     INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
     VALUES (
       NULL,
       'ADMIN_ACTION',
       'profile',
       v_admin_id::text,
       CASE WHEN v_prev_role IS NULL THEN NULL ELSE jsonb_build_object('role', v_prev_role) END,
       jsonb_build_object(
         'event', 'FIRST_ADMIN_BOOTSTRAP',
         'actor_session_user', session_user,
         'target_user_id', v_admin_id::text,
         'target_email', v_email,
         'role', 'ADMIN'
       )
     );
   END $$;
   ```
4. **Verify First `ADMIN` Bootstrap & Auditability:**
   ```sql
   SELECT id, full_name, email, role, is_active, created_at, updated_at
   FROM public.profiles
   WHERE role = 'ADMIN';
   ```
   After logging in with that user in the ResQAI app, subsequent `DISPATCHER` / `FIELD_RESPONDER` / `ADMIN` promotions should be performed strictly via `updateUserRoleAsAdmin()` or Dashboard SQL Editor — **never** by relaxing public signup.

---

## 5. Edge Function Deployment Audit Matrix (`supabase/functions/_shared/security.ts`)

**Phase 28.1 Security Fix Applied Locally:** Updated `_shared/security.ts` and all Category B/C functions so scheduled `pg_cron` (`x-cron-secret: <CRON_SECRET>`) and trusted internal service-to-service (`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`) calls succeed without requiring an interactive human session, while Category A interactive AI functions strictly require a human user JWT.

| Function | Class | Auth Requirement | Allowed Roles / Machine Identity | Required Secrets | CORS / Caller JWT |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `analyze-incident` | **A** | Interactive Bearer JWT only | `ADMIN`, `DISPATCHER` | `GEMINI_API_KEY` | `OPTIONS` 200 ok; `aiAnalysis.ts` sends logged-in session JWT automatically via `supabase.functions.invoke`. |
| `explain-reallocation` | **A** | Interactive Bearer JWT only | `ADMIN`, `DISPATCHER` | `GEMINI_API_KEY` | `OPTIONS` 200 ok; `reallocation.ts` sends user JWT automatically. |
| `gemini-assistant` | **A** | Interactive Bearer JWT only | `ADMIN`, `DISPATCHER` | `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `OPTIONS` 200 ok; `geminiAssistantService.ts` sends user JWT automatically (gated behind `AI_ASSISTANT_USE` permission). |
| `ingest-earthquakes` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `SUPABASE_SERVICE_ROLE_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `earthquakeService.ts` (user JWT), `monitor-data-providers` (`service_role`), or `pg_cron` (`x-cron-secret`). |
| `ingest-fire-events` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `FIRMS_MAP_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `fireService.ts`, `monitor-data-providers`, or `pg_cron`. |
| `ingest-imd-alerts` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `SUPABASE_SERVICE_ROLE_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `environmentalAlertsService.ts`, `monitor-data-providers`, or `pg_cron`. |
| `ingest-weather` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `FIELD_RESPONDER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | Optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `weatherService.ts` (any authenticated role including responders) or `pg_cron`. |
| `ingest-alerts` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | Optional `CRON_SECRET` | `OPTIONS` 200 ok; admin/dispatcher or cron trigger. |
| `monitor-data-providers` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `providerHealthService.ts` (admin/dispatcher UI) or `pg_cron`; uses `service_role` internally to invoke ingestion functions. |
| `process-live-events` | **B** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `SUPABASE_SERVICE_ROLE_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called by `providerHealthService.ts` or `pg_cron`; invokes `analyze-external-event` via `service_role`. |
| `analyze-external-event` | **C** | Bearer JWT **or** `CRON_SECRET` / `SERVICE_ROLE` | `ADMIN`, `DISPATCHER`, `CRON_SCHEDULER`, `SERVICE_ROLE` | `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `CRON_SECRET` | `OPTIONS` 200 ok; called interactively by `externalEventAiService.ts` and internally by `process-live-events` via `service_role`. |

> **Frontend Caller Note:** `supabase.functions.invoke()` automatically injects the current Supabase Auth session JWT into `Authorization: Bearer <token>`. Unauthenticated callers (no session) only carry the publishable `apikey` and will receive `HTTP 401` once these functions are deployed — matching Phase 28's route and auth gating.

---

## 6. Read-Only SQL Prechecks (Run Before `021` & `022`)

```sql
-- 1A. Check for any duplicate active assignments that would block uk_resource_single_active_assignment
SELECT resource_id, COUNT(*) AS active_count
FROM public.resource_assignments
WHERE assignment_status IN ('RECOMMENDED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS')
GROUP BY resource_id
HAVING COUNT(*) > 1;

-- 1B. Check any incidents/resources statuses incompatible with 021 triggers (informational)
SELECT status, COUNT(*) FROM public.incidents GROUP BY status;
SELECT status, COUNT(*) FROM public.resources GROUP BY status;

-- 2A. Confirm profiles.role udt_name & current profile count before 022
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('role', 'is_active');

SELECT COUNT(*) AS profile_count FROM public.profiles;

-- 2B. Check existing storage buckets
SELECT id, name, public FROM storage.buckets;
```

---

## 7. Exact Deployment Order

1. Run Section 6 read-only SQL prechecks in Supabase SQL Editor.
2. Execute [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) in Supabase SQL Editor.
3. Execute [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) in Supabase SQL Editor.
4. Set Edge Function secrets via authenticated CLI (or Dashboard → Edge Functions → Secrets):
   - `CRON_SECRET` (random >= 32-byte secret for `pg_cron` jobs)
   - `GEMINI_API_KEY` (for AI features)
   - `FIRMS_MAP_KEY` (for NASA FIRMS active fire ingestion)
5. Deploy all 11 Edge Functions (`supabase functions deploy <name>`) so `_shared/security.ts` is bundled with each function (`analyze-incident`, `explain-reallocation`, `gemini-assistant`, `analyze-external-event`, `ingest-earthquakes`, `ingest-fire-events`, `ingest-imd-alerts`, `ingest-weather`, `ingest-alerts`, `monitor-data-providers`, `process-live-events`).
6. Execute Section 4 First `ADMIN` Bootstrap SQL for the verified `auth.users` admin account.
7. Configure any `pg_cron` schedules to send header `x-cron-secret: <CRON_SECRET>` when calling `monitor-data-providers`, `process-live-events`, or `ingest-*`.
8. Run post-deployment live authenticated verification across `anon`, `FIELD_RESPONDER`, `DISPATCHER`, and `ADMIN`.

---

## 8. Rollback Instructions

### Rollback Migration `021`
```sql
DROP INDEX IF EXISTS public.uk_resource_single_active_assignment;
DROP TRIGGER IF EXISTS trg_enforce_resource_status_transition ON public.resources;
DROP FUNCTION IF EXISTS public.enforce_resource_status_transition();
DROP TRIGGER IF EXISTS trg_enforce_incident_status_transition ON public.incidents;
DROP FUNCTION IF EXISTS public.enforce_incident_status_transition();
```

### Rollback Migration `022` (Emergency Revert Only)
- Drop triggers `trg_guard_profile_privilege_columns` on `public.profiles` and `trg_guard_incident_protected_columns` on `public.incidents`, drop helper functions (`is_responder_assigned_to_incident`, `is_field_responder`, `is_dispatcher_or_admin`, `is_admin`), restore prior policies from `006_rls.sql` / `012`–`019` if ever required, and optionally drop `resources.assigned_user_id`. **Never disable RLS globally (`DISABLE ROW LEVEL SECURITY`) as a rollback.**

### Rollback Edge Functions
- Re-deploy the previous function revisions from git history via `supabase functions deploy <fn-name>` if an issue arises in an individual endpoint.

---

## 9. Remaining Risks Until Remote Deployment

1. **Remote DB & Edge Functions Not Yet Updated:** Until Sections 7 steps 1–8 are executed, remote `external_events` / `incidents` / `provider_health` still use pre-`022` RLS and the 7 previously deployed Edge Functions lack `_shared/security.ts`.
2. **Per-Isolate Rate Limiter:** `checkRateLimit()` in `_shared/security.ts` is in-memory per Deno isolate; distributed sustained abuse across edge regions requires Edge/gateway WAF or Redis/Postgres rate limiting.
3. **Single-Unit Scoping for Responders:** Existing operational `resources` rows must have `assigned_user_id` set by an `ADMIN`/`DISPATCHER` before `FIELD_RESPONDER` accounts can view/update their assigned fleet unit under `022` RLS.
4. **Remote Catalog & Multi-Role Live Verification Pending:** Full `ANON` rejection, `FIELD_RESPONDER` cross-record denial, `DISPATCHER` workflow, `ADMIN` role promotion, and `pg_cron` authentication must be re-tested live against `itmeoierfppvoaljebco` after Step 7 deployment.
