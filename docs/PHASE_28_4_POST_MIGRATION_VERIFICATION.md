# RESQAI — PHASE 28.4: POST-MIGRATION 021/022 VERIFICATION REPORT

**Date:** 2026-11-26  
**Project:** `c:\Manish\sih1`  
**Supabase Project Reference:** `itmeoierfppvoaljebco` (`itmeoierfppvoaljebco.supabase.co`)  
**Scope:** Strictly **READ-ONLY** verification of migrations [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) and [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) against the live Supabase project.

> **Verification Boundary Statement:** Using only the public client configuration (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, without printing any credential value), read-only PostgREST/Auth/Storage probes directly confirmed live `anon` lockdown across all 25 `public` tables and 6 RPC functions on `itmeoierfppvoaljebco.supabase.co`. Because `anon` correctly lacks catalog and `public` schema access (`42501`), internal PostgreSQL catalog metadata (`pg_trigger`, `pg_proc`, `pg_policies`, `pg_index`, `information_schema.role_table_grants`, `pg_default_acl`, and table row counts) **cannot** be inspected via PostgREST `anon` and requires running the read-only SQL Editor verification queries in **Section 4**.

---

## 1. Live Read-Only PostgREST / Auth / Storage Verification Results

Executed read-only HTTP requests against `itmeoierfppvoaljebco.supabase.co` using the project `anon` key:

