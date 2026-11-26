# RESQAI — PHASE 3: FIRST ADMIN ACCOUNT PROMOTION

**Date:** 2026-11-26  
**Project Root:** `c:\Manish\sih1`  
**Supabase Project:** `resqai` (`itmeoierfppvoaljebco`)  
**Target Account Email:** `manishshivakumar178@gmail.com`  
**Execution Status:** **NOT EXECUTED YET** — Prepared for owner execution in **Supabase Dashboard → SQL Editor**.

> **Remote Pre-Check Boundary:** Because [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) blocks anonymous PostgREST reads on `public.profiles` (`HTTP 401 / 42501`), `auth.users` is internal to PostgreSQL, and no database password or `service_role` key is stored locally, this workspace **cannot** directly inspect live `auth.users` or `public.profiles` rows remotely. Instead, run **Section 2 (Read-Only Precheck)** first in SQL Editor, and the **Section 3 Promotion Script** also enforces all preconditions atomically inside `BEGIN; ... COMMIT;` before modifying any row.

---

## 1. Compatibility & Security Verification (`021`, `022`, `023`)

Inspected against [PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md), [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql), [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql), and [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql):

- **Migration `021`:** Targets `incidents`, `resources`, and `resource_assignments` only; zero conflict with `profiles` or `audit_logs`.
- **Migration `022`:** `trg_guard_profile_privilege_columns` (`BEFORE UPDATE ON public.profiles`) permits updates when `session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL` — which is true in **Supabase Dashboard SQL Editor** and **false** for all PostgREST `authenticated` HTTP users. No triggers or RLS policies are weakened or disabled.
- **Migration `023`:** `on_auth_user_created` (`AFTER INSERT ON auth.users` → `public.handle_new_user()`) assigns `'FIELD_RESPONDER'::public.user_role` to newly created Auth users (ignoring metadata) and omits `role` and `is_active` in `ON CONFLICT (id) DO UPDATE`. Whether `manishshivakumar178@gmail.com` currently has a `'FIELD_RESPONDER'` profile row or no profile row yet, the script below safely updates or creates **only** that profile row to `'ADMIN'::public.user_role` with `is_active = TRUE` and will never be overwritten by `023`.

---

## 2. Step 1 — Read-Only Pre-Flight Check (Run First in SQL Editor)

Execute this **read-only** SQL in **Supabase Dashboard → SQL Editor** (`itmeoierfppvoaljebco`) before running the promotion script:

```sql
-- PRECHECK 1: Confirm zero ADMIN accounts currently exist (must return 0 rows)
SELECT id, full_name, email, role, is_active, created_at
FROM public.profiles
WHERE role::text = 'ADMIN';

-- PRECHECK 2: Confirm manishshivakumar178@gmail.com exists once, is verified, non-deleted, and unbanned
SELECT
  u.id AS auth_user_id,
  u.email,
  u.email_confirmed_at,
  u.deleted_at,
  u.banned_until,
  (p.id IS NOT NULL) AS profile_exists,
  p.role AS current_profile_role,
  p.is_active AS current_profile_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('manishshivakumar178@gmail.com'));
```

**Stop Rules:**
- If **PRECHECK 1** returns any row: **STOP.** An `ADMIN` already exists; do not run Section 3.
- If **PRECHECK 2** returns `0` rows, `> 1` row, `email_confirmed_at IS NULL`, `deleted_at IS NOT NULL`, or an active future `banned_until`: resolve that in **Authentication → Users** first.

---

## 3. Step 2 — Owner First `ADMIN` Promotion SQL Script

Run this complete transaction in **Supabase Dashboard → SQL Editor** (executes as `postgres`). It creates no new Auth user and rolls back cleanly if any precondition fails:

