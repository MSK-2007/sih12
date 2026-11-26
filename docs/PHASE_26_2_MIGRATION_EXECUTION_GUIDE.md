# RESQAI — PHASE 26.2: SQL EDITOR MIGRATION EXECUTION GUIDE

**Target Project:** `resqai` (`itmeoierfppvoaljebco`)  
**PostgreSQL Version:** `17.6.1.155`  
**Execution Order:** `017` → `018` → `019` → `020` (separate runs, never combined blindly)

---

## 1. Pre-Migration Backup Instructions

Before running any DDL in the Supabase SQL Editor, protect existing operational/historical data (`external_events`: 313 rows, `external_ingestion_logs`: 38 rows, `weather_observations`: 15 rows, `incident_ai_analysis`: 1 row):

1. Open **Supabase Dashboard** → select project **`resqai` (`itmeoierfppvoaljebco`)**.
2. Go to **Database → Backups** (or **Project Settings → Backups**) and confirm the latest scheduled backup or trigger a manual backup if available on your plan.
3. Also verify logical snapshots of the populated tables by running a quick read-only export/row-count check in SQL Editor:

```sql
SELECT 'external_events' AS tbl, COUNT(*) AS rows FROM public.external_events
UNION ALL
SELECT 'external_ingestion_logs', COUNT(*) FROM public.external_ingestion_logs
UNION ALL
SELECT 'weather_observations', COUNT(*) FROM public.weather_observations
UNION ALL
SELECT 'incident_ai_analysis', COUNT(*) FROM public.incident_ai_analysis
UNION ALL
SELECT 'environmental_alerts', COUNT(*) FROM public.environmental_alerts
UNION ALL
SELECT 'incidents', COUNT(*) FROM public.incidents
UNION ALL
SELECT 'resources', COUNT(*) FROM public.resources;
```

---

## 2. How to Use the Supabase SQL Editor Safely

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Run each query block **separately** in the exact numbered order below.
3. Wait for each execution to return `Success` before moving to the next migration.
4. **Do NOT click "Run" on all four migrations concatenated into one script** — `020` uses `ALTER TYPE ... ADD VALUE` and updates `public.provider_health` (which must already exist from `019` and be committed).

---

## 3. Pre-Migration Verification Queries (Read-Only)

### 3.1 Retrieve Remote Migration History (`supabase_migrations.schema_migrations`)

Run Query A first to verify whether `supabase_migrations.schema_migrations` exists and inspect its columns:

```sql
SELECT
  to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migration_table_exists,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations';
```

If `migration_table_exists = true`, run Query B to inspect recorded versions:

```sql
SELECT *
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;
```

> If `migration_table_exists = false` or access is denied, record that migration history is unavailable and use Section 3.2 (live schema inspection) as the reconciliation basis.

### 3.2 Pre-Migration Schema, Enum, FK, Index, RLS, Trigger, Function & Realtime Audit

Run these read-only queries before executing `017`–`020`:

```sql
-- A. Target tables & columns affected by 017-020
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'environmental_alerts',
    'reallocation_audit_logs',
    'reallocation_events',
    'provider_health',
    'ai_event_timeline',
    'ai_assistant_conversations',
    'incidents',
    'resources',
    'external_events',
    'simulation_runs',
    'simulation_events',
    'profiles'
  )
ORDER BY table_name, ordinal_position;
```

```sql
-- B. Existing enum values for user_role, injury_level, notification_type
SELECT
  t.typname AS enum_name,
  e.enumsortorder,
  e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.typname IN ('user_role', 'injury_level', 'notification_type')
ORDER BY t.typname, e.enumsortorder;
```

```sql
-- C. Foreign keys on affected tables
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'environmental_alerts', 'reallocation_audit_logs', 'reallocation_events',
    'ai_event_timeline', 'external_events', 'incidents', 'resources',
    'simulation_runs', 'simulation_events', 'profiles'
  )
ORDER BY tc.table_name, tc.constraint_name;
```

```sql
-- D. Indexes on affected tables
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'environmental_alerts', 'reallocation_audit_logs', 'reallocation_events',
    'provider_health', 'ai_event_timeline', 'ai_assistant_conversations',
    'incidents', 'resources', 'external_events', 'simulation_runs', 'simulation_events'
  )
ORDER BY tablename, indexname;
```

