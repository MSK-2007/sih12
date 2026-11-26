# RESQAI — PHASE 28.5: SQL VERIFICATION RESULTS ANALYSIS

**Date:** 2026-11-26  
**Project:** `c:\Manish\sih1`  
**Supabase Project Reference:** `itmeoierfppvoaljebco`  
**Audit Scope:** Verification-results review of the owner's SQL Editor execution of Checks 1–10 from [PHASE_28_4_POST_MIGRATION_VERIFICATION.md](file:///c:/Manish/sih1/docs/PHASE_28_4_POST_MIGRATION_VERIFICATION.md) against [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) and [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql). No SQL, application code, database records, secrets, or Edge Functions were modified.

**Verdict:** `NOT VERIFIED — FIXES REQUIRED`

> **Primary Reason for Verdict:** Although all ten SQL verification queries executed without SQL syntax or runtime errors in Supabase Dashboard SQL Editor, **none of the actual returned SQL Editor result sets have been provided or inspected yet**. Successful query execution proves valid SQL syntax, not that triggers are enabled, `search_path` values are `""`, all 48 RLS policies exist, historical counts match baseline, or zero anomalies were returned. In addition, several checks in [PHASE_28_4_POST_MIGRATION_VERIFICATION.md](file:///c:/Manish/sih1/docs/PHASE_28_4_POST_MIGRATION_VERIFICATION.md) have coverage gaps (notably **Check 9 omitted `external_ingestion_logs` and `incident_ai_analysis`**) that require supplemental read-only queries before final sign-off.

---

## 1. Status of SQL Editor Result Inspection

- **Provided so far:** Confirmation that all 10 read-only SQL checks executed without SQL errors.
- **Still needed from owner:** The actual tabular/CSV/JSON output from **each** check (Checks 1, 2/3, 4A, 4B, 5/6A, 6B, 7, 8, 9, 10) plus the supplemental baseline/coverage queries in **Section 6** below.
  - *Important Supabase SQL Editor note:* Executing a multi-query script at once in Supabase SQL Editor frequently shows only the **last** `SELECT` output grid (`CHECK 10`). Please run each query block individually (or export each result tab) and share all outputs.

---

## 2. Live-Verified vs Unverified Baseline Against `021` & `022`

| Verification Domain | Expected State (`021` + `022`) | Current Evidence Status | Findings / Gaps |
| :--- | :--- | :--- | :--- |
| **Triggers (Req 1)** | 6 enabled triggers (`tgenabled = 'O'`): `trg_enforce_incident_status_transition`, `trg_enforce_resource_status_transition` (`021`); `trg_guard_profile_privilege_columns`, `trg_guard_incident_protected_columns`, `trg_guard_resource_protected_columns`, `trg_guard_assignment_protected_columns` (`022`). | **Unverified** (Check 1 rows not provided) | Must inspect Check 1 output (`exists = true`, `state = 'ENABLED'`). |
| **`SECURITY DEFINER` Helpers (Req 2)** | 5 RBAC helpers: `get_auth_user_role()`, `is_admin()`, `is_dispatcher_or_admin()`, `is_field_responder()`, `is_responder_assigned_to_incident(uuid)` (`prosecdef = true`, owner `postgres`). | **Partially verified live** (PostgREST `POST /rest/v1/rpc/*` returned `401` rather than `PGRST202` 404); `prosecdef` & owner **unverified** | Must inspect Check 2/3 output (`exists = true`, `is_security_definer = true`, `owner = 'postgres'`). |
| **`search_path` Hardening (Req 3)** | `proconfig` contains `search_path=` (`""`) on all 5 helpers + 4 `guard_*` triggers (`022`). | **Unverified** (Check 2/3 rows not provided) | Note: `021`'s `enforce_incident_status_transition` & `enforce_resource_status_transition` are `SECURITY INVOKER` and did not set `search_path` (expected `function_config = NULL`). |
| **RLS Policies (Req 4)** | RLS enabled (`relrowsecurity = true`) on all 25 `public` tables; 45 `public` policies + 3 `storage.objects` `resqai-%` policies (48 total). | **Unverified** (Check 4A/4B rows not provided) | Check 4A verifies names/counts only; does not print `cmd`/`qual`/`with_check`. |
| **`PUBLIC` & `anon` Revocations (Req 5)** | Schema `USAGE`/`CREATE` revoked; all 25 tables, sequences, and functions revoked from `PUBLIC` & `anon`; `ALTER DEFAULT PRIVILEGES` set. | **Verified live for `anon` on tables/OpenAPI/6 RPCs** (`401`/`42501` across all 25 tables & OpenAPI); **`PUBLIC` & `proacl` & `pg_default_acl` unverified** | Must inspect Check 5/6A, Check 6B (`raw_acl`), and `pg_default_acl`. |
| **`authenticated` & `service_role` Grants (Req 6)** | `service_role`: `ALL` on all tables/sequences; `authenticated`: `SELECT, INSERT` (`audit_logs`, `incident_updates`, `weather_observations`, `incident_ai_analysis`), `SELECT` only (`external_ingestion_logs`, `provider_health`, `ai_event_timeline`), `SELECT, UPDATE` (`external_events`), `SELECT, INSERT, UPDATE` (`notifications`), `SELECT, INSERT, UPDATE, DELETE` (16 operational/RBAC/sim tables); `guard_*` `EXECUTE` revoked from `authenticated`. | **Unverified** (Check 5/6A/6B rows not provided) | Must inspect Check 5/6A and Check 6B outputs row by row. |
| **Active-Assignment Index & Column (Req 7)** | `uk_resource_single_active_assignment` (`indisunique = true`, `indisvalid = true`, `indisready = true`) on `resource_assignments(resource_id)`; `resources.assigned_user_id` (`uuid`) + `idx_resources_assigned_user` (`indisvalid = true`). | **Unverified** (Check 7 rows not provided) | Must inspect Check 7 outputs. |
| **4 Protected-Column Trigger Functions (Req 8)** | All 4 `guard_*` functions exist, `SECURITY DEFINER`, `search_path = ''`, use `session_user` + `auth.uid() IS NULL` (no `current_user IN`), and `guard_incident_protected_columns` uses `to_jsonb(OLD)` allowlist. | **Unverified** (Check 8 rows not provided) | Must inspect Check 8 output; `uses_jsonb_allowlist_if_incident_guard` is expected `true` on `guard_incident_protected_columns` and `false` on the other 3. |
| **Anomalies & Missing Objects (Req 10)** | Zero `INVALID_INDEX`, zero `DISABLED_TRIGGER`, zero `PERMISSIVE_WRITE_POLICY` in `public`. | **Unverified** (Check 10 rows not provided; 0 `5xx` in earlier `anon` REST probes) | Confirm Check 10 returned **0 rows**. |

---

## 3. Historical Record Count Baseline Check (Requirement 4)

| Table | Recorded Baseline | Status in Phase 28.4 Check 9 | Observed Count | Comparison Result |
| :--- | :---: | :--- | :---: | :--- |
| `external_events` | **313** | Included in Check 9 | *Pending owner result set* | Cannot verify yet |
| `external_ingestion_logs` | **38** | **OMITTED from Check 9** | *Not queried* | **Check gap — run Supplemental Query S1** |
| `weather_observations` | **15** | Included in Check 9 | *Pending owner result set* | Cannot verify yet |
| `incident_ai_analysis` | **1** | **OMITTED from Check 9** | *Not queried* | **Check gap — run Supplemental Query S1** |

*(Additional tables from Check 9—`profiles`, `departments`, `locations`, `hospitals`, `incidents`, `incident_updates`, `resources`, `resource_assignments`, `environmental_alerts`, `provider_health`, `ai_event_timeline`, `audit_logs`—also await owner output.)*

---

## 4. Assessment of Legitimate Application Operations Under `021` & `022` (Requirement 5)

Based on static inspection of `src/security/rbac.ts`, `src/services/authGuard.ts`, `src/services/incidents.ts`, `src/services/resources.ts`, `src/services/assignments.ts`, `src/services/allocation.ts`, `src/services/reallocation.ts`, `src/services/auditLogs.ts`, and migrations `021`/`022` (assuming `021`/`022` objects match local SQL once verified):

1. **`ADMIN` Operations:**
   - **Supported cleanly:** Role updates (`updateUserRoleAsAdmin()` in `src/services/authGuard.ts`) update `profiles.role` / `is_active` under `Admins manage all profiles` + `guard_profile_privilege_columns()` (`public.is_admin() = true`), read `audit_logs` (`Admin select audit_logs`), and retain full `DISPATCHER` operational permissions across incidents, resources, assignments, reallocations, and simulations.
2. **`DISPATCHER` Operations:**
   - **Supported cleanly:** Incident creation/updates/status transitions (`createIncident`, `updateIncident`, `updateIncidentStatus`, `advanceIncidentToStatus`), resource fleet management, dispatch confirmation & cancellation (`confirmDispatch`, `cancelDispatch`), reallocation approval/rejection (`confirmReallocation`, `rejectReallocation`), notifications, and simulation runs satisfy `is_dispatcher_or_admin()` RLS + Section 14 table grants.
   - **Intentional restrictions:** Cannot `SELECT` from `audit_logs` (`ADMIN`-only), cannot `DELETE` from `resources` or `resource_assignments` (no `DELETE` policy granted in `022`), and cannot change `profiles.role` or `is_active`.
3. **`FIELD_RESPONDER` Operations:**
   - **Supported when unit is assigned:** Responders with `'FIELD_STATUS_UPDATE'` (`src/security/rbac.ts`) can advance their assigned unit's assignments (`updateAssignmentStatus()`: `ACCEPTED -> DISPATCHED -> IN_PROGRESS -> COMPLETED`), update unit availability (`updateResourceStatus()`: `AVAILABLE` / `BUSY` / `OFFLINE`), send GPS telemetry (`updateResourceLocation()`), insert `incident_updates` on completion (`is_responder_assigned_to_incident()` includes `'COMPLETED'`), and append their own operational `audit_logs` entries (`ASSIGNMENT_*`).
   - **Prerequisites & boundaries to note:**
     - **Prerequisite (`resources.assigned_user_id`):** Existing fleet rows have `assigned_user_id = NULL` by default; `ADMIN`/`DISPATCHER` must link `resources.assigned_user_id` to a responder's profile UUID before that responder can read or update any unit, assignment, or incident.
     - **Boundary:** `FIELD_RESPONDER` intentionally lacks `'INCIDENT_UPDATE'` in `src/security/rbac.ts` (so UI/service calls to `updateIncidentStatus()` throw `Forbidden` at `assertAuthorizedActor`); direct PostgREST incident updates remain capped at `{ status, resolved_at, updated_at }` via `guard_incident_protected_columns()`.
4. **System / Ingestion Operations:**
   - Because `authenticated` has `SELECT`-only SQL grants on `external_ingestion_logs`, `provider_health`, and `ai_event_timeline`, client-triggered ingestion and AI pipeline flows **must** run through the deployed Edge Functions using `service_role` (after Edge Function deployment in the next phase).

---

## 5. Checks That Cannot Fully Establish Their Claims (Requirement 6)

Even once the owner supplies outputs from Checks 1–10 of [PHASE_28_4_POST_MIGRATION_VERIFICATION.md](file:///c:/Manish/sih1/docs/PHASE_28_4_POST_MIGRATION_VERIFICATION.md), the following limitations exist in those queries:

1. **Check 9 Incomplete Baseline Coverage:** `external_ingestion_logs` (`38`) and `incident_ai_analysis` (`1`) were omitted from Check 9, so Check 9 alone cannot confirm those two baseline row counts.
2. **Check 4A Policy Definition Blind Spot:** Check 4A aggregates `policyname` and counts per table, without returning `cmd`, `roles`, `qual`, or `with_check`. A stale or misconfigured policy sharing an expected policy name would still match Check 4A's count check. Check 4B checks only `storage.objects` policies matching `%resqai%`, missing any stray non-`resqai` permissive policies on `storage.objects`.
3. **Check 5 `PUBLIC` Privilege Inspection:** `information_schema.role_table_grants` lists grants to enabled roles and can obscure or require explicit cross-checks against `pg_class.relacl` / `has_table_privilege('public', ...)` and `has_schema_privilege('public', 'public', ...)` to prove `PUBLIC` revocation exhaustively.
4. **Check 2/3 & `021` Functions:** `enforce_incident_status_transition()` and `enforce_resource_status_transition()` (`021`) are `SECURITY INVOKER` without `SET search_path = ''`; Check 3 cannot verify them as hardened `search_path = ''` functions (expected `NULL`), and Check 2/3 does not rule out duplicate overloaded function signatures if any existed previously.
5. **Check 8 Static Substring Limit:** Checking `pg_proc.prosrc` via `ILIKE` does not prove live PostgreSQL runtime behavior under an authenticated PostgREST JWT (`session_user = 'authenticator'`, `auth.uid() = '<uuid>'`); end-to-end negative tests (e.g., attempting self-promotion or protected-column mutation as `FIELD_RESPONDER`) are still required post-deployment.
6. **Check 10 Scope Limit:** Check 10 scans only `public` (`n.nspname = 'public'`), missing anomalies in `storage.objects` policies or unrecorded entries in `supabase_migrations.schema_migrations`.

---

## 6. Supplemental Read-Only SQL Queries for Complete Verification

Please share the outputs from **Checks 1–10** along with these **3 supplemental read-only queries** (safe `SELECT`-only, zero modifications):

```sql
-- SUPPLEMENTAL S1: Missing historical baseline counts (external_ingestion_logs & incident_ai_analysis)
SELECT 'external_events' AS table_name, COUNT(*) AS row_count FROM public.external_events
UNION ALL SELECT 'external_ingestion_logs', COUNT(*) FROM public.external_ingestion_logs
UNION ALL SELECT 'weather_observations', COUNT(*) FROM public.weather_observations
UNION ALL SELECT 'incident_ai_analysis', COUNT(*) FROM public.incident_ai_analysis
ORDER BY table_name;

-- SUPPLEMENTAL S2: Full policy expressions (cmd/roles/qual/with_check) + storage.objects full check
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- SUPPLEMENTAL S3: Direct PUBLIC vs anon schema/table ACL check + applied migration log (if accessible)
SELECT
  has_schema_privilege('public', 'public', 'USAGE') AS public_has_schema_usage,
  has_schema_privilege('public', 'public', 'CREATE') AS public_has_schema_create,
  c.relname AS table_name,
  c.relacl::text AS raw_relacl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

---

## 7. Action Requested From Owner

Please paste or attach the actual SQL Editor result sets for:
1. **Checks 1 through 10** from [PHASE_28_4_POST_MIGRATION_VERIFICATION.md](file:///c:/Manish/sih1/docs/PHASE_28_4_POST_MIGRATION_VERIFICATION.md) (executed individually so earlier result tabs are not hidden), and
2. **Supplemental Queries S1–S3** above.

Once those result sets are reviewed, this analysis can be updated to `VERIFIED — READY FOR NEXT SECURITY STEP` (or `VERIFIED WITH WARNINGS` / concrete remediation if discrepancies appear) before configuring secrets, deploying Edge Functions, or bootstrapping `ADMIN`.
