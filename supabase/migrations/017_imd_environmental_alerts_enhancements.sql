-- =========================================================
-- ResQAI Migration 017: IMD Weather & Environmental Alerts Enhancements
-- Schema updates for India Meteorological Department (IMD) Ingestion
-- =========================================================

-- 1. Safely add missing columns to environmental_alerts table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'source_alert_id') THEN
    ALTER TABLE environmental_alerts ADD COLUMN source_alert_id VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'region') THEN
    ALTER TABLE environmental_alerts ADD COLUMN region VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'issued_at') THEN
    ALTER TABLE environmental_alerts ADD COLUMN issued_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'received_at') THEN
    ALTER TABLE environmental_alerts ADD COLUMN received_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'status') THEN
    ALTER TABLE environmental_alerts ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environmental_alerts' AND column_name = 'raw_data') THEN
    ALTER TABLE environmental_alerts ADD COLUMN raw_data JSONB;
  END IF;
END $$;

-- 2. Create unique index for idempotent duplicate alert prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_env_alerts_source_id 
ON environmental_alerts(source_alert_id) 
WHERE source_alert_id IS NOT NULL;

-- 3. Enable Postgres Realtime publication on environmental_alerts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'environmental_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE environmental_alerts;
  END IF;
END $$;
