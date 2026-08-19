-- Row Level Security (RLS) Policies for ResQAI

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_results ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current user role
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 1. DEPARTMENTS & LOCATIONS & HOSPITALS
DROP POLICY IF EXISTS "Allow authenticated read departments" ON departments;
CREATE POLICY "Allow authenticated read departments" ON departments FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Allow admin write departments" ON departments;
CREATE POLICY "Allow admin write departments" ON departments FOR ALL USING (get_auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Allow authenticated read locations" ON locations;
CREATE POLICY "Allow authenticated read locations" ON locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write locations" ON locations;
CREATE POLICY "Allow admin write locations" ON locations FOR ALL USING (get_auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Allow authenticated read hospitals" ON hospitals;
CREATE POLICY "Allow authenticated read hospitals" ON hospitals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write hospitals" ON hospitals;
CREATE POLICY "Allow admin write hospitals" ON hospitals FOR ALL USING (get_auth_user_role() = 'ADMIN');

-- 2. PROFILES
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON profiles;
CREATE POLICY "Allow authenticated read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users update own profile" ON profiles;
CREATE POLICY "Allow users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin manage profiles" ON profiles;
CREATE POLICY "Allow admin manage profiles" ON profiles FOR ALL USING (get_auth_user_role() = 'ADMIN');

-- 3. INCIDENTS
DROP POLICY IF EXISTS "Allow authenticated read incidents" ON incidents;
CREATE POLICY "Allow authenticated read incidents" ON incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators create/update incidents" ON incidents;
CREATE POLICY "Allow operators create/update incidents" ON incidents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow operators update incidents" ON incidents;
CREATE POLICY "Allow operators update incidents" ON incidents FOR UPDATE USING (true);

-- 4. RESOURCES
DROP POLICY IF EXISTS "Allow authenticated read resources" ON resources;
CREATE POLICY "Allow authenticated read resources" ON resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators manage resources" ON resources;
CREATE POLICY "Allow operators manage resources" ON resources FOR ALL USING (true);

-- 5. RESOURCE ASSIGNMENTS
DROP POLICY IF EXISTS "Allow authenticated read resource_assignments" ON resource_assignments;
CREATE POLICY "Allow authenticated read resource_assignments" ON resource_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators write assignments" ON resource_assignments;
CREATE POLICY "Allow operators write assignments" ON resource_assignments FOR ALL USING (true);

-- 6. INCIDENT UPDATES & NOTIFICATIONS
DROP POLICY IF EXISTS "Allow authenticated read incident_updates" ON incident_updates;
CREATE POLICY "Allow authenticated read incident_updates" ON incident_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write incident_updates" ON incident_updates;
CREATE POLICY "Allow write incident_updates" ON incident_updates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users read own notifications" ON notifications;
CREATE POLICY "Allow users read own notifications" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users update own notifications" ON notifications;
CREATE POLICY "Allow users update own notifications" ON notifications FOR UPDATE USING (true);

-- 7. SIMULATION & ANALYTICS
DROP POLICY IF EXISTS "Allow authenticated read simulation" ON simulation_runs;
CREATE POLICY "Allow authenticated read simulation" ON simulation_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators manage simulation" ON simulation_runs;
CREATE POLICY "Allow operators manage simulation" ON simulation_runs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read simulation_events" ON simulation_events;
CREATE POLICY "Allow authenticated read simulation_events" ON simulation_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators write simulation_events" ON simulation_events;
CREATE POLICY "Allow operators write simulation_events" ON simulation_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated read analytics_results" ON analytics_results;
CREATE POLICY "Allow authenticated read analytics_results" ON analytics_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow operators write analytics_results" ON analytics_results;
CREATE POLICY "Allow operators write analytics_results" ON analytics_results FOR ALL USING (true);
