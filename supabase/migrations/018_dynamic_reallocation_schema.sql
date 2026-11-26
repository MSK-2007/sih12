-- ====================================================================
-- ResQAI Migration 018: Dynamic Resource Reallocation Audit Log Schema
-- ====================================================================

-- 1. REALLOCATION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS reallocation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id TEXT NOT NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS reallocation_events (
  id TEXT PRIMARY KEY,
  trigger_incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  recommendation_data JSONB NOT NULL,
  current_quality NUMERIC(5,2),
  proposed_quality NUMERIC(5,2),
  improvement NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'PENDING_OPERATOR_REVIEW',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_realloc_audit_rec ON reallocation_audit_logs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_inc ON reallocation_audit_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_realloc_audit_res ON reallocation_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_realloc_events_status ON reallocation_events(status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE reallocation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reallocation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read reallocation_audit_logs" ON reallocation_audit_logs;
CREATE POLICY "Allow authenticated read reallocation_audit_logs" ON reallocation_audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write reallocation_audit_logs" ON reallocation_audit_logs;
CREATE POLICY "Allow authenticated write reallocation_audit_logs" ON reallocation_audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read reallocation_events" ON reallocation_events;
CREATE POLICY "Allow authenticated read reallocation_events" ON reallocation_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write reallocation_events" ON reallocation_events;
CREATE POLICY "Allow authenticated write reallocation_events" ON reallocation_events FOR ALL USING (true);

-- 5. SUPABASE REALTIME PUBLICATION SETUP
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reallocation_audit_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reallocation_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
