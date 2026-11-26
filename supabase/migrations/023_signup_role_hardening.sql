-- ============================================================================
-- ResQAI Migration 023: Database Signup Privilege Hardening
-- Phase 28.7.1 — Additive hardening for public.handle_new_user()
-- STATUS: LOCALLY AUTHORED — AWAITING OWNER SQL EDITOR EXECUTION
--
-- PURPOSE:
--   Closes the Phase 28.7 audit finding in 020_schema_reconciliation.sql where
--   public.handle_new_user() could accept non-ADMIN privileged role strings
--   (e.g., DISPATCHER, CONTROL_ROOM_OPERATOR, RESOURCE_OFFICER, VIEWER) from
--   user-controlled auth.users.raw_user_meta_data during direct Auth signup.
--
-- GUARANTEES:
--   1. New self-registered users ALWAYS receive 'FIELD_RESPONDER'::public.user_role.
--   2. Forged/missing/invalid raw_user_meta_data->>'role' values are ignored.
--   3. ON CONFLICT (id) DO UPDATE preserves existing role and is_active state.
--   4. Hardened with SECURITY DEFINER + SET search_path = '' and explicit schemas.
--   5. Preserves existing auth.users trigger on_auth_user_created.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email     TEXT;
  v_full_name TEXT;
BEGIN
  v_email := COALESCE(NULLIF(BTRIM(NEW.email), ''), '');
  v_full_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(SPLIT_PART(v_email, '@', 1), ''),
    'ResQAI Responder'
  );

  -- Always assign least-privilege FIELD_RESPONDER regardless of raw_user_meta_data.
  -- On conflict (existing user id), update ONLY non-privileged identity metadata;
  -- never alter role or reset is_active.
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    v_full_name,
    v_email,
    'FIELD_RESPONDER'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(NULLIF(BTRIM(EXCLUDED.full_name), ''), public.profiles.full_name),
    email      = COALESCE(NULLIF(BTRIM(EXCLUDED.email), ''), public.profiles.email),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Preserve existing trigger on auth.users; create only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