```sql
-- ============================================================================
-- RESQAI — PHASE 3: FIRST ADMIN ACCOUNT PROMOTION (ONE-TIME OWNER EXECUTION)
-- Project: itmeoierfppvoaljebco
-- Target Email: manishshivakumar178@gmail.com
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_target_email         TEXT := LOWER(TRIM('manishshivakumar178@gmail.com'));
  v_match_count          INTEGER := 0;
  v_admin_count          INTEGER := 0;
  v_email_collision      INTEGER := 0;
  v_role_udt             TEXT;

  v_target_id            UUID;
  v_canonical_email      TEXT;
  v_confirmed_at         TIMESTAMPTZ;
  v_deleted_at           TIMESTAMPTZ;
  v_banned_until         TIMESTAMPTZ;
  v_raw_meta             JSONB;

  v_profile_exists       BOOLEAN := FALSE;
  v_prev_role            TEXT;
  v_prev_active          BOOLEAN;
  v_prev_name            TEXT;
  v_resolved_name        TEXT;
BEGIN
  -- 1. Enforce trusted database-owner SQL Editor context (022 trigger contract)
  IF NOT (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Forbidden: first ADMIN promotion requires trusted SQL Editor owner execution (session_user=%, auth.uid()=%)',
      session_user, auth.uid()
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Confirm target Auth account exists exactly once (non-deleted)
  SELECT COUNT(*)
  INTO v_match_count
  FROM auth.users
  WHERE LOWER(TRIM(email)) = v_target_email
    AND deleted_at IS NULL;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'Aborted: no non-deleted auth.users account found for %.', v_target_email;
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Aborted: % non-deleted auth.users rows match % (ambiguous).', v_match_count, v_target_email;
  END IF;

  -- 3. Resolve Auth UUID & verify confirmed, non-deleted, non-banned state
  SELECT id, email, email_confirmed_at, deleted_at, banned_until, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_target_id, v_canonical_email, v_confirmed_at, v_deleted_at, v_banned_until, v_raw_meta
  FROM auth.users
  WHERE LOWER(TRIM(email)) = v_target_email
    AND deleted_at IS NULL;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aborted: auth.users account % is deleted.', v_target_id;
  END IF;

  IF v_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Aborted: auth.users account % (%) is not email-verified (email_confirmed_at IS NULL).', v_target_id, v_canonical_email;
  END IF;

  IF v_banned_until IS NOT NULL AND v_banned_until > NOW() THEN
    RAISE EXCEPTION 'Aborted: auth.users account % (%) is banned until %.', v_target_id, v_canonical_email, v_banned_until;
  END IF;

  -- 4. Confirm public.profiles.role uses expected enum public.user_role
  SELECT udt_name
  INTO v_role_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role';

  IF v_role_udt IS DISTINCT FROM 'user_role' THEN
    RAISE EXCEPTION 'Aborted: expected public.profiles.role udt_name = user_role, found %.', COALESCE(v_role_udt, '<missing>');
  END IF;

  -- 5. Abort if ANY ADMIN already exists (do not overwrite or demote anyone)
  SELECT COUNT(*)
  INTO v_admin_count
  FROM public.profiles
  WHERE role::text = 'ADMIN';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'Aborted: % ADMIN profile(s) already exist. Refusing to overwrite or add duplicate bootstrap ADMIN.', v_admin_count;
  END IF;

  -- 6. Abort if another profile UUID holds this email
  SELECT COUNT(*)
  INTO v_email_collision
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_canonical_email))
    AND id <> v_target_id;

  IF v_email_collision > 0 THEN
    RAISE EXCEPTION 'Aborted: email % is already assigned to a different UUID in public.profiles.', v_canonical_email;
  END IF;

  -- 7. Inspect existing profile row if present
  SELECT TRUE, role::text, is_active, full_name
  INTO v_profile_exists, v_prev_role, v_prev_active, v_prev_name
  FROM public.profiles
  WHERE id = v_target_id;

  v_resolved_name := COALESCE(
    NULLIF(TRIM(v_raw_meta->>'full_name'), ''),
    NULLIF(TRIM(v_prev_name), ''),
    NULLIF(TRIM(SPLIT_PART(v_canonical_email, '@', 1)), ''),
    'ResQAI System Administrator'
  );

  -- 8. Promote ONLY target user to ADMIN and set is_active = TRUE
  IF NOT COALESCE(v_profile_exists, FALSE) THEN
    INSERT INTO public.profiles (id, full_name, email, role, is_active)
    VALUES (
      v_target_id,
      v_resolved_name,
      v_canonical_email,
      'ADMIN'::public.user_role,
      TRUE
    );
  ELSE
    UPDATE public.profiles
    SET
      full_name  = v_resolved_name,
      email      = v_canonical_email,
      role       = 'ADMIN'::public.user_role,
      is_active  = TRUE,
      updated_at = NOW()
    WHERE id = v_target_id;
  END IF;

  -- 9. Write immutable audit event (NULL actor user_id; accurate session_user attribution)
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    NULL,
    'ADMIN_ACTION',
    'profile',
    v_target_id::text,
    CASE
      WHEN COALESCE(v_profile_exists, FALSE)
        THEN jsonb_build_object(
          'profile_existed', TRUE,
          'role', v_prev_role,
          'is_active', v_prev_active
        )
      ELSE NULL
    END,
    jsonb_build_object(
      'event', 'FIRST_ADMIN_BOOTSTRAP',
      'actor_session_user', session_user,
      'target_user_id', v_target_id::text,
      'target_email', v_canonical_email,
      'profile_created', NOT COALESCE(v_profile_exists, FALSE),
      'role', 'ADMIN',
      'is_active', TRUE
    )
  );

  RAISE NOTICE 'SUCCESS: Promoted first ADMIN for user_id=%, email=%, profile_created=%',
    v_target_id, v_canonical_email, NOT COALESCE(v_profile_exists, FALSE);
END $$;

COMMIT;
```

