-- ====================================================================
-- REVIEWED EXECUTION SCRIPT FOR MIGRATION 018
-- Original preserved at: supabase/migrations/018_dynamic_reallocation_schema.sql
-- Adjustment reason: Replace unrestricted anonymous write policies
--   (FOR ALL USING (true)) with authenticated-only write policies
--   (TO authenticated), while preserving service_role bypass for Edge Functions.
-- ====================================================================

-- 1. REALLOCATION AUDIT LOGS TABLE
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
  operator_action TEXT DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 2. REALLOCATION EVENTS SUMMARY TABLE (State tracking for live operator review)
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

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_realloc_audit_rec ON public.reallocation_audit_logs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_inc ON public.reallocation_audit_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_res ON public.reallocation_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_realloc_events_status ON public.reallocation_events(status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
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

-- 5. SUPABASE REALTIME PUBLICATION SETUP
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
