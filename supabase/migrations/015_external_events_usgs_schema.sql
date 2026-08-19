-- =========================================================
-- ResQAI Migration 015: External Events & USGS Earthquake Ingestion
-- Table for storing live USGS seismic events with Supabase Realtime enabled
-- =========================================================

-- 1. Create external_events table
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL DEFAULT 'USGS',
  source_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL DEFAULT 'EARTHQUAKE',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  magnitude NUMERIC(4,2) NOT NULL DEFAULT 0.0,
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'INFORMATIONAL', -- INFORMATIONAL, LOW, MODERATE, HIGH, CRITICAL
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',        -- DETECTED, UNDER_REVIEW, CONVERTED_TO_INCIDENT, ARCHIVED
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint preventing duplicate ingestion of same event from source
  CONSTRAINT uk_external_events_source_id UNIQUE (source, source_event_id)
);

-- 2. Indexes for fast geospatial and chronological queries
CREATE INDEX IF NOT EXISTS idx_external_events_location ON external_events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_external_events_occurred_at ON external_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_events_severity ON external_events(severity);
CREATE INDEX IF NOT EXISTS idx_external_events_source ON external_events(source);

-- 3. Row-Level Security (RLS)
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read external_events" ON external_events;
CREATE POLICY "Public read external_events" ON external_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert external_events" ON external_events;
CREATE POLICY "Public insert external_events" ON external_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update external_events" ON external_events;
CREATE POLICY "Public update external_events" ON external_events FOR UPDATE USING (true);

-- 4. Enable Supabase Realtime for external_events table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE external_events;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication update skipped or table already published.';
END $$;