| Probe Target | Method & Path | Live Response | Verification Conclusion |
| :--- | :--- | :--- | :--- |
| GoTrue Auth API | `GET /auth/v1/health` | `HTTP 200` (`GoTrue v2.199.0`) | Live Auth service online. |
| PostgREST OpenAPI Root | `GET /rest/v1/` | `HTTP 401` | Anonymous schema discovery blocked. |
| All 25 `public` tables (`profiles`, `departments`, `locations`, `hospitals`, `incidents`, `incident_updates`, `resources`, `resource_assignments`, `notifications`, `reallocation_audit_logs`, `reallocation_events`, `audit_logs`, `simulation_runs`, `simulation_events`, `simulation_incidents`, `simulation_results`, `analytics_results`, `weather_observations`, `environmental_alerts`, `external_ingestion_logs`, `external_events`, `incident_ai_analysis`, `provider_health`, `ai_event_timeline`, `ai_assistant_conversations`) | `GET /rest/v1/<table>?select=*&limit=1` | `HTTP 401` (`code: "42501"`, `"permission denied for table <table>"`) on all 25 tables | **Verified live:** `022` Section 14 revoked `anon` privileges across all 25 `public` tables. |
| `resources.assigned_user_id` probe | `GET /rest/v1/resources?select=id,assigned_user_id&limit=1` | `HTTP 401` (`code: "42501"`, `"permission denied for table resources"`) | `anon` rejected before column parsing (confirm column existence via SQL Check #7). |
| `public.schema_migrations` probe | `GET /rest/v1/schema_migrations?select=*&limit=1` | `HTTP 404` (`PGRST205`) | Expected (Supabase tracks migrations in `supabase_migrations`, not `public`). |
| Helper & Sequence RPCs (`get_auth_user_role`, `is_dispatcher_or_admin`, `is_field_responder`, `is_responder_assigned_to_incident`, `generate_next_incident_number`) | `POST /rest/v1/rpc/<fn>` | `HTTP 401` (`code: "42501"`, `"permission denied for function <fn>"`) | **Verified live:** functions exist in schema cache (no `PGRST202` 404) and `EXECUTE` is revoked from `anon`. |
| Helper RPC `is_admin` | `POST /rest/v1/rpc/is_admin` | `HTTP 401` (empty error body) | **Verified live:** anonymous execution rejected (`HTTP 401`, no `200`/`404`); inspect `pg_proc` via SQL Checks #2 & #6. |
| Storage Buckets | `GET /storage/v1/bucket` | `HTTP 200` (`[]`) | No public/anonymous buckets exposed. |

---

## 2. Verification Matrix (Requirements 1–10)

| # | Requirement | Live Client Evidence | Requires SQL Editor Catalog Check |
| :-: | :--- | :--- | :--- |
| **1** | Triggers from `021` (2) and `022` (4) exist and are enabled | Not inspectable via `anon` PostgREST | **SQL Check 1** (`pg_trigger`, `tgenabled = 'O'`) |
| **2** | All 5 `SECURITY DEFINER` RBAC helpers exist (`get_auth_user_role`, `is_admin`, `is_dispatcher_or_admin`, `is_field_responder`, `is_responder_assigned_to_incident`) | **Partial:** RPC probes returned `HTTP 401` (`42501` / non-404), confirming schema presence & `anon` denial | **SQL Check 2** (`pg_proc`: confirms `prosecdef = true` & exact signatures) |
| **3** | `search_path` settings on all `021`/`022` functions are hardened (`search_path=""`) | Not inspectable via `anon` PostgREST | **SQL Check 3** (`pg_proc.proconfig`) |
| **4** | All 48 expected RLS policies exist (45 across 25 `public` tables + 3 on `storage.objects`) & RLS enabled | **Partial:** `anon` blocked on all 25 tables | **SQL Check 4** (`pg_class.relrowsecurity`, `pg_policies`, absence of dropped permissive policies) |
| **5** | `PUBLIC` and `anon` privileges revoked across schema, tables, sequences, functions, and default ACLs | **Verified live for `anon`** across all 25 `public` tables (`401`/`42501`), OpenAPI root (`401`), and 6 RPCs (`401`) | **SQL Check 5** (`has_schema_privilege`, `role_table_grants`, `pg_proc.proacl`, `pg_default_acl`) |
| **6** | `authenticated` and `service_role` grants match `022` Section 14 exactly | Not inspectable without `authenticated`/`service_role` session | **SQL Check 6** (`role_table_grants`, `role_usage_grants`, `routine_privileges`, `pg_default_acl`) |
| **7** | Partial unique index `uk_resource_single_active_assignment` (+ `idx_resources_assigned_user`) exists & valid | Not inspectable via `anon` PostgREST | **SQL Check 7** (`pg_indexes`, `pg_index.indisvalid`, `pg_index.indisready`, `resources.assigned_user_id`) |
| **8** | All 4 protected-column trigger functions (`guard_*`) exist with remediated definitions | Not inspectable via `anon` PostgREST | **SQL Check 8** (`pg_proc`: verifies `session_user`, `auth.uid() IS NULL`, `to_jsonb` allowlist, no `current_user IN`) |
| **9** | Existing historical records remain intact | Not readable via `anon` (`42501`, expected) | **SQL Check 9** (`COUNT(*)` across operational, ingestion & audit tables) |
| **10** | No migration errors or missing/invalid objects evident | **Partial:** zero `5xx` responses across all 34 live REST/Auth/Storage probes | **SQL Check 10** (checks invalid indexes, disabled triggers, RLS gaps, leftover pre-`022` permissive policies) |

---

## 3. Expected Object Inventory (`021` + `022`)

### 3A. Expected Triggers (6)
- `public.incidents`: `trg_enforce_incident_status_transition` (`BEFORE UPDATE OF status`, `021`) -> `enforce_incident_status_transition()`
- `public.incidents`: `trg_guard_incident_protected_columns` (`BEFORE UPDATE`, `022`) -> `guard_incident_protected_columns()`
- `public.resources`: `trg_enforce_resource_status_transition` (`BEFORE UPDATE OF status`, `021`) -> `enforce_resource_status_transition()`
- `public.resources`: `trg_guard_resource_protected_columns` (`BEFORE UPDATE`, `022`) -> `guard_resource_protected_columns()`
- `public.profiles`: `trg_guard_profile_privilege_columns` (`BEFORE UPDATE`, `022`) -> `guard_profile_privilege_columns()`
- `public.resource_assignments`: `trg_guard_assignment_protected_columns` (`BEFORE UPDATE`, `022`) -> `guard_assignment_protected_columns()`

### 3B. Expected Functions & `search_path` (11)
- **RBAC `SECURITY DEFINER` Helpers (5, `SET search_path = ''`, `EXECUTE` for `authenticated, service_role` only):**
  `get_auth_user_role()`, `is_admin()`, `is_dispatcher_or_admin()`, `is_field_responder()`, `is_responder_assigned_to_incident(uuid)`
- **Protected-Column `SECURITY DEFINER` Trigger Functions (4, `SET search_path = ''`, `EXECUTE` for `service_role` only):**
  `guard_profile_privilege_columns()`, `guard_incident_protected_columns()`, `guard_resource_protected_columns()`, `guard_assignment_protected_columns()`
- **Workflow Trigger Functions from `021` (2, `SECURITY INVOKER`):**
  `enforce_incident_status_transition()`, `enforce_resource_status_transition()` *(Note: `021` did not set `search_path`; inspect `proconfig` in Check 3 if you also track `search_path` advisor warnings.)*

### 3C. Expected Indexes & Column (3)
- Column: `public.resources.assigned_user_id` (`uuid`, nullable, FK `public.profiles(id)`)
- Unique Partial Index (`021`): `uk_resource_single_active_assignment` on `public.resource_assignments (resource_id) WHERE assignment_status IN ('RECOMMENDED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS')`
- Partial Index (`022`): `idx_resources_assigned_user` on `public.resources (assigned_user_id) WHERE assigned_user_id IS NOT NULL`

---

## 4. Read-Only SQL Editor Verification Queries (Owner Execution)

Run the following read-only `SELECT` queries in **Supabase Dashboard -> SQL Editor** (`postgres` role). They perform **zero** writes, drops, or role changes.

```sql
-- ============================================================================
-- RESQAI PHASE 28.4 READ-ONLY POST-MIGRATION 021/022 VERIFICATION SCRIPT
-- Execute in Supabase Dashboard SQL Editor (strictly read-only SELECT queries)
-- ============================================================================

-- CHECK 1: Verify all 6 triggers from 021 & 022 exist and are enabled ('O' = origin/enabled)
WITH expected(table_name, trigger_name) AS (
  VALUES
    ('incidents', 'trg_enforce_incident_status_transition'),
    ('incidents', 'trg_guard_incident_protected_columns'),
    ('resources', 'trg_enforce_resource_status_transition'),
    ('resources', 'trg_guard_resource_protected_columns'),
    ('profiles', 'trg_guard_profile_privilege_columns'),
    ('resource_assignments', 'trg_guard_assignment_protected_columns')
)
SELECT
  e.table_name,
  e.trigger_name,
  (t.tgname IS NOT NULL) AS exists,
  t.tgenabled,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'A' THEN 'ALWAYS'
    WHEN 'R' THEN 'REPLICA'
    ELSE 'MISSING'
  END AS state,
  p.proname AS trigger_function
FROM expected e
LEFT JOIN pg_class c ON c.relname = e.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgname = e.trigger_name AND NOT t.tgisinternal
LEFT JOIN pg_proc p ON p.oid = t.tgfoid
ORDER BY e.table_name, e.trigger_name;

-- CHECK 2 & 3: Verify helper & trigger functions exist, SECURITY DEFINER flag, and search_path hardening
WITH expected_fns(proname) AS (
  VALUES
    ('get_auth_user_role'),
    ('is_admin'),
    ('is_dispatcher_or_admin'),
    ('is_field_responder'),
    ('is_responder_assigned_to_incident'),
    ('guard_profile_privilege_columns'),
    ('guard_incident_protected_columns'),
    ('guard_resource_protected_columns'),
    ('guard_assignment_protected_columns'),
    ('enforce_incident_status_transition'),
    ('enforce_resource_status_transition'),
    ('generate_next_incident_number')
)
SELECT
  ef.proname,
  (p.oid IS NOT NULL) AS exists,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config
FROM expected_fns ef
LEFT JOIN pg_proc p ON p.proname = ef.proname
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY ef.proname;

-- CHECK 4A: Verify RLS enabled across all 25 public tables + policy counts
WITH expected_tables(table_name, expected_policy_count) AS (
  VALUES
    ('profiles', 3),
    ('departments', 2),
    ('locations', 2),
    ('hospitals', 2),
    ('incidents', 4),
    ('incident_updates', 2),
    ('resources', 3),
    ('resource_assignments', 3),
    ('notifications', 3),
    ('reallocation_audit_logs', 1),
    ('reallocation_events', 1),
    ('audit_logs', 2),
    ('simulation_runs', 1),
    ('simulation_events', 1),
    ('simulation_incidents', 1),
    ('simulation_results', 1),
    ('analytics_results', 1),
    ('weather_observations', 2),
    ('environmental_alerts', 2),
    ('external_ingestion_logs', 1),
    ('external_events', 2),
    ('incident_ai_analysis', 2),
    ('provider_health', 1),
    ('ai_event_timeline', 1),
    ('ai_assistant_conversations', 1)
)
SELECT
  et.table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  et.expected_policy_count,
  COUNT(pol.policyname) AS actual_policy_count,
  ARRAY_AGG(pol.policyname ORDER BY pol.policyname) AS active_policies
FROM expected_tables et
LEFT JOIN pg_class c ON c.relname = et.table_name
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN pg_policies pol ON pol.schemaname = 'public' AND pol.tablename = et.table_name
GROUP BY et.table_name, c.relrowsecurity, c.relforcerowsecurity, et.expected_policy_count
ORDER BY et.table_name;

-- CHECK 4B: Verify storage.objects ResQAI RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname ILIKE '%resqai%'
ORDER BY policyname;

-- CHECK 5 & 6A: Verify schema privileges & PUBLIC / anon revocation + authenticated / service_role grants
SELECT
  has_schema_privilege('anon', 'public', 'USAGE') AS anon_has_public_usage,
  has_schema_privilege('anon', 'public', 'CREATE') AS anon_has_public_create,
  has_schema_privilege('authenticated', 'public', 'USAGE') AS auth_has_public_usage,
  has_schema_privilege('authenticated', 'public', 'CREATE') AS auth_has_public_create,
  has_schema_privilege('service_role', 'public', 'USAGE') AS svc_has_public_usage;

SELECT
  table_name,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) FILTER (WHERE grantee = 'PUBLIC') AS public_privs,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) FILTER (WHERE grantee = 'anon') AS anon_privs,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) FILTER (WHERE grantee = 'authenticated') AS authenticated_privs,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) FILTER (WHERE grantee = 'service_role') AS service_role_privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- CHECK 6B: Verify sequence, function EXECUTE grants, and ALTER DEFAULT PRIVILEGES
SELECT object_schema, object_name, grantee, privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public' AND object_type = 'SEQUENCE'
ORDER BY object_name, grantee;

SELECT
  p.proname,
  p.proacl::text AS raw_acl,
  r.rolname AS role_checked,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
CROSS JOIN (
  SELECT 'anon' AS rolname
  UNION ALL SELECT 'authenticated'
  UNION ALL SELECT 'service_role'
) r
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'get_auth_user_role', 'is_admin', 'is_dispatcher_or_admin', 'is_field_responder',
    'is_responder_assigned_to_incident', 'guard_profile_privilege_columns',
    'guard_incident_protected_columns', 'guard_resource_protected_columns',
    'guard_assignment_protected_columns', 'generate_next_incident_number'
  )
ORDER BY p.proname, r.rolname;

SELECT
  pg_get_userbyid(d.defaclrole) AS for_role,
  n.nspname AS schema_name,
  d.defaclobjtype AS object_type,
  d.defaclacl AS acl
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public' OR d.defaclnamespace = 0;

-- CHECK 7: Verify resources.assigned_user_id column and 021/022 indexes validity
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'assigned_user_id';

SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  ix.indisunique,
  ix.indisvalid,
  ix.indisready,
  pg_get_indexdef(ix.indexrelid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND i.relname IN ('uk_resource_single_active_assignment', 'idx_resources_assigned_user');

-- CHECK 8: Inspect Phase 28.3 remediation markers inside all 4 guard_* trigger functions
SELECT
  p.proname,
  (p.prosrc ILIKE '%session_user%') AS uses_session_user,
  (p.prosrc ILIKE '%auth.uid() IS NULL%') AS checks_null_uid,
  (p.prosrc NOT ILIKE '%current_user%IN%') AS avoids_current_user_bypass,
  (p.prosrc ILIKE '%to_jsonb(OLD)%') AS uses_jsonb_allowlist_if_incident_guard
FROM pg_proc p
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'guard_profile_privilege_columns',
    'guard_incident_protected_columns',
    'guard_resource_protected_columns',
    'guard_assignment_protected_columns'
  )
ORDER BY p.proname;

-- CHECK 9: Historical data preservation row counts (read-only)
SELECT 'profiles' AS table_name, COUNT(*) AS row_count FROM public.profiles
UNION ALL SELECT 'departments', COUNT(*) FROM public.departments
UNION ALL SELECT 'locations', COUNT(*) FROM public.locations
UNION ALL SELECT 'hospitals', COUNT(*) FROM public.hospitals
UNION ALL SELECT 'incidents', COUNT(*) FROM public.incidents
UNION ALL SELECT 'incident_updates', COUNT(*) FROM public.incident_updates
UNION ALL SELECT 'resources', COUNT(*) FROM public.resources
UNION ALL SELECT 'resource_assignments', COUNT(*) FROM public.resource_assignments
UNION ALL SELECT 'external_events', COUNT(*) FROM public.external_events
UNION ALL SELECT 'weather_observations', COUNT(*) FROM public.weather_observations
UNION ALL SELECT 'environmental_alerts', COUNT(*) FROM public.environmental_alerts
UNION ALL SELECT 'provider_health', COUNT(*) FROM public.provider_health
UNION ALL SELECT 'ai_event_timeline', COUNT(*) FROM public.ai_event_timeline
UNION ALL SELECT 'audit_logs', COUNT(*) FROM public.audit_logs
ORDER BY table_name;

-- CHECK 10: Anomaly check — invalid indexes, disabled non-internal triggers, or permissive true write policies
SELECT 'INVALID_INDEX' AS issue_type, c.relname AS object_name
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND (NOT ix.indisvalid OR NOT ix.indisready)
UNION ALL
SELECT 'DISABLED_TRIGGER', tg.tgname
FROM pg_trigger tg
JOIN pg_class tbl ON tbl.oid = tg.tgrelid
JOIN pg_namespace n ON n.oid = tbl.relnamespace
WHERE n.nspname = 'public' AND NOT tg.tgisinternal AND tg.tgenabled <> 'O'
UNION ALL
SELECT 'PERMISSIVE_WRITE_POLICY', pol.tablename || '.' || pol.policyname
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND pol.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (COALESCE(pol.qual, '') = 'true' OR COALESCE(pol.with_check, '') = 'true');
```

---

## 5. Non-Modification Confirmation

- No migrations executed (`021` and `022` were not re-run or altered).
- No database rows inserted, updated, deleted, or truncated.
- No Edge Functions deployed or secrets modified.
- No `ADMIN` bootstrap executed.
- Phase 29 not started.
- No `.env` credentials or secrets exposed.