---

## 4. Step 3 — Post-Execution Verification Queries (Read-Only)

Run these immediately after executing Section 3, and share the results before claiming promotion is live:

```sql
-- 1. Confirm exactly ONE active ADMIN exists and matches manishshivakumar178@gmail.com
SELECT id, full_name, email, role, is_active, created_at, updated_at
FROM public.profiles
WHERE role::text = 'ADMIN';

-- 2. Confirm audit record was written to public.audit_logs
SELECT id, user_id, action, entity_type, entity_id, old_value, new_value, created_at
FROM public.audit_logs
WHERE action = 'ADMIN_ACTION'
  AND new_value->>'event' = 'FIRST_ADMIN_BOOTSTRAP'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Confirm role distribution across public.profiles
SELECT role, is_active, COUNT(*) AS count
FROM public.profiles
GROUP BY role, is_active
ORDER BY role, is_active;
```

---

## 5. Rollback Guidance (Owner SQL Editor Only)

If you need to revert this promotion without deleting audit history:

```sql
BEGIN;

DO $$
DECLARE
  v_target_id UUID;
  v_prev_role TEXT;
BEGIN
  IF NOT (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Forbidden: rollback requires trusted SQL Editor owner execution';
  END IF;

  SELECT id, role::text
  INTO v_target_id, v_prev_role
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM('manishshivakumar178@gmail.com'))
    AND role::text = 'ADMIN';

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No ADMIN profile found for manishshivakumar178@gmail.com';
  END IF;

  UPDATE public.profiles
  SET role = 'FIELD_RESPONDER'::public.user_role,
      updated_at = NOW()
  WHERE id = v_target_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    NULL,
    'ADMIN_ACTION',
    'profile',
    v_target_id::text,
    jsonb_build_object('role', v_prev_role),
    jsonb_build_object(
      'event', 'FIRST_ADMIN_BOOTSTRAP_REVERTED',
      'actor_session_user', session_user,
      'target_email', 'manishshivakumar178@gmail.com',
      'role', 'FIELD_RESPONDER'
    )
  );
END $$;

COMMIT;
```