```sql
-- E. RLS enabled status & existing policies on affected tables
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'environmental_alerts', 'reallocation_audit_logs', 'reallocation_events',
    'provider_health', 'ai_event_timeline', 'ai_assistant_conversations',
    'incidents', 'resources', 'external_events', 'simulation_runs', 'simulation_events', 'profiles'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'environmental_alerts', 'reallocation_audit_logs', 'reallocation_events',
    'provider_health', 'ai_event_timeline', 'ai_assistant_conversations',
    'incidents', 'resources', 'external_events', 'simulation_runs', 'simulation_events', 'profiles'
  )
ORDER BY tablename, policyname;
```

```sql
-- F. Triggers & functions (focusing on handle_new_user and auth.users trigger)
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('handle_new_user', 'get_auth_user_role', 'generate_next_incident_number', 'update_updated_at_column')
ORDER BY p.proname;

SELECT
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE (event_object_schema = 'auth' AND event_object_table = 'users')
   OR (event_object_schema = 'public' AND event_object_table IN ('profiles', 'incidents', 'resources', 'environmental_alerts', 'reallocation_events', 'provider_health'))
ORDER BY event_object_schema, event_object_table, trigger_name;
```

```sql
-- G. Realtime publication membership
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Expected Pre-Migration Check Findings:**
- `profiles.role` should report `udt_name = user_role` (if it reports `text` instead, pause before `020` and consult rollback/audit Section 7).
- `on_auth_user_created` should appear on `auth.users` triggering `public.handle_new_user()`.
- `reallocation_audit_logs`, `reallocation_events`, `provider_health`, `ai_event_timeline`, `ai_assistant_conversations` should be absent before running `018`–`019`.

---

## 4. Exact Execution Order & Complete SQL

Execute these four steps **one at a time**, in order: **`017` → `018` → `019` → `020`**.

> **Audit Note on `018` and `019`:** The original migration files in `supabase/migrations/` contain permissive write policies (`USING (true)` / `WITH CHECK (true)` without `TO authenticated`), which allow unrestricted anonymous writes, and `019` defines overlapping write policies on `provider_health`. Original files are preserved untouched; separate reviewed scripts are saved at [018_dynamic_reallocation_schema.reviewed.sql](file:///c:/Manish/sih1/docs/sql/018_dynamic_reallocation_schema.reviewed.sql) and [019_provider_health_ai_timeline.reviewed.sql](file:///c:/Manish/sih1/docs/sql/019_provider_health_ai_timeline.reviewed.sql) and included below for safe execution.

### Step 1 of 4 — Execute `017_imd_environmental_alerts_enhancements.sql`

Source: [017_imd_environmental_alerts_enhancements.sql](file:///c:/Manish/sih1/supabase/migrations/017_imd_environmental_alerts_enhancements.sql) (no policy issues; safe as-is).

```sql
-- =========================================================
-- ResQAI Migration 017: IMD Weather & Environmental Alerts Enhancements
-- Schema updates for India Meteorological Department (IMD) Ingestion
-- =========================================================

-- 1. Safely add missing columns to environmental_alerts table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'source_alert_id') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN source_alert_id VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'region') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN region VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'issued_at') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN issued_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'received_at') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN received_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'status') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'environmental_alerts' AND column_name = 'raw_data') THEN
    ALTER TABLE public.environmental_alerts ADD COLUMN raw_data JSONB;
  END IF;
END $$;

-- 2. Create unique index for idempotent duplicate alert prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_env_alerts_source_id 
ON public.environmental_alerts(source_alert_id) 
WHERE source_alert_id IS NOT NULL;

-- 3. Enable Postgres Realtime publication on environmental_alerts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'environmental_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.environmental_alerts;
  END IF;
