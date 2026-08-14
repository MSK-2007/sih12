-- =========================================================
-- ResQAI: Intelligent Emergency Response & Resource Allocation
-- Supabase PostgreSQL Initial Migration Schema
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'CONTROL_ROOM_OPERATOR',
  'RESOURCE_OFFICER',
  'VIEWER'
);

CREATE TYPE emergency_type AS ENUM (
  'ROAD_ACCIDENT',
  'FIRE',
  'MEDICAL',
  'FLOOD',
  'BUILDING_COLLAPSE',
  'INDUSTRIAL_ACCIDENT',
  'NATURAL_DISASTER',
  'OTHER'
);

CREATE TYPE injury_level AS ENUM (
  'NONE',
  'MINOR',
  'MODERATE',
  'SEVERE',
  'CRITICAL'
);

CREATE TYPE priority_classification AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE incident_status AS ENUM (
  'REPORTED',
  'ANALYSING',
  'PRIORITIZED',
  'AWAITING_DISPATCH',
  'DISPATCHED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE resource_type AS ENUM (
  'AMBULANCE',
  'FIRE_UNIT',
  'POLICE_UNIT',
  'RESCUE_TEAM'
);

CREATE TYPE resource_status AS ENUM (
  'AVAILABLE',
  'ASSIGNED',
  'BUSY',
  'OFFLINE'
);

CREATE TYPE assignment_status AS ENUM (
  'RECOMMENDED',
  'DISPATCHED',
  'EN_ROUTE',
  'ON_SCENE',
  'REALLOCATED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE hospital_status AS ENUM (
  'OPERATIONAL',
  'NEAR_CAPACITY',
  'FULL',
  'OFFLINE'
);

CREATE TYPE notification_type AS ENUM (
  'CRITICAL_INCIDENT',
  'DISPATCH_RECOMMENDATION',
  'REALLOCATION_PROPOSAL',
  'RESOURCE_OFFLINE',
  'GENERAL'
);

CREATE TYPE simulation_strategy AS ENUM (
  'BASELINE_FCFS',
  'RESQAI_DYNAMIC'
);

CREATE TYPE simulation_status AS ENUM (
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'RESET'
);

-- ---------------------------------------------------------
-- 1. DEPARTMENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. USERS (PROFILES) TABLE
-- ---------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'CONTROL_ROOM_OPERATOR',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3. INCIDENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  emergency_type emergency_type NOT NULL DEFAULT 'MEDICAL',
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  people_affected INTEGER NOT NULL DEFAULT 1 CHECK (people_affected >= 0),
  injury_level injury_level NOT NULL DEFAULT 'MODERATE',
  severity priority_classification NOT NULL DEFAULT 'MEDIUM',
  priority_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_classification priority_classification NOT NULL DEFAULT 'MEDIUM',
  required_resource_types TEXT[] DEFAULT '{}',
  status incident_status NOT NULL DEFAULT 'REPORTED',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 4. RESOURCES TABLE
-- ---------------------------------------------------------
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type resource_type NOT NULL,
  status resource_status NOT NULL DEFAULT 'AVAILABLE',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  current_assignment_id UUID, -- Foreign key added below after assignment table creation
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 5. RESOURCE ASSIGNMENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE resource_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status assignment_status NOT NULL DEFAULT 'RECOMMENDED',
  allocation_score NUMERIC(5,2) CHECK (allocation_score >= 0 AND allocation_score <= 100),
  estimated_eta_minutes NUMERIC(5,1),
  distance_km NUMERIC(6,2),
  rationale JSONB DEFAULT '{}'::jsonb,
  is_reallocation BOOLEAN DEFAULT FALSE,
  reallocated_from_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add self-reference FK to resources for current_assignment_id
ALTER TABLE resources 
ADD CONSTRAINT fk_resources_current_assignment 
FOREIGN KEY (current_assignment_id) REFERENCES resource_assignments(id) ON DELETE SET NULL;

-- ---------------------------------------------------------
-- 6. HOSPITALS TABLE
-- ---------------------------------------------------------
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  emergency_capability TEXT[] DEFAULT '{}',
  total_beds INTEGER NOT NULL DEFAULT 50 CHECK (total_beds >= 0),
  available_beds INTEGER NOT NULL DEFAULT 10 CHECK (available_beds >= 0),
  icu_available INTEGER NOT NULL DEFAULT 2 CHECK (icu_available >= 0),
  status hospital_status NOT NULL DEFAULT 'OPERATIONAL',
  contact_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 7. LOCATIONS / ZONES TABLE
-- ---------------------------------------------------------
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_name TEXT NOT NULL,
  risk_factor NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (risk_factor >= 0.5 AND risk_factor <= 3.0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 8. INCIDENT UPDATES (TIMELINE LOG) TABLE
-- ---------------------------------------------------------
CREATE TABLE incident_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- ---------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'GENERAL',
  related_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  related_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 10. SIMULATION RUNS TABLE
-- ---------------------------------------------------------
CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_name TEXT NOT NULL,
  strategy simulation_strategy NOT NULL DEFAULT 'RESQAI_DYNAMIC',
  status simulation_status NOT NULL DEFAULT 'RUNNING',
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  speed_multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 11. SIMULATION EVENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE simulation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  simulated_timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 12. ANALYTICS RESULTS TABLE
-- ---------------------------------------------------------
CREATE TABLE analytics_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  total_incidents INTEGER DEFAULT 0,
  critical_incidents INTEGER DEFAULT 0,
  resolved_incidents INTEGER DEFAULT 0,
  avg_priority_score NUMERIC(5,2),
  avg_response_time_min NUMERIC(5,2),
  avg_allocation_time_sec NUMERIC(5,2),
  avg_waiting_time_min NUMERIC(5,2),
  resource_utilization_rate NUMERIC(5,2),
  reallocation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- INDEXES FOR FAST QUERY PERFORMANCE
-- ---------------------------------------------------------
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX idx_incidents_classification ON incidents(priority_classification);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_assignments_incident ON resource_assignments(incident_id);
CREATE INDEX idx_assignments_resource ON resource_assignments(resource_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_sim_events_run ON simulation_events(simulation_run_id);

-- ---------------------------------------------------------
-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_results ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read data across operational tables
CREATE POLICY "Allow authenticated read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read resource_assignments" ON resource_assignments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read incident_updates" ON incident_updates FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read simulation_runs" ON simulation_runs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read simulation_events" ON simulation_events FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read analytics_results" ON analytics_results FOR SELECT USING (true);

-- Operational write policies for authenticated users
CREATE POLICY "Allow authenticated write incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Allow authenticated write resources" ON resources FOR ALL USING (true);
CREATE POLICY "Allow authenticated write resource_assignments" ON resource_assignments FOR ALL USING (true);
CREATE POLICY "Allow authenticated write incident_updates" ON incident_updates FOR ALL USING (true);
CREATE POLICY "Allow authenticated write notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow authenticated write simulation_runs" ON simulation_runs FOR ALL USING (true);
CREATE POLICY "Allow authenticated write simulation_events" ON simulation_events FOR ALL USING (true);
CREATE POLICY "Allow authenticated write analytics_results" ON analytics_results FOR ALL USING (true);
