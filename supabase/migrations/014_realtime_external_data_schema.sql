-- =========================================================
-- ResQAI Migration 014: Real-Time External Data Architecture
-- Weather Observations, Environmental Alerts, Data Ingestion Audit
-- =========================================================

-- 1. SOURCE TYPE DOMAIN / ENUM (REAL_TIME, HISTORICAL, SIMULATED, MANUAL, EXTERNAL_ALERT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_source_type') THEN
    CREATE TYPE data_source_type AS ENUM (
      'REAL_TIME',
      'HISTORICAL',
      'SIMULATED',
      'MANUAL',
      'EXTERNAL_ALERT'
    );
  END IF;
END $$;

-- 2. Add source_type to incidents table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE incidents ADD COLUMN source_type data_source_type DEFAULT 'MANUAL';
  END IF;
END $$;

-- 3. WEATHER OBSERVATIONS TABLE
CREATE TABLE IF NOT EXISTS weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL DEFAULT 'IMD_OPEN_DATA',
  location_name VARCHAR(150) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  temperature NUMERIC(5,2),           -- Celsius
  humidity NUMERIC(5,2),              -- Percentage
  rainfall NUMERIC(6,2) DEFAULT 0,    -- mm in last hour/day
  wind_speed NUMERIC(5,2) DEFAULT 0,  -- km/h
  weather_condition VARCHAR(100),     -- Clear, Heavy Rain, Thunderstorm, Fog, etc.
  warning_level VARCHAR(50) DEFAULT 'GREEN', -- GREEN, YELLOW, ORANGE, RED
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Weather Observations
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_observations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_observed_at ON weather_observations(observed_at DESC);

-- 4. ENVIRONMENTAL ALERTS TABLE
CREATE TABLE IF NOT EXISTS environmental_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL DEFAULT 'IMD_NOWCAST',
  alert_type VARCHAR(100) NOT NULL,    -- HEAVY_RAIN, FLOOD, CYCLONE, HEATWAVE, FIRE_HAZARD
  severity VARCHAR(50) NOT NULL DEFAULT 'MODERATE', -- LOW, MODERATE, HIGH, CRITICAL
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  affected_area VARCHAR(255),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Environmental Alerts
CREATE INDEX IF NOT EXISTS idx_env_alerts_location ON environmental_alerts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_env_alerts_starts_at ON environmental_alerts(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_env_alerts_severity ON environmental_alerts(severity);

-- 5. EXTERNAL INGESTION LOGS (Auditability & Reproducibility)
CREATE TABLE IF NOT EXISTS external_ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  observed_at TIMESTAMPTZ,
  data_version VARCHAR(50),
  records_ingested INTEGER DEFAULT 0,
  processing_status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PARTIAL, FAILURE
  error_message TEXT,
  raw_payload_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_ingestion_received ON external_ingestion_logs(received_at DESC);

-- 6. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Permissive read policies for operational user roles
CREATE POLICY "Public select weather_observations" ON weather_observations FOR SELECT USING (true);
CREATE POLICY "Public select environmental_alerts" ON environmental_alerts FOR SELECT USING (true);
CREATE POLICY "Public select external_ingestion_logs" ON external_ingestion_logs FOR SELECT USING (true);

-- Write policies for authenticated / service role
CREATE POLICY "Auth insert weather_observations" ON weather_observations FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth insert environmental_alerts" ON environmental_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth insert external_ingestion_logs" ON external_ingestion_logs FOR INSERT WITH CHECK (true);