END $$;
```

*(Note: `table_schema = 'public'` qualification was added above without altering original `supabase/migrations/017_imd_environmental_alerts_enhancements.sql`.)*

---

### Step 2 of 4 — Execute Reviewed `018` (`018_dynamic_reallocation_schema.reviewed.sql`)

Original preserved: [018_dynamic_reallocation_schema.sql](file:///c:/Manish/sih1/supabase/migrations/018_dynamic_reallocation_schema.sql)  
Reviewed script: [018_dynamic_reallocation_schema.reviewed.sql](file:///c:/Manish/sih1/docs/sql/018_dynamic_reallocation_schema.reviewed.sql)

```sql
-- ====================================================================
-- REVIEWED EXECUTION SCRIPT FOR MIGRATION 018
-- Adjustment: Restrict write policies to authenticated role (blocks anon writes)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.reallocation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id TEXT NOT NULL,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  previous_assignment JSONB,
  proposed_assignment JSONB,
  reason TEXT,
  priority_before NUMERIC(5,2),
  priority_after NUMERIC(5,2),
  eta_before NUMERIC(5,1),
  eta_after NUMERIC(5,1),
  environmental_context JSONB DEFAULT '{}'::jsonb,
  gemini_summary JSONB DEFAULT '{}'::jsonb,
  operator_action TEXT DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.reallocation_events (
  id TEXT PRIMARY KEY,
  trigger_incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  recommendation_data JSONB NOT NULL,
  current_quality NUMERIC(5,2),
  proposed_quality NUMERIC(5,2),
  improvement NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'PENDING_OPERATOR_REVIEW',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realloc_audit_rec ON public.reallocation_audit_logs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_inc ON public.reallocation_audit_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_res ON public.reallocation_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_realloc_events_status ON public.reallocation_events(status);

ALTER TABLE public.reallocation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reallocation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read reallocation_audit_logs" ON public.reallocation_audit_logs;
CREATE POLICY "Allow authenticated read reallocation_audit_logs"
  ON public.reallocation_audit_logs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write reallocation_audit_logs" ON public.reallocation_audit_logs;
CREATE POLICY "Allow authenticated write reallocation_audit_logs"
  ON public.reallocation_audit_logs FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read reallocation_events" ON public.reallocation_events;
CREATE POLICY "Allow authenticated read reallocation_events"
  ON public.reallocation_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write reallocation_events" ON public.reallocation_events;
CREATE POLICY "Allow authenticated write reallocation_events"
  ON public.reallocation_events FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reallocation_audit_logs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reallocation_events;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

---

### Step 3 of 4 — Execute Reviewed `019` (`019_provider_health_ai_timeline.reviewed.sql`)

Original preserved: [019_provider_health_ai_timeline.sql](file:///c:/Manish/sih1/supabase/migrations/019_provider_health_ai_timeline.sql)  
Reviewed script: [019_provider_health_ai_timeline.reviewed.sql](file:///c:/Manish/sih1/docs/sql/019_provider_health_ai_timeline.reviewed.sql)

```sql
-- ====================================================================
-- REVIEWED EXECUTION SCRIPT FOR MIGRATION 019
-- Adjustment: Remove redundant "Auth upsert provider_health" FOR ALL
--   policy and restrict client writes to authenticated role (Edge
--   Functions write with service_role, which bypasses RLS).
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(100) NOT NULL,
  provider_key VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  last_successful_update TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  records_last_fetch INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  endpoint VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_key ON public.provider_health(provider_key);
CREATE INDEX IF NOT EXISTS idx_provider_health_status ON public.provider_health(status);

CREATE TABLE IF NOT EXISTS public.ai_event_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  source VARCHAR(100),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  resource_id UUID,
  external_event_id UUID,
  reallocation_event_id UUID,
  ai_analysis_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_timeline_occurred ON public.ai_event_timeline(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_event_type ON public.ai_event_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_incident ON public.ai_event_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_severity ON public.ai_event_timeline(severity);

CREATE TABLE IF NOT EXISTS public.ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  model_name VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_session ON public.ai_assistant_conversations(session_id, created_at);

ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select provider_health" ON public.provider_health;
CREATE POLICY "Public select provider_health"
  ON public.provider_health FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public select ai_event_timeline" ON public.ai_event_timeline;
CREATE POLICY "Public select ai_event_timeline"
  ON public.ai_event_timeline FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public select ai_assistant_conversations" ON public.ai_assistant_conversations;
CREATE POLICY "Public select ai_assistant_conversations"
  ON public.ai_assistant_conversations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth upsert provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Auth insert provider_health" ON public.provider_health;
CREATE POLICY "Auth insert provider_health"
  ON public.provider_health FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update provider_health" ON public.provider_health;
CREATE POLICY "Auth update provider_health"
  ON public.provider_health FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert ai_event_timeline" ON public.ai_event_timeline;
CREATE POLICY "Auth insert ai_event_timeline"
  ON public.ai_event_timeline FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert ai_assistant_conversations" ON public.ai_assistant_conversations;
CREATE POLICY "Auth insert ai_assistant_conversations"
  ON public.ai_assistant_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_health;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_event_timeline;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.provider_health (provider_name, provider_key, status, endpoint)
VALUES
  ('IMD India Meteorological Department', 'imd', 'UNKNOWN', 'https://mausam.imd.gov.in'),
  ('USGS Earthquake Hazards Program', 'usgs', 'UNKNOWN', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'),
  ('NASA FIRMS Active Fire', 'nasa_firms', 'UNKNOWN', 'https://firms.modaps.eosdis.nasa.gov'),
  ('Google Gemini AI', 'gemini', 'UNKNOWN', 'https://generativelanguage.googleapis.com'),
  ('Supabase Realtime', 'supabase_realtime', 'UNKNOWN', 'wss://itmeoierfppvoaljebco.supabase.co/realtime/v1')
ON CONFLICT (provider_key) DO NOTHING;
```

---

### Step 4 of 4 — Execute `020_schema_reconciliation.sql`

Source: [020_schema_reconciliation.sql](file:///c:/Manish/sih1/supabase/migrations/020_schema_reconciliation.sql) (must run **only after** `017`, `018`, `019` succeed).

```sql
-- ============================================================================
-- ResQAI Migration 020: Schema Reconciliation & Integrity Hardening
-- Run ONLY AFTER 017, 018, and 019 have completed successfully.
-- ============================================================================

-- 1. Reconcile Enums with Frontend Types & Rules
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'DISPATCHER';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'FIELD_RESPONDER';

ALTER TYPE public.injury_level ADD VALUE IF NOT EXISTS 'CRITICAL';

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NEW_INCIDENT';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'HIGH_PRIORITY_INCIDENT';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NO_RESOURCE_AVAILABLE';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'PARTIAL_RESOURCE_AVAILABILITY';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'REALLOCATION_REQUIRED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RESOURCE_FAILURE';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INCIDENT_ESCALATED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INCIDENT_WAITING';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'RESOURCE_AVAILABLE';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ASSIGNMENT_CHANGED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'DISPATCH_CONFIRMED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'SYSTEM_WARNING';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'SYSTEM_ERROR';

-- 2. Reconcile incidents table (Phase 21 Environmental Risk & Source Tracking)
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS environmental_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (environmental_risk_score >= 0 AND environmental_risk_score <= 100);

CREATE INDEX IF NOT EXISTS idx_incidents_source_type
  ON public.incidents(source_type);

-- 3. Reconcile resources table (Edge Function gemini-assistant compatibility)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS station_name TEXT;

CREATE INDEX IF NOT EXISTS idx_resources_is_active
  ON public.resources(is_active);

-- 4. Reconcile external_events table (externalEventWorkflow.ts incident link)
ALTER TABLE public.external_events
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_external_events_incident
  ON public.external_events(incident_id);

-- 5. Reconcile simulation_runs & simulation_events (003 vs 010/013 conflict)
ALTER TABLE public.simulation_runs
  ADD COLUMN IF NOT EXISTS scenario_id TEXT,
  ADD COLUMN IF NOT EXISTS run_key TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN IF NOT EXISTS speed_multiplier NUMERIC(3,1) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_simulation_runs_run_key
  ON public.simulation_runs(run_key)
  WHERE run_key IS NOT NULL;

ALTER TABLE public.simulation_events
  ADD COLUMN IF NOT EXISTS simulated_time TEXT,
  ADD COLUMN IF NOT EXISTS offset_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';

-- 6. Reconcile handle_new_user() trigger (safe role validation, blocks client ADMIN self-escalation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  safe_role public.user_role;
BEGIN
  requested_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', 'CONTROL_ROOM_OPERATOR'));

  -- Never allow untrusted client signup metadata to self-assign ADMIN
  IF requested_role IN ('CONTROL_ROOM_OPERATOR', 'DISPATCHER', 'FIELD_RESPONDER', 'RESOURCE_OFFICER', 'VIEWER') THEN
    safe_role := requested_role::public.user_role;
  ELSE
    safe_role := 'CONTROL_ROOM_OPERATOR'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    safe_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Normalize seeded provider_health endpoint for supabase_realtime
UPDATE public.provider_health
SET endpoint = '/realtime/v1',
    updated_at = NOW()
WHERE provider_key = 'supabase_realtime'
  AND endpoint LIKE '%itmeoierfppvoaljebco%';

-- 8. Ensure required tables are registered in supabase_realtime publication
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'incidents',
    'resources',
    'resource_assignments',
    'hospitals',
    'incident_updates',
    'notifications',
    'environmental_alerts',
    'external_events',
    'reallocation_events',
    'provider_health',
    'ai_event_timeline'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL;
      END;
    END LOOP;
  END IF;
END $$;
```

---

## 5. Post-Migration Verification Queries (Read-Only)

Run these queries after completing Steps 1–4 to verify every change landed cleanly:

```sql
-- 1. Verify all 5 new tables exist and have RLS enabled
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'reallocation_audit_logs',
    'reallocation_events',
    'provider_health',
    'ai_event_timeline',
    'ai_assistant_conversations'
  )
ORDER BY c.relname;

-- 2. Verify added columns on existing tables (017 & 020)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'environmental_alerts' AND column_name IN ('source_alert_id','region','issued_at','received_at','status','raw_data'))
    OR (table_name = 'incidents' AND column_name = 'environmental_risk_score')
    OR (table_name = 'resources' AND column_name = 'station_name')
    OR (table_name = 'external_events' AND column_name = 'incident_id')
    OR (table_name = 'simulation_runs' AND column_name IN ('scenario_id','run_key','mode','speed_multiplier','config','metrics','completed_at'))
    OR (table_name = 'simulation_events' AND column_name IN ('simulated_time','offset_minutes','status'))
  )
ORDER BY table_name, column_name;

-- 3. Verify updated enums
SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('user_role', 'injury_level', 'notification_type')
GROUP BY t.typname
ORDER BY t.typname;

-- 4. Verify seeded provider_health records (expected: 5 rows, supabase_realtime endpoint = '/realtime/v1')
SELECT provider_key, provider_name, status, endpoint
FROM public.provider_health
ORDER BY provider_key;

-- 5. Verify historical row counts were preserved intact
SELECT 'external_events' AS tbl, COUNT(*) AS rows FROM public.external_events
UNION ALL
SELECT 'external_ingestion_logs', COUNT(*) FROM public.external_ingestion_logs
UNION ALL
SELECT 'weather_observations', COUNT(*) FROM public.weather_observations
UNION ALL
SELECT 'incident_ai_analysis', COUNT(*) FROM public.incident_ai_analysis;

-- 6. Verify Realtime publication membership
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
```

---

## 6. Expected Successful Outputs

| Step | Expected Result in SQL Editor |
| :--- | :--- |
| Migration `017` | `Success. No rows returned` (6 columns + `idx_env_alerts_source_id` + `environmental_alerts` added to `supabase_realtime`). |
| Reviewed `018` | `Success. No rows returned` (2 tables, 4 indexes, 4 RLS policies, 2 tables in `supabase_realtime`). |
| Reviewed `019` | `Success. No rows returned` (3 tables, 7 indexes, 7 RLS policies, 2 tables in `supabase_realtime`, 5 seeded `provider_health` rows). |
| Migration `020` | `Success. No rows returned` (16 enum values, 13 columns, 4 indexes, `handle_new_user()` replaced, `supabase_realtime` endpoint updated to `/realtime/v1`, publication verified). |
| Post-check #4 | 5 rows in `public.provider_health` (`gemini`, `imd`, `nasa_firms`, `supabase_realtime`, `usgs`). |
| Post-check #5 | Exact preservation: `external_events = 313`, `external_ingestion_logs = 38`, `weather_observations = 15`, `incident_ai_analysis = 1`. |

---

## 7. Rollback Considerations

- **Reversible changes (`017`–`020` tables, columns, indexes, publication):**
  - New tables from `018`/`019` can be dropped ONLY if empty/unneeded (`DROP TABLE IF EXISTS public.ai_assistant_conversations, public.ai_event_timeline, public.provider_health, public.reallocation_events, public.reallocation_audit_logs;`).
  - Added columns from `017`/`020` can be reverted with `ALTER TABLE ... DROP COLUMN IF EXISTS ...`.
  - Policies can be restored/adjusted via `DROP POLICY IF EXISTS` / `CREATE POLICY`.
  - `handle_new_user()` can be reverted by re-running the original `012_fy_project_schema.sql` `CREATE OR REPLACE FUNCTION public.handle_new_user() ...` block.
- **Non-directly-droppable PostgreSQL changes (`020` enum additions):**
  - PostgreSQL does **not** support `ALTER TYPE ... DROP VALUE`. Enum additions (`DISPATCHER`, `FIELD_RESPONDER`, `CRITICAL`, 13 `notification_type` labels) are forward-compatible and harmless if unused, so rolling back an enum label would only be necessary via full type recreation or backup restore.
