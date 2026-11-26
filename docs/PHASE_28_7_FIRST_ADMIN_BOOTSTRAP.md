# RESQAI — PHASE 28.7: SECURE FIRST ADMIN ACCOUNT BOOTSTRAP

**Date:** 2026-11-26  
**Project:** `c:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco` (`https://itmeoierfppvoaljebco.supabase.co`)  
**Prerequisite State:** Migrations `017`–`022` executed by project owner; local Phase 28.3 security remediations verified.

**Final Verdict:** `READY FOR OWNER ADMIN BOOTSTRAP`

---

## 1. Phase A — Pre-Bootstrap Audit Findings

Audit conducted across [PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md](file:///c:/Manish/sih1/docs/PHASE_26_2_MIGRATION_EXECUTION_GUIDE.md), [PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md), [PHASE_28_3_SECURITY_REMEDIATION_REPORT.md](file:///c:/Manish/sih1/docs/PHASE_28_3_SECURITY_REMEDIATION_REPORT.md), [002_enums.sql](file:///c:/Manish/sih1/supabase/migrations/002_enums.sql), [003_tables.sql](file:///c:/Manish/sih1/supabase/migrations/003_tables.sql), [012_fy_project_schema.sql](file:///c:/Manish/sih1/supabase/migrations/012_fy_project_schema.sql), [020_schema_reconciliation.sql](file:///c:/Manish/sih1/supabase/migrations/020_schema_reconciliation.sql), [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql), [rbac.ts](file:///c:/Manish/sih1/src/security/rbac.ts), [authGuard.ts](file:///c:/Manish/sih1/src/services/authGuard.ts), and [AuthContext.tsx](file:///c:/Manish/sih1/src/context/AuthContext.tsx) (actual workspace path is `src/context/AuthContext.tsx`, not `src/contexts/`):

1. **Exact `public.user_role` Database Enum Values:**
   - [002_enums.sql](file:///c:/Manish/sih1/supabase/migrations/002_enums.sql) defines `user_role`: `'ADMIN'`, `'CONTROL_ROOM_OPERATOR'`, `'RESOURCE_OFFICER'`, `'VIEWER'`.
   - [020_schema_reconciliation.sql](file:///c:/Manish/sih1/supabase/migrations/020_schema_reconciliation.sql) adds `'DISPATCHER'` and `'FIELD_RESPONDER'`.
   - Application RBAC ([rbac.ts](file:///c:/Manish/sih1/src/security/rbac.ts)) supports `'ADMIN'`, `'DISPATCHER'`, and `'FIELD_RESPONDER'` (mapping legacy `'CONTROL_ROOM_OPERATOR'` to `'DISPATCHER'`). The canonical admin role enum literal is `'ADMIN'::public.user_role`.
2. **Existing Profile Status for Target Auth User:**
   - Because `022` revoked anonymous `public` schema/table privileges (`HTTP 401` / SQLSTATE `42501` verified earlier) and `auth.users` is internal, remote `auth.users` and `public.profiles` rows cannot be inspected via the frontend `anon` key.
   - Under `on_auth_user_created` (`AFTER INSERT ON auth.users` from [012_fy_project_schema.sql](file:///c:/Manish/sih1/supabase/migrations/012_fy_project_schema.sql)), any newly registered `auth.users` account normally receives an initial `public.profiles` row automatically via `public.handle_new_user()`. If an `auth.users` row pre-dated `012` or was created before trigger reconciliation, its `public.profiles` row may be absent. The bootstrap script below checks `public.profiles` first and handles both `INSERT` and `UPDATE` cleanly.
3. **Initial Role Assignment & Signup Trigger Behavior:**
   - **Frontend (`AuthContext.tsx` + `rbac.ts`):** `signUp()` calls `validateSelfSignupRole(requestedRole)`, allowing **only** `'FIELD_RESPONDER'` and rejecting `'ADMIN'`, `'DISPATCHER'`, `'CONTROL_ROOM_OPERATOR'`, and `'RESOURCE_OFFICER'` with `ACCESS_DENIED` audit logs.
   - **Database (`handle_new_user()` in [020_schema_reconciliation.sql](file:///c:/Manish/sih1/supabase/migrations/020_schema_reconciliation.sql)):** Blocks `'ADMIN'` on signup (falling back to `'CONTROL_ROOM_OPERATOR'`), and its `ON CONFLICT (id) DO UPDATE` preserves any existing `role` (it updates only `full_name`, `email`, `updated_at`).
   - *Security Observation (Non-blocking for Bootstrap):* `handle_new_user()` in `020` still accepts `'DISPATCHER'`/`'CONTROL_ROOM_OPERATOR'` if someone calls the Supabase Auth signup API directly with forged `raw_user_meta_data` bypassing the ResQAI UI. Keep email verification enabled, never expose self-signup for privileged roles, and consider tightening `handle_new_user()` to `'FIELD_RESPONDER'` only in a future follow-up migration.
4. **Validity of `guard_profile_privilege_columns()` SQL Editor Bypass (`022`):**
   - Trigger `trg_guard_profile_privilege_columns` (`BEFORE UPDATE ON public.profiles`) executes:
     ```sql
     IF auth.role() = 'service_role'
        OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
       RETURN NEW;
     END IF;
     ```
   - In **Supabase Dashboard SQL Editor**, PostgreSQL executes under `session_user = 'postgres'` (or `'supabase_admin'`) with `auth.uid() IS NULL`. Therefore the owner SQL Editor execution **validly bypasses** the non-admin `is_admin()` exception **without** disabling the trigger or RLS.
   - Via PostgREST `authenticated` HTTP sessions (`session_user = 'authenticator'`, `auth.uid() IS NOT NULL`), the bypass **never** triggers—so no signed-in `FIELD_RESPONDER` or `DISPATCHER` can self-promote.
5. **Safety When Zero `ADMIN` Exists & Trusted Owner Restriction:**
   - When zero `ADMIN` profiles exist, `public.is_admin()` returns `FALSE` for all HTTP callers, and PostgREST `authenticated` users can neither set `role = 'ADMIN'` nor call `updateUserRoleAsAdmin()` (`src/services/authGuard.ts`).
   - **Gaps Found in Prior [PHASE_28_1_DEPLOYMENT_AUDIT.md](file:///c:/Manish/sih1/docs/PHASE_28_1_DEPLOYMENT_AUDIT.md) Bootstrap Snippet:**
     1. Required raw UUID input instead of looking up and validating a unique owner-supplied email.
     2. Did **not** fail if an `ADMIN` already existed in `public.profiles`.
     3. Did **not** explicitly fail if invoked outside a trusted `postgres`/`supabase_admin` (`auth.uid() IS NULL`) context or check `profiles.role` column type / email collisions / banned accounts.
     4. Lacked an explicit `BEGIN; ... COMMIT;` transaction wrapper.
   - All four gaps are fixed in the Phase B script below without modifying migrations `021` or `022`.

---

## 2. Phase B — Pre-Flight Read-Only Check (Run First in SQL Editor)

Before executing the bootstrap script, run this **read-only** query in **Supabase Dashboard → SQL Editor** to confirm your target account exists, is verified, and no `ADMIN` exists yet:

```sql
-- PRECHECK A: Confirm no ADMIN exists yet (expected: 0 rows)
SELECT id, full_name, email, role, is_active, created_at
FROM public.profiles
WHERE role::text = 'ADMIN';

-- PRECHECK B: Inspect target user in auth.users and any matching profile row
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
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM('<OWNER_VERIFIED_ADMIN_EMAIL>'));
```

**Pre-Flight Stop Rules:**
- If Precheck A returns any row, an `ADMIN` already exists — **do not run** the bootstrap script.
- If Precheck B returns `0` rows, `> 1` row, `email_confirmed_at IS NULL`, or `deleted_at IS NOT NULL`, create/verify the user normally through Supabase Authentication first (never invent users or passwords inside SQL).

---

## 3. One-Time Owner Bootstrap SQL Script (Transactional & Fail-Closed)

Replace **`<OWNER_VERIFIED_ADMIN_EMAIL>`** with the exact email of your existing verified `auth.users` account and run in **Supabase Dashboard → SQL Editor** (runs as `postgres`).  
*(Do NOT modify `021` or `022`, do NOT disable triggers/RLS, and do NOT expose `service_role` keys.)*

```sql
-- ============================================================================
-- RESQAI — ONE-TIME FIRST ADMIN BOOTSTRAP (OWNER SQL EDITOR ONLY)
-- Project: itmeoierfppvoaljebco
-- Security: Transaction-wrapped, fails closed on any ambiguity, existing ADMIN,
--           unverified/deleted/banned Auth account, or non-owner session.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  -- Replace ONLY the placeholder below with your verified Supabase Auth email:
  v_input_email          TEXT := '<OWNER_VERIFIED_ADMIN_EMAIL>';
  v_target_email         TEXT;
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
  -- 1. Enforce trusted database-owner SQL Editor execution (matches 022 trigger contract)
  IF NOT (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Forbidden: first ADMIN bootstrap may only be executed by trusted database owner in SQL Editor (session_user=%, auth.uid()=%)',
      session_user, auth.uid()
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Validate email placeholder was replaced
  v_target_email := LOWER(TRIM(COALESCE(v_input_email, '')));
  IF v_target_email = ''
     OR v_target_email = LOWER('<OWNER_VERIFIED_ADMIN_EMAIL>')
     OR POSITION('@' IN v_target_email) = 0 THEN
    RAISE EXCEPTION 'Aborted: replace <OWNER_VERIFIED_ADMIN_EMAIL> with a valid verified auth.users email address.';
  END IF;

  -- 3. Confirm target user exists exactly once in auth.users
  SELECT COUNT(*)
  INTO v_match_count
  FROM auth.users
  WHERE LOWER(TRIM(email)) = v_target_email
    AND deleted_at IS NULL;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'Aborted: no non-deleted auth.users account found matching email %.', v_target_email;
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Aborted: ambiguous target — % non-deleted auth.users accounts match email %.', v_match_count, v_target_email;
  END IF;

  -- 4. Resolve Auth UUID & verify account state (confirmed, non-deleted, unbanned)
  SELECT id, email, email_confirmed_at, deleted_at, banned_until, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_target_id, v_canonical_email, v_confirmed_at, v_deleted_at, v_banned_until, v_raw_meta
  FROM auth.users
  WHERE LOWER(TRIM(email)) = v_target_email
    AND deleted_at IS NULL;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aborted: auth.users account % is deleted.', v_target_id;
  END IF;

  IF v_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Aborted: auth.users account % (%) has not confirmed its email.', v_target_id, v_canonical_email;
  END IF;

  IF v_banned_until IS NOT NULL AND v_banned_until > NOW() THEN
    RAISE EXCEPTION 'Aborted: auth.users account % (%) is currently banned until %.', v_target_id, v_canonical_email, v_banned_until;
  END IF;

  -- 5. Verify profiles.role uses expected enum public.user_role
  SELECT udt_name
  INTO v_role_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role';

  IF v_role_udt IS DISTINCT FROM 'user_role' THEN
    RAISE EXCEPTION 'Aborted: expected public.profiles.role udt_name = user_role, found %.', COALESCE(v_role_udt, '<missing>');
  END IF;

  -- 6. Abort if ANY ADMIN already exists in public.profiles (one-time bootstrap only)
  SELECT COUNT(*)
  INTO v_admin_count
  FROM public.profiles
  WHERE role::text = 'ADMIN';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'Aborted: % ADMIN profile(s) already exist. Use authenticated ADMIN role management instead of first-admin bootstrap.', v_admin_count;
  END IF;

  -- 7. Check for conflicting profile email on a different UUID
  SELECT COUNT(*)
  INTO v_email_collision
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_canonical_email))
    AND id <> v_target_id;

  IF v_email_collision > 0 THEN
    RAISE EXCEPTION 'Aborted: public.profiles already has another row with email % belonging to a different user UUID.', v_canonical_email;
  END IF;

  -- 8. Check whether target profile row already exists
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

  -- 9. Create or update ONLY the target user's profile with canonical ADMIN enum + is_active = TRUE
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

  -- 10. Record audit event with NULL actor user_id (do not invent or spoof actor UUID)
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

  RAISE NOTICE 'SUCCESS: Bootstrapped first ADMIN for user_id=%, email=%, profile_created=%',
    v_target_id, v_canonical_email, NOT COALESCE(v_profile_exists, FALSE);
END $$;

COMMIT;
```

### Expected Successful Output
In Supabase Dashboard SQL Editor:
- Notice message:  
  `NOTICE:  SUCCESS: Bootstrapped first ADMIN for user_id=<uuid>, email=<your-email>, profile_created=<true|false>`
- Query status: `Success. No rows returned` (or `COMMIT` confirmation).
- On any invalid state (unreplaced email, missing/unverified/deleted/duplicate user, existing `ADMIN`, or email collision), PostgreSQL raises an exception and rolls back the entire transaction with **zero** rows modified.

---

## 4. Post-Bootstrap Verification Queries (Read-Only)

Run these queries immediately after `COMMIT` to verify exact state:

```sql
-- 1. Confirm exactly ONE active ADMIN profile exists
SELECT id, full_name, email, role, is_active, created_at, updated_at
FROM public.profiles
WHERE role::text = 'ADMIN';

-- 2. Confirm bootstrap audit entry recorded cleanly with user_id IS NULL
SELECT id, user_id, action, entity_type, entity_id, old_value, new_value, created_at
FROM public.audit_logs
WHERE action = 'ADMIN_ACTION'
  AND new_value->>'event' = 'FIRST_ADMIN_BOOTSTRAP'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Confirm no other unexpected privileged profiles exist
SELECT role, is_active, COUNT(*) AS user_count
FROM public.profiles
GROUP BY role, is_active
ORDER BY role, is_active;
```

**Application Smoke Verification (Once Bootstrapped):**
1. Sign in via `/login` with the bootstrapped `ADMIN` email and password.
2. Confirm `AuthContext` resolves `profile.role = 'ADMIN'` and `isActive = true`.
3. Confirm access to protected operator routes and `audit_logs` reads, while confirming `FIELD_RESPONDER` accounts still cannot call `updateUserRoleAsAdmin()` or modify `profiles.role`.

---

## 5. Rollback & Recovery Guidance

If the wrong user was promoted or you must revert the bootstrap before creating a replacement `ADMIN`:

```sql
BEGIN;

DO $$
DECLARE
  v_revert_email TEXT := '<OWNER_VERIFIED_ADMIN_EMAIL>';
  v_target_id    UUID;
  v_prev_role    TEXT;
BEGIN
  IF NOT (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Forbidden: rollback requires trusted SQL Editor owner execution';
  END IF;

  SELECT id, role::text
  INTO v_target_id, v_prev_role
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_revert_email))
    AND role::text = 'ADMIN';

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No ADMIN profile found matching email %', v_revert_email;
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
      'target_email', v_revert_email,
      'role', 'FIELD_RESPONDER'
    )
  );
END $$;

COMMIT;
```

- **Do not** delete rows from `public.audit_logs` (`022` enforces append-only `SELECT, INSERT` grants for `authenticated`, and audit history must remain immutable).
- If the intended `ADMIN` user accidentally had `is_active = false`, re-verify why it was deactivated before re-enabling.

---

## 6. Security Warnings

1. **One-Time Use Only:** Once the first `ADMIN` exists, all future role promotions/demotions should be executed via `updateUserRoleAsAdmin()` from an authenticated `ADMIN` session (which logs `ROLE_CHANGED` with the admin's `auth.uid()`).
2. **Never Disable `trg_guard_profile_privilege_columns` or RLS:** `022`'s trigger explicitly permits `session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL`; temporarily dropping or disabling triggers/RLS weakens database integrity unnecessarily.
3. **Never Expose `service_role` or Create Passwords in SQL:** Create/verify Auth users only through Supabase Auth (Dashboard or official signup flow) and never place `SUPABASE_SERVICE_ROLE_KEY` in frontend code or `.env` `VITE_*` variables.
4. **Pending Edge Function Deployment & Secrets:** `ADMIN` UI operations touching Edge Functions (`analyze-incident`, `explain-reallocation`, `gemini-assistant`, ingestion triggers) still require deploying the 11 Edge Functions with [config.toml](file:///c:/Manish/sih1/supabase/config.toml) and setting `CRON_SECRET` / `GEMINI_API_KEY` / `FIRMS_MAP_KEY` in a separate post-bootstrap step.
5. **Phase 28.5 Catalog Outputs Still Unreviewed:** Although the bootstrap script above self-verifies `user_role`, existing `ADMIN` count, and SQL Editor ownership inside PostgreSQL before writing, ensure you also inspect the SQL Editor verification outputs requested in [PHASE_28_5_VERIFICATION_RESULTS_ANALYSIS.md](file:///c:/Manish/sih1/docs/PHASE_28_5_VERIFICATION_RESULTS_ANALYSIS.md).

---

## 7. Phase D — Local Regression Results

Executed locally after documentation inspection (no source, SQL, test, or secret files modified):

| Command | Result | Observed Output |
| :--- | :--- | :--- |
| `npm run lint` (`tsc --noEmit`) | **PASSED** (`exit 0`) | 0 TypeScript errors across `src/`. |
| `npm run build` (`tsc && vite build`) | **PASSED** (`exit 0`) | `2,631` modules transformed (`12.41s`); `dist/` bundle generated cleanly. |
| `npm test` (`vitest run`) | **PASSED** (`exit 0`) | **19/19** test files, **104/104** tests passed (`10.12s`). |

---

## 8. Final Verdict & Next Action

**Verdict:** `READY FOR OWNER ADMIN BOOTSTRAP`

- **Remaining Pre-Execution Check:** Confirm an existing, email-verified, non-deleted `auth.users` account exists for your intended admin email (and complete review of the Phase 28.5 catalog check outputs if not yet inspected).
- **Exact Next Action:** Open **Supabase Dashboard → SQL Editor** on project `itmeoierfppvoaljebco`, run **Section 2 Prechecks A & B** with your target email, then run **Section 3** (`BEGIN; ... COMMIT;`) replacing `<OWNER_VERIFIED_ADMIN_EMAIL>`, and verify with **Section 4**.
