# RESQAI — PHASE 28.7.1: DATABASE SIGNUP PRIVILEGE HARDENING REPORT

**Date:** 2026-11-26  
**Project:** `c:\Manish\sih1`  
**Supabase Project:** `itmeoierfppvoaljebco` (`https://itmeoierfppvoaljebco.supabase.co`)  
**Scope:** Additive database signup privilege hardening ([023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql)) + automated tests ([phase28_7_1SignupRoleHardening.test.ts](file:///c:/Manish/sih1/tests/security/phase28_7_1SignupRoleHardening.test.ts)). Migrations `021` and `022` were not modified, no `ADMIN` was created or promoted, and no remote SQL was executed.

**Final Verdict:** `READY FOR OWNER MIGRATION`

---

## 1. Vulnerability Closed (Phase 28.7 Finding)

In [020_schema_reconciliation.sql](file:///c:/Manish/sih1/supabase/migrations/020_schema_reconciliation.sql#L78-L107), `public.handle_new_user()` blocked `'ADMIN'`, **but** still trusted `NEW.raw_user_meta_data->>'role'` when set to `'CONTROL_ROOM_OPERATOR'`, `'DISPATCHER'`, `'FIELD_RESPONDER'`, `'RESOURCE_OFFICER'`, or `'VIEWER'`, and fell back to `'CONTROL_ROOM_OPERATOR'::public.user_role` (which maps to `'DISPATCHER'` in [rbac.ts](file:///c:/Manish/sih1/src/security/rbac.ts) and [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql#L63)). Any attacker calling `/auth/v1/signup` directly with forged metadata (bypassing `AuthContext.signUp()`) could obtain `DISPATCHER`-equivalent database access.

### Before (`020`) vs After (`023`)
| Behavior | Migration `020` (`public.handle_new_user()`) | Migration `023` (`public.handle_new_user()`) |
| :--- | :--- | :--- |
| Role source for new signup | Read `NEW.raw_user_meta_data->>'role'` (`DISPATCHER`, `CONTROL_ROOM_OPERATOR`, etc.) | **Ignores `raw_user_meta_data->>'role'` completely; assigns `'FIELD_RESPONDER'::public.user_role` unconditionally** |
| Missing/invalid metadata default | `'CONTROL_ROOM_OPERATOR'` (dispatcher-equivalent!) | **`'FIELD_RESPONDER'::public.user_role`** (least privilege) |
| Existing row conflict (`ON CONFLICT (id) DO UPDATE`) | Updated `full_name`, `email`, `updated_at` (left `role` untouched) | Preserved: updates only `full_name`, `email`, `updated_at`; **never overwrites `role` or `is_active`** |
| `search_path` hardening | Mutable (`search_path` unset) | **`SET search_path = ''`** with explicit `public.profiles` & `public.user_role` |
| `EXECUTE` privilege boundary | Default grants | **`REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`** |
| Trigger `on_auth_user_created` | Created in `012` (`AFTER INSERT ON auth.users`) | Preserved intact (defensively created only if missing) |

---

## 2. Exact Migration SQL (`supabase/migrations/023_signup_role_hardening.sql`)

```sql
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
```

---

## 3. Compatibility With Existing Guards & Triggers (`021` / `022`)

- **Existing `trg_guard_profile_privilege_columns` (`022`):** If `handle_new_user()` hits `ON CONFLICT (id) DO UPDATE`, it updates only `full_name`, `email`, and `updated_at` (`role` and `is_active` remain untouched), so `NEW.role IS DISTINCT FROM OLD.role` and `NEW.is_active IS DISTINCT FROM OLD.is_active` are both `FALSE`—meaning no trigger conflict occurs and existing `ADMIN` / `DISPATCHER` / deactivated accounts cannot have their privilege or active state altered.
- **No weakening of `021` or `022`:** Migrations `021` and `022`, RLS policies, and `audit_logs` rules remain completely untouched.

---

## 4. Verification Results

All checks ran locally after creating [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql) and [phase28_7_1SignupRoleHardening.test.ts](file:///c:/Manish/sih1/tests/security/phase28_7_1SignupRoleHardening.test.ts):

| Check Command | Result | Observed Output |
| :--- | :--- | :--- |
| `npm run lint` (`tsc --noEmit`) | **PASSED** (`exit 0`) | 0 TypeScript errors. |
| `npm run build` (`tsc && vite build`) | **PASSED** (`exit 0`) | `2,631` modules transformed (`13.15s`); `dist/` bundle generated cleanly. |
| `npm test` (`vitest run`) | **PASSED** (`exit 0`) | **20/20** test files, **108/108** tests passed (`10.25s`), including **4/4** tests in [phase28_7_1SignupRoleHardening.test.ts](file:///c:/Manish/sih1/tests/security/phase28_7_1SignupRoleHardening.test.ts). |

*Verification scope note:* Local tests verified client `validateSelfSignupRole()` rejection, `023` SQL static contract assertions (`SET search_path = ''`, `'FIELD_RESPONDER'::public.user_role` assignment, omission of `role`/`is_active` in `ON CONFLICT (id) DO UPDATE`, `REVOKE`/`GRANT`, `on_auth_user_created` preservation), and relational simulation of forged metadata inputs. Live remote PostgreSQL execution on `itmeoierfppvoaljebco` remains to be performed by the owner.

---

## 5. Owner Execution & Verification Instructions

1. Open **Supabase Dashboard → SQL Editor** on project `itmeoierfppvoaljebco`.
2. Execute [023_signup_role_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/023_signup_role_hardening.sql) as `postgres`.
3. Verify the applied function & trigger with these read-only SQL checks:

```sql
-- 1. Confirm handle_new_user() exists, is SECURITY DEFINER, has empty search_path,
--    hard-assigns FIELD_RESPONDER, and revokes EXECUTE from PUBLIC/anon/authenticated
SELECT
  p.proname,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config,
  p.proacl::text AS raw_acl,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc_can_exec,
  (p.prosrc ILIKE '%''FIELD_RESPONDER''::public.user_role%') AS forces_field_responder,
  (p.prosrc NOT ILIKE '%raw_user_meta_data->>''role''%') AS ignores_meta_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 2. Confirm on_auth_user_created trigger on auth.users is enabled ('O')
SELECT
  tg.tgname,
  tg.tgenabled,
  p.proname AS trigger_fn
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND tg.tgname = 'on_auth_user_created'
  AND NOT tg.tgisinternal;
```

4. After executing `023` (and verifying checks above), proceed with the one-time owner first `ADMIN` bootstrap documented in [PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md](file:///c:/Manish/sih1/docs/PHASE_28_7_FIRST_ADMIN_BOOTSTRAP.md).
