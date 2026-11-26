# RESQAI — PHASE 28 REPORT: SECURITY, RBAC & ACCESS CONTROL

**Date:** 2026-11-26  
**Project:** ResQAI (`itmeoierfppvoaljebco`)  
**Phase 28 Status:** **COMPLETE IN CODE & TESTS (LOCAL MIGRATIONS `021`–`022` AND EDGE FUNCTION DEPLOYMENTS AWAITING OWNER EXECUTION)**

---

## 1. Authentication Audit

### Issues Identified Before Phase 28
1. `src/context/AuthContext.tsx` initialized `profile` to `DEFAULT_DEMO_PROFILE` (`role: 'CONTROL_ROOM_OPERATOR'`), returned `DEFAULT_DEMO_PROFILE` when `session === null` or after `signOut()`, and defaulted `hasRole` to `() => true`.
2. `src/App.tsx` left every operational route (`/control-center`, `/incidents`, `/incidents/create`, `/resources`, `/resources/create`, `/driver`, `/reallocation`, `/simulation`, `/analytics`, `/system-health`) completely unauthenticated.
3. `src/pages/LoginPage.tsx` allowed selecting `'ADMIN'` during public registration and embedded a hardcoded `'demo123456'` password string.
4. `src/types/user.ts` had drifted roles (`RESOURCE_OFFICER`, `VIEWER`) out of sync with `AuthContext.tsx`.

