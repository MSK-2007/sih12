# RESQAI — PHASE 28.2: FINAL SECURITY GAP AUDIT

**Date:** 2026-11-26  
**Project Root:** `C:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco` (`resqai`)  
**Audit Mode:** **Read-Only Audit & Documentation** (no remote SQL executed, no Edge Functions deployed, no modifications to `021`, `022`, application code, or live data)

---

## 1. Executive Verdict

**VERDICT: `NOT READY` FOR PRODUCTION SECURITY DEPLOYMENT AS-IS**

**Recommendation on Pending Migrations & Functions:**
- **`021_workflow_guards_and_rpcs.sql`:** **SAFE TO EXECUTE** individually after running duplicate-active-assignment prechecks (creates valid `BEFORE UPDATE` triggers and partial unique index matching application state machines, with zero destructive operations). Note that despite its filename, no `confirm_dispatch_atomic` RPC exists in `021`.
- **`022_rbac_security_rls_hardening.sql` & Edge Function Deployment:** **HOLD — REMEDIATE CRITICAL & HIGH GAPS FIRST.** Deploying `022` and the 11 Edge Functions without fixing the gaps below leaves a **cross-incident privilege escalation vector** (`FIELD_RESPONDER` mutating `resource_assignments.incident_id`), **missing column-level protections** on `resources` and `incidents`, and a **gateway authentication breakage** (`supabase/config.toml` absent, causing `verify_jwt = true` to block cron/internal ingestion).
- **Production Security Status:** **NOT ACTIVE REMOTELY.** None of `021`, `022`, or the updated `_shared/security.ts` Edge Functions are deployed remotely yet.

---

## 2. Prioritized Findings Summary

