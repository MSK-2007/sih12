-- ====================================================================
-- REVIEWED EXECUTION SCRIPT FOR MIGRATION 019
-- Original preserved at: supabase/migrations/019_provider_health_ai_timeline.sql
-- Adjustment reason:
--   1. Remove redundant overlapping write policy ("Auth upsert provider_health")
--      while dropping any prior permissive write policy cleanly.
--   2. Restrict client-facing INSERT/UPDATE policies to TO authenticated
--      (blocking unrestricted anonymous writes). Edge Functions using
--      service_role continue to bypass RLS as expected.
-- ====================================================================

-- 1. PROVIDER HEALTH TABLE
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

-- 2. AI EVENT TIMELINE TABLE
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

-- 3. GEMINI ASSISTANT CONVERSATIONS TABLE
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

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Read policies (matches existing public operational dashboard read pattern)
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

-- Write policies (authenticated operators only; Edge Functions use service_role)
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

-- 5. ENABLE REALTIME PUBLICATION
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

-- 6. SEED INITIAL PROVIDER HEALTH RECORDS (IDEMPOTENT)
INSERT INTO public.provider_health (provider_name, provider_key, status, endpoint)
VALUES
  ('IMD India Meteorological Department', 'imd', 'UNKNOWN', 'https://mausam.imd.gov.in'),
  ('USGS Earthquake Hazards Program', 'usgs', 'UNKNOWN', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'),
  ('NASA FIRMS Active Fire', 'nasa_firms', 'UNKNOWN', 'https://firms.modaps.eosdis.nasa.gov'),
  ('Google Gemini AI', 'gemini', 'UNKNOWN', 'https://generativelanguage.googleapis.com'),
  ('Supabase Realtime', 'supabase_realtime', 'UNKNOWN', 'wss://itmeoierfppvoaljebco.supabase.co/realtime/v1')
ON CONFLICT (provider_key) DO NOTHING;
