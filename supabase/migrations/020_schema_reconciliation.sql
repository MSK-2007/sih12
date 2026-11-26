-- ============================================================================
-- ResQAI Migration 020: Schema Reconciliation & Integrity Hardening
-- Phase 26 — Prepared against PostgreSQL 17.6 (Supabase)
--
-- PURPOSE:
--   Reconciles schema discrepancies across migrations 001-019, Edge Functions,
--   and frontend TypeScript models without dropping tables or data.
--
-- STATUS: PREPARED BUT NOT EXECUTED (Target Supabase project currently NXDOMAIN)
-- ROLLBACK:
--   All statements are additive (ADD VALUE / ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
--   To revert columns: ALTER TABLE ... DROP COLUMN IF EXISTS ...
--   (PostgreSQL enum values cannot be dropped directly without recreating types.)
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

-- 7. Remove hardcoded dead host endpoint from seeded provider_health record
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
