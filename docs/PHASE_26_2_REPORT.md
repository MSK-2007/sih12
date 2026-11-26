# RESQAI — PHASE 26.2 REPORT: FINAL MIGRATION SAFETY AUDIT & SQL EXECUTION PREPARATION

**Date:** 2026-11-26  
**Target Project:** `resqai` (`itmeoierfppvoaljebco`, PostgreSQL `17.6.1.155`)  
**Phase 26.2 Status:** **LOCALLY AUDITED & READY FOR OWNER SQL EDITOR EXECUTION (NOT YET EXECUTED REMOTELY)**

---

## 1. Status Classification Matrix

| Workstream / Migration | Classification | Summary |
| :--- | :--- | :--- |
| Migration `017` (`017_imd_environmental_alerts_enhancements.sql`) | **Locally audited** / **Ready for SQL Editor execution** | Safe additive schema/index/publication changes (`table_schema = 'public'` qualified in guide SQL; original file preserved). |
| Migration `018` (`018_dynamic_reallocation_schema.sql`) | **Locally audited** / **Ready for SQL Editor execution (Reviewed script)** | Original `018` flagged for unrestricted anonymous `FOR ALL USING (true)` write policies. Separate reviewed script created at [018_dynamic_reallocation_schema.reviewed.sql](file:///c:/Manish/sih1/docs/sql/018_dynamic_reallocation_schema.reviewed.sql) restricting writes to `TO authenticated`. |
| Migration `019` (`019_provider_health_ai_timeline.sql`) | **Locally audited** / **Ready for SQL Editor execution (Reviewed script)** | Original `019` flagged for overlapping `provider_health` write policies and unrestricted anonymous `INSERT`/`UPDATE`/`ALL` policies. Separate reviewed script created at [019_provider_health_ai_timeline.reviewed.sql](file:///c:/Manish/sih1/docs/sql/019_provider_health_ai_timeline.reviewed.sql). |
| Migration `020` (`020_schema_reconciliation.sql`) | **Locally audited** / **Ready for SQL Editor execution (Run strictly after `019`)** | Additive enums, columns, indexes, `handle_new_user()` replacement, publication setup, and `UPDATE` to `provider_health` (`supabase_realtime` row seeded by `019`). |
| Remote migration history query (`supabase_migrations.schema_migrations`) | **Blocked (Local)** / **Ready for SQL Editor execution** | PostgREST returns `406 PGRST106`; SQL queries prepared in [PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md) for owner execution. |
| Remote execution of `017`–`020` | **Blocked (Local — awaiting owner SQL Editor execution)** | **None** of migrations `017`–`020` have been executed remotely yet (`reallocation_*`, `provider_health`, `ai_event_timeline`, `ai_assistant_conversations`, `017` alert columns, and `020` columns are not yet live). |
| Baseline connectivity & `001`–`016` state | **Verified remotely** | Confirmed in Phase 26.1 (`external_events`: 313 rows, `external_ingestion_logs`: 38 rows, `weather_observations`: 15 rows, `incident_ai_analysis`: 1 row, `resources.is_active` and `incidents.source_type` present). |

---

## 2. Statement-by-Statement Migration Safety Audit (`017`–`020`)

### 2.1 `supabase/migrations/017_imd_environmental_alerts_enhancements.sql`

| Lines | Statement Classification | Object(s) | Audit Findings |
| :--- | :--- | :--- | :--- |
| 7–32 | `Other` (`DO` block) wrapping 6 × `ALTER TABLE` | `environmental_alerts` (`source_alert_id`, `region`, `issued_at`, `received_at`, `status`, `raw_data`) | Idempotent column checks (`IF NOT EXISTS`), nullable or defaulted, non-destructive (`0` existing rows remotely). **Minor observation:** original checks `information_schema.columns` without `table_schema = 'public'`; the execution guide adds `table_schema = 'public'` without modifying the original file. |
| 35–37 | `CREATE INDEX` | `idx_env_alerts_source_id` | Partial `UNIQUE INDEX IF NOT EXISTS ... WHERE source_alert_id IS NOT NULL`. Safe. |
| 40–48 | `Other` (`DO` block) + `ALTER PUBLICATION` | `supabase_realtime` (`environmental_alerts`) | Guards via `pg_publication_tables`; execution guide qualifies `schemaname = 'public'`. Safe. |

**Data overwrite / destruction risk:** None.

---

### 2.2 `supabase/migrations/018_dynamic_reallocation_schema.sql`

| Lines | Statement Classification | Object(s) | Audit Findings |
| :--- | :--- | :--- | :--- |
| 6–24 | `CREATE TABLE` | `reallocation_audit_logs` | `IF NOT EXISTS`. Foreign keys to `incidents(id) ON DELETE SET NULL` and `resources(id) ON DELETE SET NULL` — both referenced tables **verified remotely** in Phase 26.1. |
| 27–37 | `CREATE TABLE` | `reallocation_events` | `IF NOT EXISTS`. Foreign key `trigger_incident_id` → `incidents(id) ON DELETE CASCADE` (verified remotely). Primary key `id` is `TEXT`. |
| 40–43 | 4 × `CREATE INDEX` | `idx_realloc_*` | All use `IF NOT EXISTS`. Safe. |
| 46–47 | 2 × `ALTER TABLE` (`ENABLE ROW LEVEL SECURITY`) | `reallocation_audit_logs`, `reallocation_events` | Enables RLS safely. |
| 49–59 | 4 × `DROP POLICY` + 4 × `CREATE POLICY` | `reallocation_audit_logs`, `reallocation_events` | **Detected risk in original `018`:** Write policies (`FOR ALL USING (true)`) lack `TO authenticated` / `auth.role() = 'authenticated'`, creating unrestricted anonymous writes despite policy names saying `"Allow authenticated write ..."`, and omit explicit `WITH CHECK`. **Resolution:** [018_dynamic_reallocation_schema.reviewed.sql](file:///c:/Manish/sih1/docs/sql/018_dynamic_reallocation_schema.reviewed.sql) restricts `FOR ALL` writes to `TO authenticated` with explicit `USING`/`WITH CHECK`. |
| 62–70 | 2 × `Other` (`DO` block) + 2 × `ALTER PUBLICATION` | `supabase_realtime` (`reallocation_audit_logs`, `reallocation_events`) | Exception-handled (`WHEN OTHERS THEN NULL` in original; tightened to `WHEN duplicate_object THEN NULL` with publication check in reviewed script). |

**Data overwrite / destruction risk:** None (tables do not exist remotely yet).

---

### 2.3 `supabase/migrations/019_provider_health_ai_timeline.sql`

| Lines | Statement Classification | Object(s) | Audit Findings |
| :--- | :--- | :--- | :--- |
| 8–24 | `CREATE TABLE` | `provider_health` | `IF NOT EXISTS`, `provider_key` `UNIQUE`. No foreign keys. |
| 27–28 | 2 × `CREATE INDEX` | `idx_provider_health_key`, `idx_provider_health_status` | Idempotent (`IF NOT EXISTS`). |
| 32–49 | `CREATE TABLE` | `ai_event_timeline` | `IF NOT EXISTS`. FK `incident_id` → `incidents(id) ON DELETE SET NULL` (verified remotely). **Note:** `reallocation_event_id` is `UUID` (unconstrained) whereas `reallocation_events.id` in `018` is `TEXT`; DDL succeeds cleanly, documented as an application type note. |
| 52–55 | 4 × `CREATE INDEX` | `idx_ai_timeline_*` | Idempotent (`IF NOT EXISTS`). |
| 59–69 | `CREATE TABLE` | `ai_assistant_conversations` | `IF NOT EXISTS`. No foreign keys. |
| 71 | `CREATE INDEX` | `idx_ai_conversation_session` | Idempotent (`IF NOT EXISTS`). |
| 74–76 | 3 × `ALTER TABLE` (`ENABLE ROW LEVEL SECURITY`) | `provider_health`, `ai_event_timeline`, `ai_assistant_conversations` | Enables RLS safely. |
| 79–101 | 8 × `DROP POLICY` + 8 × `CREATE POLICY` | Same 3 tables | **Detected risks in original `019`:** (1) Duplicate/overlapping write policies on `provider_health` (`Auth insert`, `Auth update`, AND `Auth upsert` `FOR ALL USING (true)`). (2) Unrestricted anonymous `INSERT`/`UPDATE`/`ALL` policies (`WITH CHECK (true)` / `USING (true)` without `TO authenticated`), even though codebase search confirmed frontend services only `SELECT` from these 3 tables while Edge Functions (`monitor-data-providers`, `process-live-events`, `gemini-assistant`) use `service_role` (bypassing RLS). **Resolution:** [019_provider_health_ai_timeline.reviewed.sql](file:///c:/Manish/sih1/docs/sql/019_provider_health_ai_timeline.reviewed.sql) drops the redundant `Auth upsert provider_health` policy and restricts write policies to `TO authenticated`. |
| 104–112 | 2 × `Other` (`DO` block) + 2 × `ALTER PUBLICATION` | `supabase_realtime` (`provider_health`, `ai_event_timeline`) | Exception-handled. Safe. |
| 115–122 | `INSERT / UPDATE` (`INSERT`) | `provider_health` (5 seed rows) | Uses `ON CONFLICT (provider_key) DO NOTHING` — preserves existing rows if re-run. |

**Data overwrite / destruction risk:** None (`INSERT ... ON CONFLICT DO NOTHING`; tables do not exist remotely yet).

---

### 2.4 `supabase/migrations/020_schema_reconciliation.sql`

| Lines | Statement Classification | Object(s) | Audit Findings |
| :--- | :--- | :--- | :--- |
| 17–34 | 16 × `ENUM modification` (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`) | `user_role` (+2), `injury_level` (+1), `notification_type` (+13) | Idempotent on PG 17.6. Does not cast newly added enum labels in immediate DML inside the same script (`handle_new_user()` body is PL/pgSQL string evaluated at trigger runtime). Must still execute in its own SQL Editor step after `017`–`019`. |
| 37–39 | `ALTER TABLE` | `incidents.environmental_risk_score` | Additive `NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (0..100)`. Metadata-only on PG 17 (`0` existing rows remotely). |
| 41–42 | `CREATE INDEX` | `idx_incidents_source_type` | `IF NOT EXISTS`; `incidents.source_type` verified live remotely. |
| 45–46 | `ALTER TABLE` | `resources.station_name` | Additive nullable `TEXT`. |
| 48–49 | `CREATE INDEX` | `idx_resources_is_active` | `IF NOT EXISTS`; `resources.is_active` verified live remotely. |
| 52–53 | `ALTER TABLE` | `external_events.incident_id` | Additive nullable FK → `incidents(id) ON DELETE SET NULL`. Preserves all `313` existing rows in `external_events` (`incident_id` defaults to `NULL`). |
| 55–56 | `CREATE INDEX` | `idx_external_events_incident` | `IF NOT EXISTS`. |
| 59–66 | `ALTER TABLE` (7 columns) | `simulation_runs` (`scenario_id`, `run_key`, `mode`, `speed_multiplier`, `config`, `metrics`, `completed_at`) | Reconciles `003` vs `010`/`013` collision additively without dropping table or data. |
| 68–70 | `CREATE INDEX` | `idx_simulation_runs_run_key` | Partial unique index (`WHERE run_key IS NOT NULL`). |
| 72–75 | `ALTER TABLE` (3 columns) | `simulation_events` (`simulated_time`, `offset_minutes`, `status`) | Reconciles `003` vs `010`/`013` collision additively. |
| 78–107 | `CREATE OR REPLACE FUNCTION` | `public.handle_new_user()` | Replaces trigger function in-place (no duplicate `CREATE TRIGGER` on `auth.users`). **Pre-check required:** confirm `profiles.role` `udt_name` is `user_role` (expected from `003_tables.sql` & live `get_auth_user_role()`) before execution. Blocks untrusted `ADMIN` self-assignment on signup; preserves existing `role` on `ON CONFLICT (id) DO UPDATE`. |
| 110–114 | `INSERT / UPDATE` (`UPDATE`) | `provider_health` (`provider_key = 'supabase_realtime'`) | **Execution-order dependency:** Fails if run before `019` (`relation "public.provider_health" does not exist`). Modifies only the single seeded `'supabase_realtime'` row's `endpoint` to `'/realtime/v1'`. |
| 117–144 | `Other` (`DO` block) + `ALTER PUBLICATION` | `supabase_realtime` (11 tables) | Loops with `EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;`. Safe. |

**Trigger / Function Check:** No `CREATE TRIGGER` exists in `017`–`020`, so zero trigger duplication risk; `020` safely uses `CREATE OR REPLACE FUNCTION public.handle_new_user()`.

---

## 3. Deliverables Created

1. [PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md) — Backup steps, SQL Editor instructions, `supabase_migrations.schema_migrations` retrieval SQL, pre/post-migration verification SQL, sequential SQL blocks (`017` → `018` → `019` → `020`), expected outputs, and rollback notes.
2. [018_dynamic_reallocation_schema.reviewed.sql](file:///c:/Manish/sih1/docs/sql/018_dynamic_reallocation_schema.reviewed.sql) — Reviewed execution script for `018` eliminating unrestricted anonymous writes (original [018_dynamic_reallocation_schema.sql](file:///c:/Manish/sih1/supabase/migrations/018_dynamic_reallocation_schema.sql) preserved untouched).
3. [019_provider_health_ai_timeline.reviewed.sql](file:///c:/Manish/sih1/docs/sql/019_provider_health_ai_timeline.reviewed.sql) — Reviewed execution script for `019` eliminating duplicate `provider_health` policy and unrestricted anonymous writes (original [019_provider_health_ai_timeline.sql](file:///c:/Manish/sih1/supabase/migrations/019_provider_health_ai_timeline.sql) preserved untouched).
4. [PHASE_26_2_REPORT.md](file:///c:/Manish/sih1/docs/PHASE_26_2_REPORT.md) — This safety audit report.

---

## 4. Regression Checks

Executed after all documentation and reviewed SQL script edits on `2026-11-26`:

- `npm run lint` (`tsc --noEmit`): **PASSED** (`exit code 0`, **0 TypeScript errors**)
- `npm run build` (`tsc && vite build`): **PASSED** (`exit code 0`, **2,626 modules transformed**, built in `12.27s`)
- `npm test` (`vitest run`): **PASSED** (`exit code 0`, **16/16 test files**, **79/79 tests passed**)

---

## 5. Next Required Owner Action Before Any Phase 27 Work

1. Follow [PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md) in the Supabase Dashboard SQL Editor:
   - Run the backup/row-count check and pre-migration queries (including `supabase_migrations.schema_migrations`).
   - Execute `017` → reviewed `018` → reviewed `019` → `020` in strict sequential order.
   - Run the post-migration verification queries and share the output so remote execution can be verified before starting Phase 27.