### Hardening Implemented
- **Removed `DEFAULT_DEMO_PROFILE` & Default-True Fallbacks ([AuthContext.tsx](file:///c:/Manish/sih1/src/context/AuthContext.tsx)):** Unauthenticated state (`!user || !session || !profile`) fails closed with `profile = null`, `hasRole() = false`, and `hasPermission() = false`. Inactive accounts (`profiles.is_active === false`) are automatically signed out.
- **Expired Session Handling ([AuthContext.tsx](file:///c:/Manish/sih1/src/context/AuthContext.tsx)):** Checks `session.expires_at * 1000 <= Date.now()` on load and `onAuthStateChange`, signs out expired tokens, records `AUTH_SESSION_EXPIRED` in `audit_logs`, and redirects via `<ProtectedRoute>` to `/login` with an expiry prompt.
- **Self-Role Escalation Blocked ([rbac.ts](file:///c:/Manish/sih1/src/security/rbac.ts), [LoginPage.tsx](file:///c:/Manish/sih1/src/pages/LoginPage.tsx), [AuthContext.tsx](file:///c:/Manish/sih1/src/context/AuthContext.tsx)):** `validateSelfSignupRole()` rejects `ADMIN`, `DISPATCHER`, and `CONTROL_ROOM_OPERATOR` during signup and restricts self-registration strictly to least-privilege `FIELD_RESPONDER`, logging `ACCESS_DENIED` on escalation attempts. Removed `'demo123456'` from `LoginPage.tsx`.
- **Route & Header Gating ([ProtectedRoute.tsx](file:///c:/Manish/sih1/src/components/auth/ProtectedRoute.tsx), [App.tsx](file:///c:/Manish/sih1/src/App.tsx)):** Public routes are `/`, `/kinetic`, and `/login`. All operational routes require authentication plus role authorization, and unauthenticated visitors never trigger protected notifications or AI assistant access.

---

## 2. Role & Permission Matrix

Canonical application roles supported: **`ADMIN`**, **`DISPATCHER`**, **`FIELD_RESPONDER`**. *(Note: existing legacy `CONTROL_ROOM_OPERATOR` DB profile rows map cleanly to `DISPATCHER` via `normalizeUserRole()` and `is_dispatcher_or_admin()` without inventing a fourth application role.)*

| Capability / Route | Unauthenticated | `FIELD_RESPONDER` | `DISPATCHER` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: |
| Landing (`/`, `/kinetic`, `/login`) | Allow | Allow | Allow | Allow |
| Driver Panel (`/driver`) & assigned unit status (`BUSY` / `AVAILABLE`) | Deny | **Allow (Own Unit)** | Allow | Allow |
| View Incidents (`/incidents`, `/map`, `/alerts`) | Deny | **Assigned/Reported Only (DB RLS)** | Allow | Allow |
| Create / Edit Incidents (`/incidents/create`) | Deny | Deny | Allow | Allow |
| Manage Fleet Pool (`/resources`, `/resources/create`, `/edit`) | Deny | Deny | Allow | Allow |
| Confirm / Cancel Dispatch | Deny | Deny | Allow | Allow |
| Approve / Reject Dynamic Reallocation (`/reallocation`) | Deny | Deny | Allow | Allow |
| Simulation, Analytics, System Health, AI Assistant | Deny | Deny | Allow | Allow |
| Delete Incidents / Resources / Assignments | Deny | Deny | Deny | **Allow** |
| View Audit Logs & Change User Roles | Deny | Deny | Deny | **Allow** |

Service-layer enforcement is wired via [authGuard.ts](file:///c:/Manish/sih1/src/services/authGuard.ts) across [incidents.ts](file:///c:/Manish/sih1/src/services/incidents.ts), [resources.ts](file:///c:/Manish/sih1/src/services/resources.ts), [assignments.ts](file:///c:/Manish/sih1/src/services/assignments.ts), [allocation.ts](file:///c:/Manish/sih1/src/services/allocation.ts), and [reallocation.ts](file:///c:/Manish/sih1/src/services/reallocation.ts), recording security-sensitive actions (`AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_SIGNUP`, `AUTH_SESSION_EXPIRED`, `ROLE_CHANGED`, `ACCESS_DENIED`, `INCIDENT_CREATED`, `INCIDENT_STATUS_CHANGED`, `DISPATCH_CONFIRMED`, `ASSIGNMENT_*`, `REALLOCATION_APPROVED`, `REALLOCATION_REJECTED`) in [auditLogs.ts](file:///c:/Manish/sih1/src/services/auditLogs.ts).

---

## 3. Database & Storage RLS Policy Audit

Inspected all migrations (`006`–`021`) and authored least-privilege hardening in [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql):

- **Privilege Helpers (`SECURITY DEFINER`, pinned `search_path = public`):** `get_auth_user_role()`, `is_admin()`, `is_dispatcher_or_admin()`, `is_field_responder()`, and `is_responder_assigned_to_incident(uuid)`.
- **Self-Role Escalation Prevention:** Trigger `trg_guard_profile_privilege_columns` on `public.profiles` rejects any non-`ADMIN` modification of `role` or `is_active` and writes an automatic `ROLE_CHANGED` audit record when an `ADMIN` updates roles.
- **Unrestricted Policies Replaced:** Dropped legacy `USING (true)` / `WITH CHECK (true)` write and public-read policies across `profiles`, `departments`, `locations`, `hospitals`, `incidents`, `incident_updates`, `resources`, `resource_assignments`, `notifications`, `reallocation_audit_logs`, `reallocation_events`, `audit_logs`, `simulation_*`, `analytics_results`, `weather_observations`, `environmental_alerts`, `external_ingestion_logs`, `external_events`, `incident_ai_analysis`, `provider_health`, `ai_event_timeline`, and `ai_assistant_conversations`.
- **Field Responder Scoping:** Added nullable `resources.assigned_user_id` FK (`profiles.id`) so `FIELD_RESPONDER` users can read/update only their own assigned unit and incidents linked via active/completed assignments.
- **Immutable Audit Trail:** `audit_logs` allows `ADMIN`-only `SELECT` and authenticated `INSERT` (`user_id IS NULL OR user_id = auth.uid()`), with zero `UPDATE` or `DELETE` policies.
- **Storage Objects (`storage.objects`):** Scoped `resqai-*` buckets to authenticated reads, dispatcher/admin uploads, and admin-only deletes (zero anonymous access).

---

## 4. Edge Function Security Audit

Created shared security middleware at [supabase/functions/_shared/security.ts](file:///c:/Manish/sih1/supabase/functions/_shared/security.ts) and updated all 11 Edge Functions (`analyze-incident`, `analyze-external-event`, `explain-reallocation`, `gemini-assistant`, `ingest-earthquakes`, `ingest-fire-events`, `ingest-imd-alerts`, `ingest-weather`, `ingest-alerts`, `monitor-data-providers`, `process-live-events`):

- **JWT & Role Validation (`requireAuthenticatedUser`):** Validates Bearer JWT via `auth.getUser(token)`, checks `profiles.is_active`, and enforces allowed roles (`['ADMIN', 'DISPATCHER']` on intelligence/AI/ingestion functions; `['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']` on `ingest-weather`).
- **Rate Limiting (`checkRateLimit`):** Per-user sliding-window request limits returning `HTTP 429` with `retryAfterSec`.
- **Input & Coordinate Validation:** Validates string bounds, object payloads, and `validateCoordinates(lat, lon)` (`-90..90`, `-180..180`).
- **Secret Protection & Error Sanitization:** Removed hardcoded `'sb_publishable_...'` fallback literals from `analyze-external-event`, `ingest-earthquakes`, `ingest-fire-events`, and `ingest-imd-alerts`; replaced raw internal error strings (`errorText` / `err.message`) with `sanitizeJsonError()`.

---

## 5. Migrations Prepared & Applied Status

| Migration File | Status | Notes |
| :--- | :--- | :--- |
| `001`–`016` | **Executed remotely** | Verified in Phases 26.1 & 27. |
| `017`, `018.reviewed`, `019.reviewed`, `020` | **Executed remotely** | Executed by owner & verified live in Phase 27. |
| [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) | **Prepared locally — NOT executed remotely** | DB status triggers & single-active-assignment unique index. |
| [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) | **Prepared locally — NOT executed remotely** | Least-privilege RLS across all public tables + `storage.objects` + profile role trigger. |

---

## 6. Security Tests & Verification Results

Executed after all Phase 28 changes (`2026-11-26`):

- `npm run lint` (`tsc --noEmit`): **PASSED** (`exit code 0`, **0 TypeScript errors**)
- `npm run build` (`tsc && vite build`): **PASSED** (`exit code 0`, **2,631 modules transformed**)
- `npm test` (`vitest run`): **PASSED** (`exit code 0`, **18/18 test files**, **92/92 tests passed**)
  - New suite [tests/security/rbacAndSecurity.test.ts](file:///c:/Manish/sih1/tests/security/rbacAndSecurity.test.ts): **6/6 passed** covering unauthenticated access blocks, `DISPATCHER` permissions & admin blocks, `FIELD_RESPONDER` restrictions & permitted telemetry updates, `ADMIN` governance & `ROLE_CHANGED` audit logging, self-role escalation blocks & secret/demo-profile removal, and `022` RLS + all 11 Edge Function security contract checks.
  - Existing [tests/security/securityAudit.test.ts](file:///c:/Manish/sih1/tests/security/securityAudit.test.ts): **4/4 passed**.

---

## 7. Remaining Vulnerabilities / Deployment Gaps

1. **Remote DB Still Uses Pre-022 RLS Policies:** Until the owner runs [021_workflow_guards_and_rpcs.sql](file:///c:/Manish/sih1/supabase/migrations/021_workflow_guards_and_rpcs.sql) and [022_rbac_security_rls_hardening.sql](file:///c:/Manish/sih1/supabase/migrations/022_rbac_security_rls_hardening.sql) in the Supabase SQL Editor, remote tables (`external_events`, etc.) retain prior `014`–`019` policies and lack `trg_guard_profile_privilege_columns`.
2. **Remote Edge Functions Require Deployment:** Previously deployed 7 functions on `itmeoierfppvoaljebco` do not yet contain the `_shared/security.ts` JWT/RBAC guards, and 4 functions (`explain-reallocation`, `gemini-assistant`, `monitor-data-providers`, `process-live-events`) remain undeployed remotely (`HTTP 404`).
3. **Edge Function Rate Limiter Scope:** `_shared/security.ts` uses per-isolate in-memory rate buckets; across multiple Edge Runtime isolates or cold starts, strict global throttling would require Redis/Upstash or Postgres-backed rate tracking.
4. **Live Authenticated Multi-Role E2E Test Pending:** Real Supabase Auth accounts (`ADMIN`, `DISPATCHER`, `FIELD_RESPONDER` with `resources.assigned_user_id` populated) are needed after applying `022` to run live remote penetration/RLS verification against `itmeoierfppvoaljebco`.

---

## 8. Readiness Assessment for Phase 29

- **Frontend / Service RBAC & Security Architecture:** **READY** (`0` TS errors, build clean, `92/92` tests passing).
- **Cloud Security Activation Prerequisite:** Owner must execute `021` and `022` in the Supabase SQL Editor, deploy the updated Edge Functions (including `_shared/security.ts`), configure `GEMINI_API_KEY` / `FIRMS_MAP_KEY` secrets, and provision at least one `ADMIN` profile row before live production operation.
