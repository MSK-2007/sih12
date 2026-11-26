-- =========================================================
-- ResQAI Migration 019: Provider Health Tracking + AI Event Timeline
-- Phase 24: Continuous Live Intelligence Pipeline
-- =========================================================

-- 1. PROVIDER HEALTH TABLE
-- Tracks real-time status of all external data providers
CREATE TABLE IF NOT EXISTS provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(100) NOT NULL,           -- IMD, USGS, NASA_FIRMS, GEMINI, SUPABASE
  provider_key VARCHAR(50) NOT NULL UNIQUE,       -- unique key for upsert: 'imd', 'usgs', 'nasa_firms', 'gemini'
  status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN', -- ONLINE, OFFLINE, DEGRADED, STALE, UNKNOWN
  last_successful_update TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  records_last_fetch INTEGER DEFAULT 0,
  response_time_ms INTEGER,                       -- last fetch duration
  endpoint VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_provider_health_key ON provider_health(provider_key);
CREATE INDEX IF NOT EXISTS idx_provider_health_status ON provider_health(status);

-- 2. AI EVENT TIMELINE TABLE
-- Unified operational event log (incidents, env events, AI analysis, reallocation, operator actions)
CREATE TABLE IF NOT EXISTS ai_event_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,              -- INCIDENT_CREATED, PRIORITY_CALCULATED, ENV_EVENT_DETECTED,
                                                  -- GEMINI_ANALYSIS_COMPLETED, RESOURCE_CONFLICT, 
                                                  -- REALLOCATION_RECOMMENDED, OPERATOR_APPROVED, OPERATOR_REJECTED
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50),                          -- CRITICAL, HIGH, MODERATE, LOW, INFO
  source VARCHAR(100),                           -- SYSTEM, GEMINI, IMD, USGS, NASA_FIRMS, OPERATOR
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  resource_id UUID,
  external_event_id UUID,
  reallocation_event_id UUID,
  ai_analysis_id UUID,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_timeline_occurred ON ai_event_timeline(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_event_type ON ai_event_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_incident ON ai_event_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_timeline_severity ON ai_event_timeline(severity);

-- 3. GEMINI ASSISTANT CONVERSATIONS TABLE
-- Stores operator chat sessions with the AI assistant
CREATE TABLE IF NOT EXISTS ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,                     -- 'user' or 'assistant'
  message TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}',           -- operational context at time of message
  model_name VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_session ON ai_assistant_conversations(session_id, created_at);

-- 4. Enable RLS
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Public select provider_health" ON provider_health;
CREATE POLICY "Public select provider_health" ON provider_health FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select ai_event_timeline" ON ai_event_timeline;
CREATE POLICY "Public select ai_event_timeline" ON ai_event_timeline FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select ai_assistant_conversations" ON ai_assistant_conversations;
CREATE POLICY "Public select ai_assistant_conversations" ON ai_assistant_conversations FOR SELECT USING (true);

-- Write policies
DROP POLICY IF EXISTS "Auth insert provider_health" ON provider_health;
CREATE POLICY "Auth insert provider_health" ON provider_health FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth update provider_health" ON provider_health;
CREATE POLICY "Auth update provider_health" ON provider_health FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Auth upsert provider_health" ON provider_health FOR ALL USING (true);

DROP POLICY IF EXISTS "Auth insert ai_event_timeline" ON ai_event_timeline;
CREATE POLICY "Auth insert ai_event_timeline" ON ai_event_timeline FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth insert ai_assistant_conversations" ON ai_assistant_conversations;
CREATE POLICY "Auth insert ai_assistant_conversations" ON ai_assistant_conversations FOR INSERT WITH CHECK (true);

-- 5. Enable Realtime for live updates
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE provider_health;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_event_timeline;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Seed initial provider health records
INSERT INTO provider_health (provider_name, provider_key, status, endpoint)
VALUES
  ('IMD India Meteorological Department', 'imd', 'UNKNOWN', 'https://mausam.imd.gov.in'),
  ('USGS Earthquake Hazards Program', 'usgs', 'UNKNOWN', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'),
  ('NASA FIRMS Active Fire', 'nasa_firms', 'UNKNOWN', 'https://firms.modaps.eosdis.nasa.gov'),
  ('Google Gemini AI', 'gemini', 'UNKNOWN', 'https://generativelanguage.googleapis.com'),
  ('Supabase Realtime', 'supabase_realtime', 'UNKNOWN', 'wss://itmeoierfppvoaljebco.supabase.co/realtime/v1')
ON CONFLICT (provider_key) DO NOTHING;
