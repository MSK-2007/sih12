-- =========================================================
-- ResQAI Migration 016: Gemini AI Context Analysis for External Events
-- Supports external_events AI decision support, validation, and real-time updates
-- =========================================================

-- 1. Extend incident_ai_analysis table to support external event analysis
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS external_event_id UUID REFERENCES public.external_events(id) ON DELETE CASCADE;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'MODERATE';
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS situation_summary TEXT;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS potential_impacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS recommended_resource_types JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS affected_area_assessment TEXT;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS recommended_operator_action TEXT DEFAULT 'REVIEW';
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) DEFAULT 85.0;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS reasoning_summary TEXT;
ALTER TABLE public.incident_ai_analysis ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'COMPLETED';

-- Unique constraint for duplicate analysis prevention on external_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_incident_ai_analysis_external_event'
  ) THEN
    ALTER TABLE public.incident_ai_analysis ADD CONSTRAINT uk_incident_ai_analysis_external_event UNIQUE (external_event_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_external_event ON public.incident_ai_analysis(external_event_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_status ON public.incident_ai_analysis(analysis_status);

-- 3. Row-Level Security (RLS)
ALTER TABLE public.incident_ai_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select incident_ai_analysis" ON public.incident_ai_analysis;
CREATE POLICY "Public select incident_ai_analysis" ON public.incident_ai_analysis FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert incident_ai_analysis" ON public.incident_ai_analysis;
CREATE POLICY "Public insert incident_ai_analysis" ON public.incident_ai_analysis FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update incident_ai_analysis" ON public.incident_ai_analysis;
CREATE POLICY "Public update incident_ai_analysis" ON public.incident_ai_analysis FOR UPDATE USING (true);

-- 4. Enable Supabase Realtime for incident_ai_analysis table
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE incident_ai_analysis;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