| ID | Severity | Area | Summary & Exact Location |
| :--- | :---: | :--- | :--- |
| **SEC-01** | **CRITICAL** | `resource_assignments` Column Escalation | `022` lines `335–357` allow `FIELD_RESPONDER` `UPDATE` without a column guard; mutating `incident_id` grants `is_responder_assigned_to_incident()` access to arbitrary unrelated incidents. |
| **SEC-02** | **CRITICAL** | Missing `supabase/config.toml` Gateway Config | `supabase/config.toml` does not exist; default `verify_jwt = true` at Supabase gateway rejects `x-cron-secret` and non-JWT `sb_secret_...` internal calls (`monitor-data-providers`, `process-live-events`) with `401`. |
| **SEC-03** | **CRITICAL** | `resources` Column Mutability | `022` lines `295–305` allow `FIELD_RESPONDER` `UPDATE` without column guards or column grants, exposing `resource_code`, `name`, `resource_type`, `station_name`, `capability`, `capacity`, `department_id`, `is_active`. |
| **SEC-04** | **HIGH** | Incomplete `incidents` Trigger Allowlist | `guard_incident_protected_columns()` (`022` lines `216–244`) omits `title`, `description`, `emergency_type`, `address`, `latitude`, `longitude`, `people_affected`, `injury_level`, `reported_at`, `assigned_operator`, `location_id`. |
| **SEC-05** | **HIGH** | Missing Explicit SQL `REVOKE` / `GRANT` | Zero `GRANT`/`REVOKE` statements in `001`–`022`; `anon` and `authenticated` retain default table/column SQL grants masked only by RLS. |
| **SEC-06** | **MEDIUM** | `SECURITY DEFINER` `search_path` & `PUBLIC` Execute | `022` lines `28–86` use `SET search_path = public` instead of `SET search_path = ''` and retain default `EXECUTE` grants to `PUBLIC` / `anon`. |
| **SEC-07** | **MEDIUM** | `updateResourceLocation()` Client Guard Gap | [resources.ts](file:///c:/Manish/sih1/src/services/resources.ts#L329-L334) lacks `assertAuthorizedActor('FIELD_STATUS_UPDATE', ...)` (unlike `updateResourceStatus` at line `254`). |
| **SEC-08** | **MEDIUM** | Bootstrap Verification & Audit Safety | `PHASE_28_1_DEPLOYMENT_AUDIT.md` lines `91–102` accept manual email input separately from `auth.users` UUID lookup and omit an `audit_logs` record on bootstrap. |
| **SEC-09** | **LOW** | Timing-Safe Length & Filename Mismatch | `_shared/security.ts` line `32` returns early on length mismatch; `021` filename references `_rpcs` though no RPC function is defined. |

---

## 3. `FIELD_RESPONDER` Column-Level Permission Findings

PostgreSQL RLS governs **row** visibility/mutation, not **column** immutability. Auditing `022_rbac_security_rls_hardening.sql`, [rbac.ts](file:///c:/Manish/sih1/src/security/rbac.ts), [AuthContext.tsx](file:///c:/Manish/sih1/src/context/AuthContext.tsx), [DriverDispatchPanel.tsx](file:///c:/Manish/sih1/src/components/driver/DriverDispatchPanel.tsx#L87-L111), [incidents.ts](file:///c:/Manish/sih1/src/services/incidents.ts), [resources.ts](file:///c:/Manish/sih1/src/services/resources.ts), and [assignments.ts](file:///c:/Manish/sih1/src/services/assignments.ts):

### 3.1 `public.incidents` (`022` lines `190–255`) — **HIGH**
- **Current Design:**
  - `RBAC select incidents` (`022:190–196`): `FIELD_RESPONDER` can `SELECT` if `reported_by = auth.uid()` OR `is_responder_assigned_to_incident(id)`.
  - `RBAC update incidents` (`022:203–213`): `FIELD_RESPONDER` can `UPDATE` **only** if `is_responder_assigned_to_incident(id)` is true (cannot update incidents they merely reported unless assigned).
  - `guard_incident_protected_columns()` (`022:216–250`): Blocks changes to `incident_number`, `priority_score`, `priority_level`, `severity`, `environmental_risk_score`, `reported_by`, `created_by`, and `source_type`.
- **Gap Found:** `FIELD_RESPONDER` with a valid JWT can still directly `PATCH /rest/v1/incidents` to alter `title`, `description`, `emergency_type`, `address`, `latitude`, `longitude`, `people_affected`, `injury_level`, `reported_at`, `assigned_operator`, `location_id`, `created_at`. Furthermore, client-side [DriverDispatchPanel.tsx](file:///c:/Manish/sih1/src/components/driver/DriverDispatchPanel.tsx#L87-L111) never even updates `incidents` directly (and `updateIncident` at [incidents.ts](file:///c:/Manish/sih1/src/services/incidents.ts#L245-L250) requires `INCIDENT_UPDATE`, which only `ADMIN`/`DISPATCHER` hold).
- **Recommended Correction:** Replace blocklist in `guard_incident_protected_columns()` with a strict allowlist (non-dispatcher/non-admin may ONLY change `status`, `resolved_at`, `updated_at`), or narrow updates via a dedicated field-status RPC.

### 3.2 `public.resources` (`022` lines `282–310`) — **CRITICAL**
- **Current Design:** `RBAC update resources` (`022:295–305`) allows `FIELD_RESPONDER` where `assigned_user_id = auth.uid()`. Zero column grants or triggers guard `public.resources`.
- **Legitimate Responder Columns Needed:** [DriverDispatchPanel.tsx](file:///c:/Manish/sih1/src/components/driver/DriverDispatchPanel.tsx#L75-L102), `updateResourceStatus()` ([resources.ts:254](file:///c:/Manish/sih1/src/services/resources.ts#L254)), and `updateResourceLocation()` ([resources.ts:329](file:///c:/Manish/sih1/src/services/resources.ts#L329)) only need to modify: `status`, `current_assignment_id` (only `NULL` when returning to `AVAILABLE`, never pointing to another incident's assignment), `latitude`, `longitude`, `last_location_update`, `updated_at`.
- **Gap Found:** A malicious responder can `PATCH` their own row's `resource_code`, `name`, `resource_type`, `station_name`, `capability`, `capacity`, `department_id`, `is_active`, or `created_at` (and note `WITH CHECK (assigned_user_id = auth.uid())` prevents reassigning `assigned_user_id` away from themselves, yet `capability`/`capacity`/`is_active` tampering breaks allocation scoring).
- **Recommended Correction:** Add `guard_resource_protected_columns()` `BEFORE UPDATE` trigger restricting non-dispatchers/non-admins exclusively to `status`, `current_assignment_id` (only `NULL` or an active assignment belonging to `OLD.id`), `latitude`, `longitude`, `last_location_update`, `updated_at`.

### 3.3 `public.resource_assignments` (`022` lines `316–362`) — **CRITICAL**
- **Current Design:** `FIELD_RESPONDER` cannot `INSERT` (`022:330`) or `DELETE` (`022:359`). However, `RBAC update resource_assignments` (`022:335–357`) only verifies `EXISTS (... r.id = resource_id AND r.assigned_user_id = auth.uid())` in `USING` and `WITH CHECK`.
- **Gap Found (Privilege Escalation):** Because no trigger or column grant guards `resource_assignments` columns, an assigned `FIELD_RESPONDER` can issue `PATCH /rest/v1/resource_assignments?id=eq.<own_asgn>` setting **`incident_id = '<ANY_OTHER_INCIDENT_UUID>'`**. Because `is_responder_assigned_to_incident(p_incident_id)` (`022:71–86`) checks `resource_assignments.incident_id`, that mutation immediately grants the responder `SELECT` and `UPDATE` RLS access to unrelated confidential incidents and their `incident_updates`! Responders can also overwrite `allocation_score`, `distance_km`, `estimated_response_minutes`, `recommendation_reason`, `assigned_by`, or force `assignment_status = 'CANCELLED'` / `'REJECTED'`.
- **Legitimate Responder Columns Needed:** Per [assignments.ts:149–175](file:///c:/Manish/sih1/src/services/assignments.ts#L149-L175) and [DriverDispatchPanel.tsx:87–95](file:///c:/Manish/sih1/src/components/driver/DriverDispatchPanel.tsx#L87-L95), responders only need `assignment_status` (`ACCEPTED`, `DISPATCHED`, `IN_PROGRESS`, `COMPLETED` — never `CANCELLED`/`REJECTED`), `accepted_at`, `dispatched_at`, `started_at`, `completed_at`, `updated_at`.
- **Recommended Correction:** Add `guard_assignment_protected_columns()` `BEFORE UPDATE` trigger on `public.resource_assignments` rejecting changes to `incident_id`, `resource_id`, `recommended_at`, `distance_km`, `estimated_response_minutes`, `allocation_score`, `recommendation_reason`, `assigned_by`, `created_at` and validating responder state transitions (`RECOMMENDED -> ACCEPTED -> DISPATCHED -> IN_PROGRESS -> COMPLETED`).

---

## 4. `SECURITY DEFINER` Functions Review (`022` lines `28–122`, `216–244`)

| Function | Exact Lines | `SECURITY DEFINER` & Schema Qual | Current `search_path` | Recursive RLS Safe? | `EXECUTE` Grants / Abuse Assessment |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.get_auth_user_role()` | `28–36` | Yes; queries `public.profiles`, uses `auth.uid()` | `SET search_path = public` | Yes (owned by `postgres`, `profiles` lacks `FORCE RLS`) | **MEDIUM:** No `REVOKE FROM PUBLIC, anon`. Safe behavior (`auth.uid()` = NULL for `anon`), but should revoke from `PUBLIC, anon`. |
| `public.is_admin()` | `38–46` | Yes; calls `public.get_auth_user_role()` | `SET search_path = public` | Yes | **MEDIUM:** Default `PUBLIC` execute; takes 0 args; revoke from `PUBLIC, anon`. |
| `public.is_dispatcher_or_admin()` | `48–59` | Yes; calls `public.get_auth_user_role()` | `SET search_path = public` | Yes | **MEDIUM:** Default `PUBLIC` execute; takes 0 args; revoke from `PUBLIC, anon`. |
| `public.is_field_responder()` | `61–69` | Yes; calls `public.get_auth_user_role()` | `SET search_path = public` | Yes | **MEDIUM:** Default `PUBLIC` execute; takes 0 args; revoke from `PUBLIC, anon`. |
| `public.is_responder_assigned_to_incident(uuid)` | `71–86` | Yes; joins `public.resource_assignments` & `public.resources` | `SET search_path = public` | Yes | **MEDIUM:** Accepts `p_incident_id uuid` argument and is callable via `/rest/v1/rpc/...` by `PUBLIC`/`anon` due to missing `REVOKE`. Bound by `r.assigned_user_id = auth.uid()` (returns `false` for `anon`; leaks only own assignment boolean for authenticated caller), yet still violates least privilege without `REVOKE ALL ... FROM PUBLIC, anon`. |
| `public.guard_profile_privilege_columns()` | `89–122` | Yes; trigger (`public.is_admin()`, `public.audit_logs`) | `SET search_path = public` | Yes | Trigger function; revoke `EXECUTE` from `PUBLIC, anon, authenticated`. |
| `public.guard_incident_protected_columns()` | `216–244` | Yes; trigger (`public.is_dispatcher_or_admin()`) | `SET search_path = public` | Yes | Trigger function; revoke `EXECUTE` from `PUBLIC, anon, authenticated`. |

**`SET search_path = ''` Recommendation:** Although all table/function names inside the 5 helpers are already explicitly prefixed with `public.` / `auth.`, changing `SET search_path = public` to **`SET search_path = ''`** with explicit schema prefixes guarantees no rogue operator or function in `public` can intercept resolution. Recommended SQL pattern (for future `023` remediation migration):
```sql
ALTER FUNCTION public.get_auth_user_role() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_dispatcher_or_admin() SET search_path = '';
ALTER FUNCTION public.is_field_responder() SET search_path = '';
ALTER FUNCTION public.is_responder_assigned_to_incident(uuid) SET search_path = '';
REVOKE ALL ON FUNCTION public.get_auth_user_role(), public.is_admin(), public.is_dispatcher_or_admin(),
  public.is_field_responder(), public.is_responder_assigned_to_incident(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role(), public.is_admin(), public.is_dispatcher_or_admin(),
  public.is_field_responder(), public.is_responder_assigned_to_incident(uuid) TO authenticated, service_role;
```

---

## 5. Actual SQL Grants vs RLS Findings (`001`–`022`)

Searching all local migrations `001`–`022` confirmed **zero `GRANT`, `REVOKE`, or `ALTER DEFAULT PRIVILEGES` statements exist**. Therefore, every table in `public` inherits Supabase Cloud's default schema grants (`SELECT, INSERT, UPDATE, DELETE` granted to `anon`, `authenticated`, and `service_role`):

| Table Group | SQL Table Grants (`anon` / `authenticated`) | Column Grants | RLS / `FORCE RLS` | Audit Finding |
| :--- | :--- | :--- | :--- | :--- |
| `profiles`, `departments`, `locations`, `hospitals` | `anon`: `ALL` (default); `authenticated`: `ALL` (default) | None (all columns) | `ENABLE RLS`: Yes (`022`); `FORCE RLS`: No | **HIGH:** `anon` is blocked **solely** by RLS absence of `anon` policies, not SQL privilege revocation (`REVOKE ALL ... FROM anon`). |
| `incidents`, `incident_updates`, `resources`, `resource_assignments` | `anon`: `ALL` (default); `authenticated`: `ALL` (default) | None (all columns) | `ENABLE RLS`: Yes; `FORCE RLS`: No | **CRITICAL / HIGH:** `authenticated` has `GRANT UPDATE` on **all** columns; `incident_updates` has `GRANT UPDATE, DELETE` masked only by missing RLS policies. |
| `audit_logs` | `anon`: `ALL` (default); `authenticated`: `ALL` (default) | None | `ENABLE RLS`: Yes; `FORCE RLS`: No | **HIGH:** Immutability (`no UPDATE/DELETE`) relies solely on omitted RLS policies rather than `REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;`. |
| `reallocation_audit_logs`, `reallocation_events` | `anon`: `ALL` (default); `authenticated`: `ALL` (default) | None | `ENABLE RLS`: Yes; `FORCE RLS`: No | **MEDIUM:** `anon` still holds unused table SQL grants; blocked at RLS layer only (`is_dispatcher_or_admin()`). |
| `provider_health`, `ai_event_timeline`, `external_ingestion_logs`, `external_events` | `anon`: `ALL` (default); `authenticated`: `ALL` (default) | None | `ENABLE RLS`: Yes; `FORCE RLS`: No | **MEDIUM:** Service-owned tables still grant `INSERT`/`UPDATE`/`DELETE` SQL privileges to `anon`/`authenticated`. |
| `storage.objects` | Managed by Supabase `storage` schema | Built-in | `ENABLE RLS`: Supabase default (`true`); `022:537–555` adds `resqai-%` policies | **LOW:** Only `resqai-%` bucket prefix is covered; non-`resqai-*` buckets (if added later) would need explicit policies. Verify `relrowsecurity` on `storage.objects` via SQL precheck. |

---

## 6. Edge Function Gateway & Machine-Auth Audit

Inspected `supabase/config.toml` (missing), [supabase/functions/_shared/security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts), all 11 `supabase/functions/*/index.ts` files, and all invocation sites in `src/` and `supabase/functions/`.

### 6.1 Critical Gateway Finding (**SEC-02: CRITICAL**)
- **`supabase/config.toml` does not exist.** Without per-function `[functions.<name>] verify_jwt = false`, Supabase CLI/deploy defaults every function to **`verify_jwt = true`** at the Kong API gateway.
- Because project `itmeoierfppvoaljebco` uses opaque **`sb_publishable_...` / `sb_secret_...`** API keys (non-JWT keys confirmed in Phase 26.1) and scheduled jobs authenticate via **`x-cron-secret`**, gateway `verify_jwt = true` **blocks `pg_cron` (`x-cron-secret`) and internal `service_role` calls (`monitor-data-providers -> ingest-*`, `process-live-events -> analyze-external-event`) with `HTTP 401` before `_shared/security.ts` runs!**

### 6.2 Function-by-Function Security & `verify_jwt` Matrix

| Edge Function | Class | Gateway `verify_jwt` Needed | In-Function Auth (`_shared/security.ts`) | Frontend / Internal Callers |
| :--- | :---: | :---: | :--- | :--- |
| `analyze-incident` | **A (Interactive)** | **`true`** | Interactive JWT only (`ADMIN`, `DISPATCHER`), `allowServiceOrCron` unset (`false`) | `aiAnalysis.ts:29` |
| `explain-reallocation` | **A (Interactive)** | **`true`** | Interactive JWT only (`ADMIN`, `DISPATCHER`), `allowServiceOrCron` unset (`false`) | `reallocation.ts:104` |
| `gemini-assistant` | **A (Interactive)** | **`true`** | Interactive JWT only (`ADMIN`, `DISPATCHER`), `allowServiceOrCron` unset (`false`) | `geminiAssistantService.ts:43` |
| `ingest-earthquakes` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `earthquakeService.ts:52`, `monitor-data-providers:51`, `pg_cron` |
| `ingest-fire-events` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `fireService.ts:29`, `monitor-data-providers:155`, `pg_cron` |
| `ingest-imd-alerts` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `environmentalAlertsService.ts:114`, `monitor-data-providers:109`, `pg_cron` |
| `ingest-weather` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, `FIELD_RESPONDER`, or `CRON_SECRET` / `SERVICE_ROLE` | `weatherService.ts:31`, `pg_cron` |
| `ingest-alerts` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `pg_cron` / admin |
| `monitor-data-providers` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `providerHealthService.ts:123`, `pg_cron` |
| `process-live-events` | **B (Scheduled/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `providerHealthService.ts:152`, `pg_cron` |
| `analyze-external-event` | **C (Internal/Dual)** | **`false`** | `ADMIN`, `DISPATCHER`, or `CRON_SECRET` / `SERVICE_ROLE` (`allowServiceOrCron: true`) | `externalEventAiService.ts:30`, `process-live-events:124` |

### 6.3 Verification Checklist Answers
1. **Interactive AI functions require valid human JWT & role:** Verified (`analyze-incident`, `explain-reallocation`, `gemini-assistant` enforce `requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER'])` without `allowServiceOrCron`).
2. **Scheduled functions receive `x-cron-secret`:** Code supports it (`_shared/security.ts:57–67`), **blocked until `supabase/config.toml` sets `verify_jwt = false` for Group B/C**.
3. **Internal service-role validated independently:** Checked via `timingSafeEqualString(token, serviceKey)` (`_shared/security.ts:79–86`) only when `serviceKey` is non-empty and `allowServiceOrCron: true`; never confused with user profiles.
4. **`x-cron-secret` never logged & compared safely:** Confirmed never logged in any file; uses XOR char-code `timingSafeEqualString()` (`_shared/security.ts:25–34`, note early length return leaks secret length -> **SEC-09 LOW**, fixable via SHA-256 hashing both inputs before constant-time compare).
5. **Missing/incorrect secrets fail closed:** Empty `CRON_SECRET` or `serviceKey` evaluates falsy and rejects with `401` (`_shared/security.ts:58, 79`).
6. **CORS `OPTIONS`:** Every function returns `'ok'` on `req.method === 'OPTIONS'` before auth; `Access-Control-Allow-Headers` includes `x-cron-secret`; actual `POST`/`GET` requests execute auth checks immediately.
7. **Zero backend secrets in frontend:** Confirmed zero `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `FIRMS_MAP_KEY`, or `GEMINI_API_KEY` references in `src/`.
8. **No `FIELD_RESPONDER` access to privileged ingestion/processing:** Confirmed `10/11` functions restrict roles to `['ADMIN', 'DISPATCHER']` (returning `403`); only read-only Open-Meteo `ingest-weather` allows `FIELD_RESPONDER`.

---

## 7. Migration `021` Rollback Audit & Corrected Script

Inspecting [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) (`88` lines):
- **Objects created by `021`:**
  1. Function `public.enforce_incident_status_transition()` (`lines 8–40`)
  2. Trigger `trg_enforce_incident_status_transition` on `public.incidents` (`lines 42–46`)
  3. Function `public.enforce_resource_status_transition()` (`lines 49–77`)
  4. Trigger `trg_enforce_resource_status_transition` on `public.resources` (`lines 79–83`)
  5. Index `public.uk_resource_single_active_assignment` on `public.resource_assignments` (`lines 86–88`)
- **Objects NOT in `021`:** Zero RPCs (filename `_and_rpcs` is a misnomer), zero RLS policies, zero `GRANT`/`REVOKE`, zero column/table changes.
- **Comparison vs `PHASE_28_1_DEPLOYMENT_AUDIT.md` lines `182–188`:** All 5 objects were covered in the rollback snippet and no pre-existing objects (`update_updated_at_column`, `update_incidents_updated_at`, `update_resources_updated_at`) are touched.
- **Corrected Transactional Rollback Script (DO NOT EXECUTE NOW):**

```sql
BEGIN;

DROP INDEX IF EXISTS public.uk_resource_single_active_assignment;

DROP TRIGGER IF EXISTS trg_enforce_resource_status_transition ON public.resources;
DROP FUNCTION IF EXISTS public.enforce_resource_status_transition();

DROP TRIGGER IF EXISTS trg_enforce_incident_status_transition ON public.incidents;
DROP FUNCTION IF EXISTS public.enforce_incident_status_transition();

COMMIT;

-- Post-rollback verification (should return 0 rows and pre-existing updated_at triggers intact)
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trg_enforce_incident_status_transition', 'trg_enforce_resource_status_transition');
```

---

## 8. Verified First `ADMIN` Bootstrap Audit & Safer Script

Checking `PHASE_28_1_DEPLOYMENT_AUDIT.md` lines `90–103` against `020_schema_reconciliation.sql` (`lines 78–107`) and `022` (`lines 89–128`):
- **Trigger Compatibility:** `022` `guard_profile_privilege_columns()` permits `current_user IN ('postgres', 'supabase_admin')`. Running in Supabase SQL Editor (`postgres`) passes without weakening or disabling the trigger.
- **Public Self-Promotion:** Client `signUp` + `020` `handle_new_user()` strictly reject `ADMIN` and force `FIELD_RESPONDER` / non-admin roles.
- **Gap Found (SEC-08):** Separate manual placeholders (`'<VERIFIED_ADMIN_USER_UUID>'` and `'<ADMIN_EMAIL>'`) could mismatch or hit `profiles_email_key` unique conflict, and SQL Editor execution bypasses the automatic `ROLE_CHANGED` audit insert inside `guard_profile_privilege_columns()`.

**Safer Audited First `ADMIN` Bootstrap SQL (DO NOT EXECUTE NOW):**

```sql
DO $$
DECLARE
  v_admin_id UUID := '<VERIFIED_ADMIN_USER_UUID>'::uuid;
  v_email TEXT;
BEGIN
  -- 1. Verify exact confirmed, non-deleted user in auth.users and derive email directly
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_admin_id
    AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Verified non-deleted auth.users record not found for UUID %', v_admin_id;
  END IF;

  -- 2. Insert or elevate ONLY that exact verified user ID
  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (v_admin_id, 'ResQAI System Administrator', v_email, 'ADMIN'::public.user_role, TRUE)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = 'ADMIN'::public.user_role,
      is_active = TRUE,
      updated_at = NOW();

  -- 3. Write explicit bootstrap audit trail
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
  VALUES (
    v_admin_id,
    'ADMIN_ACTION',
    'profile',
    v_admin_id::text,
    jsonb_build_object('event', 'FIRST_ADMIN_BOOTSTRAP', 'email', v_email, 'role', 'ADMIN')
  );
END $$;
```

---

## 9. Prioritized Remediation Plan (Before Applying `022` & Deploying Edge Functions)

1. **[CRITICAL — SEC-01 & SEC-03 & HIGH — SEC-04]** Create additive migration `023` (or update `022` prior to owner execution) adding:
   - `guard_assignment_protected_columns()` (`BEFORE UPDATE` on `public.resource_assignments`) blocking non-dispatcher changes to `incident_id`, `resource_id`, `distance_km`, `estimated_response_minutes`, `allocation_score`, `recommendation_reason`, `assigned_by`, `recommended_at`, `created_at` and blocking responder `CANCELLED`/`REJECTED`.
   - `guard_resource_protected_columns()` (`BEFORE UPDATE` on `public.resources`) allowing responders ONLY `status`, `current_assignment_id` (`NULL` or own active assignment), `latitude`, `longitude`, `last_location_update`, `updated_at`.
   - Whitelist update in `guard_incident_protected_columns()` restricting non-dispatcher incident updates exclusively to `status`, `resolved_at`, `updated_at`.
2. **[CRITICAL — SEC-02]** Add `supabase/config.toml` configuring `verify_jwt = true` for `analyze-incident`, `explain-reallocation`, `gemini-assistant`, and `verify_jwt = false` for the 8 cron/service-capable functions (`ingest-*`, `monitor-data-providers`, `process-live-events`, `analyze-external-event`).
3. **[HIGH — SEC-05 & MEDIUM — SEC-06]** Explicitly `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`, revoke `UPDATE, DELETE` on `audit_logs` and `incident_updates` from `authenticated`, revoke write privileges on `provider_health`/`ai_event_timeline`/`external_ingestion_logs` from `authenticated`, set `SET search_path = ''` on all 5 `SECURITY DEFINER` helpers, and `REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated, service_role`.
4. **[MEDIUM — SEC-07]** Add `assertAuthorizedActor('FIELD_STATUS_UPDATE', 'updateResourceLocation')` in [resources.ts:329](file:///c:/Manish/sih1/src/services/resources.ts#L329).
5. **[LOW — SEC-09]** Hash compared secrets with SHA-256 before `timingSafeEqualString` in `_shared/security.ts`.

---

## 10. Post-Deployment SQL Editor Verification Queries

Run after remediation + deployment to verify live database security posture:

```sql
-- 1. Verify RLS & FORCE RLS status across all operational tables & storage.objects
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relkind = 'r')
   OR (n.nspname = 'storage' AND c.relname = 'objects')
ORDER BY n.nspname, c.relname;

-- 2. Verify zero anon table grants remain
SELECT table_schema, table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY table_schema, table_name, grantee
ORDER BY table_name, grantee;

-- 3. Verify SECURITY DEFINER helpers search_path & execute privileges
SELECT
  p.proname,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config,
  pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_auth_user_role', 'is_admin', 'is_dispatcher_or_admin', 'is_field_responder', 'is_responder_assigned_to_incident', 'guard_profile_privilege_columns', 'guard_incident_protected_columns');

SELECT routine_name, grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name IN ('get_auth_user_role', 'is_admin', 'is_dispatcher_or_admin', 'is_field_responder', 'is_responder_assigned_to_incident')
ORDER BY routine_name, grantee;

-- 4. Verify protected-column & workflow triggers are attached
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. Verify First ADMIN account & audit trail
SELECT id, email, role, is_active, created_at FROM public.profiles WHERE role = 'ADMIN';
SELECT action, entity_type, entity_id, user_id, created_at FROM public.audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 11. Local Verification Note

No local code, test, or migration files were altered during Phase 28.2 (read-only audit). The latest verified workspace test baseline from Phase 28.1 remains: `npm run lint` (`0` TypeScript errors), `npm run build` (`2,631` modules), `npm test` (`18/18` test files, `92/92` tests passed).

**Final Recommendation:** Wait to execute `022` and deploy Edge Functions until **SEC-01 through SEC-05** (`resource_assignments` & `resources` & `incidents` column triggers, SQL `REVOKE`/`GRANT` statements, and `supabase/config.toml`) are patched. `021_workflow_guards_and_rpcs.sql` is safe to execute on its own once duplicate-active-assignment prechecks confirm `0` rows.
