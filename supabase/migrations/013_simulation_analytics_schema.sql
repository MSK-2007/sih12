-- =========================================================
-- ResQAI Simulation & Performance Evaluation Schema
-- =========================================================

CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scenario_id TEXT,
  status TEXT NOT NULL DEFAULT 'IDLE',
  mode TEXT NOT NULL DEFAULT 'AUTOMATIC',
  speed_multiplier NUMERIC(3,1) DEFAULT 1.0,
  config JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS simulation_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  people_affected INTEGER DEFAULT 1,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'SYNTHETIC_REPORTED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL, -- 'BASELINE' vs 'RESQAI'
  avg_response_time NUMERIC(5,2) NOT NULL,
  critical_response_time NUMERIC(5,2) NOT NULL,
  avg_allocation_time NUMERIC(5,2) NOT NULL,
  resource_utilization NUMERIC(5,2) NOT NULL,
  allocation_conflicts INTEGER NOT NULL DEFAULT 0,
  unserved_critical_incidents INTEGER NOT NULL DEFAULT 0,
  successfully_served_incidents INTEGER NOT NULL DEFAULT 0,
  reallocation_count INTEGER NOT NULL DEFAULT 0,
  improvement_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  simulated_time TEXT NOT NULL,
  offset_minutes INTEGER DEFAULT 0,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_sim_incidents_run ON simulation_incidents(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_sim_results_run ON simulation_results(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_sim_events_run ON simulation_events(simulation_run_id);

-- Row Level Security (RLS)
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read simulation_runs" ON simulation_runs;
CREATE POLICY "Allow authenticated read simulation_runs" ON simulation_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write simulation_runs" ON simulation_runs;
CREATE POLICY "Allow authenticated write simulation_runs" ON simulation_runs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read simulation_incidents" ON simulation_incidents;
CREATE POLICY "Allow authenticated read simulation_incidents" ON simulation_incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write simulation_incidents" ON simulation_incidents;
CREATE POLICY "Allow authenticated write simulation_incidents" ON simulation_incidents FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read simulation_results" ON simulation_results;
CREATE POLICY "Allow authenticated read simulation_results" ON simulation_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write simulation_results" ON simulation_results;
CREATE POLICY "Allow authenticated write simulation_results" ON simulation_results FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read simulation_events" ON simulation_events;
CREATE POLICY "Allow authenticated read simulation_events" ON simulation_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write simulation_events" ON simulation_events;
CREATE POLICY "Allow authenticated write simulation_events" ON simulation_events FOR ALL USING (true);

-- Realtime publications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE simulation_runs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE simulation_results;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE simulation_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
