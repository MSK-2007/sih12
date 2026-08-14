-- Migration 010: Emergency Simulation Engine
-- ResQAI Platform Phase 12

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id VARCHAR(255) PRIMARY KEY,
  scenario_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED', 'FAILED')),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('AUTOMATIC', 'MANUAL', 'STEP')),
  speed_multiplier INT DEFAULT 1,
  current_time VARCHAR(20) NOT NULL DEFAULT '10:30:00',
  start_time VARCHAR(20) NOT NULL DEFAULT '10:30:00',
  elapsed_seconds INT DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simulation_events (
  id VARCHAR(255) PRIMARY KEY,
  simulation_run_id VARCHAR(255) REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  simulated_time VARCHAR(20) NOT NULL,
  offset_minutes INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_simulation_events_run ON public.simulation_events(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_simulation_events_status ON public.simulation_events(status);

-- Enable RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Operators can view simulation runs"
  ON public.simulation_runs FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Operators can manage simulation runs"
  ON public.simulation_runs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Operators can manage simulation events"
  ON public.simulation_events FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
