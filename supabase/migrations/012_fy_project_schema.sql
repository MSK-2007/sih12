-- =========================================================
-- ResQAI Final Year Project Schema Enhancements & Alignments
-- =========================================================

-- 1. PROFILES TABLE (Supabase Auth reference)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'CONTROL_ROOM_OPERATOR',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to sync updated_at for profiles
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatic profile creation on Supabase user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CONTROL_ROOM_OPERATOR')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. INCIDENT AI ANALYSIS TABLE (Gemini AI server-side output)
CREATE TABLE IF NOT EXISTS incident_ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  urgency TEXT NOT NULL,
  people_affected INTEGER DEFAULT 1,
  required_resources JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  reasons JSONB DEFAULT '[]'::jsonb,
  model_name TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ALIGN EXTRA FIELDS ON EXISTING TABLES
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE resource_assignments ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE resource_assignments ADD COLUMN IF NOT EXISTS eta_minutes NUMERIC(5,1);

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_available TEXT[] DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS trauma_capability BOOLEAN DEFAULT TRUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS bed_capacity INTEGER DEFAULT 50;

ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE incident_updates ADD COLUMN IF NOT EXISTS status TEXT;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_incident_ai_incident ON incident_ai_analysis(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS for profiles
CREATE POLICY "Allow users to view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  )
);

-- RLS for incident_ai_analysis
CREATE POLICY "Allow authenticated read incident_ai_analysis" ON incident_ai_analysis FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write incident_ai_analysis" ON incident_ai_analysis FOR ALL USING (true);

-- RLS for audit_logs
CREATE POLICY "Allow authenticated read audit_logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- 7. REALTIME PUBLICATION SETUP
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE incident_ai_analysis;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
