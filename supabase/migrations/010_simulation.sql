-- Migration 010: Emergency Simulation Engine
-- ResQAI Platform Phase 12

CREATE TABLE IF NOT EXISTS public.simulation_runs (
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

CREATE TABLE IF NOT EXISTS public.simulation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  simulated_time TEXT NOT NULL,
  offset_minutes INTEGER DEFAULT 0,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_simulation_events_run ON public.simulation_events(simulation_run_id);

-- Enable RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Operators can view simulation runs" ON public.simulation_runs;
CREATE POLICY "Operators can view simulation runs"
  ON public.simulation_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators can manage simulation runs" ON public.simulation_runs;
CREATE POLICY "Operators can manage simulation runs"
  ON public.simulation_runs FOR ALL USING (true);

DROP POLICY IF EXISTS "Operators can manage simulation events" ON public.simulation_events;
CREATE POLICY "Operators can manage simulation events"
  ON public.simulation_events FOR ALL USING (true);
