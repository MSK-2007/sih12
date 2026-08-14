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

-- 1. DEPARTMENTS & LOCATIONS & HOSPITALS (Read for all authenticated users, write for ADMIN)
CREATE POLICY "Allow authenticated read departments" ON departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write departments" ON departments FOR ALL USING (get_auth_user_role() = 'ADMIN');

CREATE POLICY "Allow authenticated read locations" ON locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write locations" ON locations FOR ALL USING (get_auth_user_role() = 'ADMIN');

CREATE POLICY "Allow authenticated read hospitals" ON hospitals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write hospitals" ON hospitals FOR ALL USING (get_auth_user_role() = 'ADMIN');

-- 2. PROFILES
CREATE POLICY "Allow authenticated read profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin manage profiles" ON profiles FOR ALL USING (get_auth_user_role() = 'ADMIN');

-- 3. INCIDENTS
CREATE POLICY "Allow authenticated read incidents" ON incidents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators create/update incidents" ON incidents FOR INSERT WITH CHECK (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));
CREATE POLICY "Allow operators update incidents" ON incidents FOR UPDATE USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));

-- 4. RESOURCES
CREATE POLICY "Allow authenticated read resources" ON resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators manage resources" ON resources FOR ALL USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));
CREATE POLICY "Allow officers update assigned resource status" ON resources FOR UPDATE USING (
  get_auth_user_role() = 'RESOURCE_OFFICER'
);

-- 5. RESOURCE ASSIGNMENTS
CREATE POLICY "Allow authenticated read resource_assignments" ON resource_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators write assignments" ON resource_assignments FOR ALL USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));
CREATE POLICY "Allow officers update relevant assignments" ON resource_assignments FOR UPDATE USING (
  get_auth_user_role() = 'RESOURCE_OFFICER'
);

-- 6. INCIDENT UPDATES & NOTIFICATIONS
CREATE POLICY "Allow authenticated read incident_updates" ON incident_updates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow write incident_updates" ON incident_updates FOR INSERT WITH CHECK (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR', 'RESOURCE_OFFICER'));

CREATE POLICY "Allow users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id OR get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));
CREATE POLICY "Allow users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 7. SIMULATION & ANALYTICS
CREATE POLICY "Allow authenticated read simulation" ON simulation_runs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators manage simulation" ON simulation_runs FOR ALL USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));

CREATE POLICY "Allow authenticated read simulation_events" ON simulation_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators write simulation_events" ON simulation_events FOR ALL USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));

CREATE POLICY "Allow authenticated read analytics_results" ON analytics_results FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow operators write analytics_results" ON analytics_results FOR ALL USING (get_auth_user_role() IN ('ADMIN', 'CONTROL_ROOM_OPERATOR'));
