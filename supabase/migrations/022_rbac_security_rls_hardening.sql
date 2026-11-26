-- ============================================================================
-- ResQAI Migration 022: Security, RBAC & Least-Privilege RLS Hardening
-- Phase 28 / Remediated Phase 28.3 — Prepared for PostgreSQL 17.6 (Supabase)
-- STATUS: LOCALLY AUTHORED — DO NOT APPLY WITHOUT OWNER REVIEW & APPROVAL
--
-- SUMMARY:
--   1. Adds nullable resources.assigned_user_id -> profiles(id) for FIELD_RESPONDER scoping.
--   2. Hardens get_auth_user_role() + helper functions with SET search_path = ''
--      and explicit schema qualification, revoking EXECUTE from PUBLIC/anon.
--   3. Fixes SECURITY DEFINER trigger checks using session_user + auth.uid() IS NULL
--      (or auth.role() = 'service_role') instead of current_user.
--   4. Adds strict column-level triggers:
--        - guard_profile_privilege_columns() on public.profiles
--        - guard_incident_protected_columns() allowlist on public.incidents
--        - guard_resource_protected_columns() allowlist on public.resources
--        - guard_assignment_protected_columns() allowlist & state checks on public.resource_assignments
--   5. Replaces unrestricted USING (true) / WITH CHECK (true) policies across ALL
--      public tables and storage.objects with least-privilege RBAC policies.
--   6. Implements explicit table, sequence, function SQL REVOKE/GRANT privileges
--      and ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public.
-- ============================================================================

-- 1. Bind field responder accounts to specific fleet units for least-privilege RLS
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_assigned_user
  ON public.resources(assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

-- 2. Trusted Role & Ownership Helper Functions (SECURITY DEFINER + empty search_path)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND COALESCE(is_active, TRUE) = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.get_auth_user_role()::text = 'ADMIN', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_dispatcher_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    public.get_auth_user_role()::text IN ('ADMIN', 'DISPATCHER', 'CONTROL_ROOM_OPERATOR'),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_field_responder()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.get_auth_user_role()::text = 'FIELD_RESPONDER', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_responder_assigned_to_incident(p_incident_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_assignments ra
    JOIN public.resources r ON r.id = ra.resource_id
    WHERE ra.incident_id = p_incident_id
      AND r.assigned_user_id = auth.uid()
      AND ra.assignment_status IN ('ACCEPTED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED')
  );
$$;

-- Restrict direct RPC execution of SECURITY DEFINER helpers from PUBLIC/anon
REVOKE ALL ON FUNCTION public.get_auth_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_dispatcher_or_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_field_responder() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_responder_assigned_to_incident(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_dispatcher_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_field_responder() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_responder_assigned_to_incident(uuid) TO authenticated, service_role;

-- 3. Trigger Preventing Self-Role Escalation & Auditing Admin Role Changes
-- Note: Inside SECURITY DEFINER triggers owned by postgres, current_user is always 'postgres'.
-- Therefore we check session_user (authenticator for PostgREST HTTP vs postgres/supabase_admin for SQL Editor)
-- combined with auth.uid() IS NULL for direct SQL Editor / migration execution, and auth.role() = 'service_role'.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_role TEXT := OLD.role::text;
  v_new_role TEXT := NEW.role::text;
BEGIN
  IF auth.role() = 'service_role'
     OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  IF v_new_role IS DISTINCT FROM v_old_role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Forbidden: only ADMIN may change profile role or active status'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      auth.uid(),
      'ROLE_CHANGED',
      'profile',
      OLD.id::text,
      jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active),
      jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active)
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privilege_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_privilege_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_profile_privilege_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_columns();

-- 4. PROFILES RLS (no anonymous read, no cross-user profile leaks, no self-elevation)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated select own or operator profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own non-privileged profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

CREATE POLICY "Authenticated select own or operator profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_dispatcher_or_admin());

CREATE POLICY "Users update own non-privileged profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. REFERENCE TABLES (departments, locations, hospitals)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read departments" ON public.departments;
DROP POLICY IF EXISTS "Allow admin write departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated read departments" ON public.departments;
DROP POLICY IF EXISTS "Admin manage departments" ON public.departments;
CREATE POLICY "Authenticated read departments"
  ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read locations" ON public.locations;
DROP POLICY IF EXISTS "Allow admin write locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated read locations" ON public.locations;
DROP POLICY IF EXISTS "Admin manage locations" ON public.locations;
CREATE POLICY "Authenticated read locations"
  ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage locations"
  ON public.locations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Allow admin write hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Authenticated read hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admin or dispatcher manage hospitals" ON public.hospitals;
CREATE POLICY "Authenticated read hospitals"
  ON public.hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or dispatcher manage hospitals"
  ON public.hospitals FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

-- 6. INCIDENTS & INCIDENT_UPDATES RLS + STRICT COLUMN ALLOWLIST
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow operators create/update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow operators update incidents" ON public.incidents;
DROP POLICY IF EXISTS "RBAC select incidents" ON public.incidents;
DROP POLICY IF EXISTS "Dispatcher or admin insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "RBAC update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admin delete incidents" ON public.incidents;

CREATE POLICY "RBAC select incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND (reported_by = auth.uid() OR public.is_responder_assigned_to_incident(id)))
  );

CREATE POLICY "Dispatcher or admin insert incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "RBAC update incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND public.is_responder_assigned_to_incident(id))
  )
  WITH CHECK (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND public.is_responder_assigned_to_incident(id))
  );

-- Strict allowlist for non-dispatcher/non-admin incident updates: ONLY status, resolved_at, updated_at
CREATE OR REPLACE FUNCTION public.guard_incident_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed JSONB;
BEGIN
  IF auth.role() = 'service_role'
     OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_dispatcher_or_admin() THEN
    v_allowed := to_jsonb(OLD) || jsonb_build_object(
      'status', NEW.status,
      'resolved_at', NEW.resolved_at,
      'updated_at', NEW.updated_at
    );

    IF to_jsonb(NEW) IS DISTINCT FROM v_allowed THEN
      RAISE EXCEPTION 'Forbidden: FIELD_RESPONDER may update only status, resolved_at, and updated_at on assigned incidents'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_incident_protected_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_incident_protected_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_incident_protected_columns ON public.incidents;
CREATE TRIGGER trg_guard_incident_protected_columns
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_incident_protected_columns();

CREATE POLICY "Admin delete incidents"
  ON public.incidents FOR DELETE
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read incident_updates" ON public.incident_updates;
DROP POLICY IF EXISTS "Allow write incident_updates" ON public.incident_updates;
DROP POLICY IF EXISTS "RBAC select incident_updates" ON public.incident_updates;
DROP POLICY IF EXISTS "RBAC insert incident_updates" ON public.incident_updates;

CREATE POLICY "RBAC select incident_updates"
  ON public.incident_updates FOR SELECT
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND public.is_responder_assigned_to_incident(incident_id))
  );

CREATE POLICY "RBAC insert incident_updates"
  ON public.incident_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND public.is_responder_assigned_to_incident(incident_id))
  );

-- 7. RESOURCES & RESOURCE_ASSIGNMENTS RLS + COLUMN ALLOWLIST TRIGGERS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read resources" ON public.resources;
DROP POLICY IF EXISTS "Allow operators manage resources" ON public.resources;
DROP POLICY IF EXISTS "RBAC select resources" ON public.resources;
DROP POLICY IF EXISTS "Dispatcher or admin insert resources" ON public.resources;
DROP POLICY IF EXISTS "RBAC update resources" ON public.resources;
DROP POLICY IF EXISTS "Admin delete resources" ON public.resources;

CREATE POLICY "RBAC select resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND assigned_user_id = auth.uid())
  );

CREATE POLICY "Dispatcher or admin insert resources"
  ON public.resources FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "RBAC update resources"
  ON public.resources FOR UPDATE
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND assigned_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_dispatcher_or_admin()
    OR (public.is_field_responder() AND assigned_user_id = auth.uid())
  );

-- Allowlist for FIELD_RESPONDER on resources: ONLY status, current_assignment_id (null or own active),
-- latitude, longitude, last_location_update, updated_at
CREATE OR REPLACE FUNCTION public.guard_resource_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_dispatcher_or_admin() THEN
    IF OLD.assigned_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden: responder does not own this resource unit'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.resource_code IS DISTINCT FROM OLD.resource_code
      OR NEW.name IS DISTINCT FROM OLD.name
      OR NEW.resource_type IS DISTINCT FROM OLD.resource_type
      OR NEW.capability IS DISTINCT FROM OLD.capability
      OR NEW.capacity IS DISTINCT FROM OLD.capacity
      OR NEW.department_id IS DISTINCT FROM OLD.department_id
      OR NEW.station_name IS DISTINCT FROM OLD.station_name
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Forbidden: FIELD_RESPONDER may update only status, current_assignment_id, and GPS telemetry'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.current_assignment_id IS DISTINCT FROM OLD.current_assignment_id
       AND NEW.current_assignment_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.resource_assignments ra
        WHERE ra.id = NEW.current_assignment_id
          AND ra.resource_id = OLD.id
          AND ra.assignment_status IN ('ACCEPTED', 'DISPATCHED', 'IN_PROGRESS')
      ) THEN
        RAISE EXCEPTION 'Forbidden: current_assignment_id must belong to an active assignment for this resource'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_resource_protected_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_resource_protected_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_resource_protected_columns ON public.resources;
CREATE TRIGGER trg_guard_resource_protected_columns
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_resource_protected_columns();

CREATE POLICY "Admin delete resources"
  ON public.resources FOR DELETE
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read resource_assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Allow operators write assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "RBAC select resource_assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Dispatcher or admin insert resource_assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "RBAC update resource_assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Admin delete resource_assignments" ON public.resource_assignments;

CREATE POLICY "RBAC select resource_assignments"
  ON public.resource_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (
      public.is_field_responder()
      AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND r.assigned_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Dispatcher or admin insert resource_assignments"
  ON public.resource_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "RBAC update resource_assignments"
  ON public.resource_assignments FOR UPDATE
  TO authenticated
  USING (
    public.is_dispatcher_or_admin()
    OR (
      public.is_field_responder()
      AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND r.assigned_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_dispatcher_or_admin()
    OR (
      public.is_field_responder()
      AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND r.assigned_user_id = auth.uid()
      )
    )
  );

-- Allowlist & state transition validation for FIELD_RESPONDER on resource_assignments
-- Blocks cross-incident escalation via incident_id/resource_id mutation, metadata tampering,
-- and unauthorized CANCELLED/REJECTED status transitions.
CREATE OR REPLACE FUNCTION public.guard_assignment_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF auth.role() = 'service_role'
     OR (session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_dispatcher_or_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.resources r
      WHERE r.id = OLD.resource_id
        AND r.assigned_user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Forbidden: responder does not own the assigned resource unit'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.incident_id IS DISTINCT FROM OLD.incident_id
      OR NEW.resource_id IS DISTINCT FROM OLD.resource_id
      OR NEW.recommended_at IS DISTINCT FROM OLD.recommended_at
      OR NEW.distance_km IS DISTINCT FROM OLD.distance_km
      OR NEW.estimated_response_minutes IS DISTINCT FROM OLD.estimated_response_minutes
      OR NEW.allocation_score IS DISTINCT FROM OLD.allocation_score
      OR NEW.recommendation_reason IS DISTINCT FROM OLD.recommendation_reason
      OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Forbidden: FIELD_RESPONDER may update only assignment status and operational timestamps'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
      IF NEW.assignment_status::text IN ('CANCELLED', 'REJECTED', 'RECOMMENDED') THEN
        RAISE EXCEPTION 'Forbidden: only DISPATCHER or ADMIN may set assignment status to %', NEW.assignment_status
          USING ERRCODE = 'insufficient_privilege';
      END IF;

      CASE OLD.assignment_status::text
        WHEN 'RECOMMENDED' THEN v_allowed := NEW.assignment_status::text IN ('ACCEPTED', 'DISPATCHED');
        WHEN 'ACCEPTED' THEN v_allowed := NEW.assignment_status::text IN ('DISPATCHED', 'IN_PROGRESS');
        WHEN 'DISPATCHED' THEN v_allowed := NEW.assignment_status::text IN ('IN_PROGRESS', 'COMPLETED');
        WHEN 'IN_PROGRESS' THEN v_allowed := NEW.assignment_status::text = 'COMPLETED';
        ELSE v_allowed := FALSE;
      END CASE;

      IF NOT v_allowed THEN
        RAISE EXCEPTION 'Forbidden: invalid responder assignment status transition from % to %',
          OLD.assignment_status, NEW.assignment_status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_assignment_protected_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_assignment_protected_columns() TO service_role;

DROP TRIGGER IF EXISTS trg_guard_assignment_protected_columns ON public.resource_assignments;
CREATE TRIGGER trg_guard_assignment_protected_columns
  BEFORE UPDATE ON public.resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_assignment_protected_columns();

CREATE POLICY "Admin delete resource_assignments"
  ON public.resource_assignments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 8. NOTIFICATIONS RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "RBAC select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Dispatcher or admin insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "RBAC select notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_dispatcher_or_admin()));

CREATE POLICY "Dispatcher or admin insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_dispatcher_or_admin()))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND public.is_dispatcher_or_admin()));

-- 9. REALLOCATION TABLES RLS (DISPATCHER / ADMIN ONLY)
ALTER TABLE public.reallocation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reallocation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read reallocation_audit_logs" ON public.reallocation_audit_logs;
DROP POLICY IF EXISTS "Allow authenticated write reallocation_audit_logs" ON public.reallocation_audit_logs;
DROP POLICY IF EXISTS "Allow authenticated read reallocation_events" ON public.reallocation_events;
DROP POLICY IF EXISTS "Allow authenticated write reallocation_events" ON public.reallocation_events;
DROP POLICY IF EXISTS "Dispatcher or admin access reallocation_audit_logs" ON public.reallocation_audit_logs;
DROP POLICY IF EXISTS "Dispatcher or admin access reallocation_events" ON public.reallocation_events;

CREATE POLICY "Dispatcher or admin access reallocation_audit_logs"
  ON public.reallocation_audit_logs FOR ALL
  TO authenticated
  USING (public.is_dispatcher_or_admin())
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin access reallocation_events"
  ON public.reallocation_events FOR ALL
  TO authenticated
  USING (public.is_dispatcher_or_admin())
  WITH CHECK (public.is_dispatcher_or_admin());

-- 10. IMMUTABLE AUDIT LOGS RLS (ADMIN SELECT, AUTHENTICATED APPEND-ONLY)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated write audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert own audit_logs" ON public.audit_logs;

CREATE POLICY "Admin select audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated insert own audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      (action NOT IN ('ROLE_CHANGED', 'ADMIN_ACTION', 'DISPATCH_CONFIRMED', 'REALLOCATION_APPROVED', 'REALLOCATION_REJECTED'))
      OR (action IN ('DISPATCH_CONFIRMED', 'REALLOCATION_APPROVED', 'REALLOCATION_REJECTED') AND public.is_dispatcher_or_admin())
      OR public.is_admin()
    )
  );

-- 11. SIMULATION & ANALYTICS TABLES RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read simulation" ON public.simulation_runs;
DROP POLICY IF EXISTS "Allow operators manage simulation" ON public.simulation_runs;
DROP POLICY IF EXISTS "Allow authenticated read simulation_events" ON public.simulation_events;
DROP POLICY IF EXISTS "Allow operators write simulation_events" ON public.simulation_events;
DROP POLICY IF EXISTS "Allow authenticated read analytics_results" ON public.analytics_results;
DROP POLICY IF EXISTS "Allow operators write analytics_results" ON public.analytics_results;
DROP POLICY IF EXISTS "Dispatcher or admin manage simulation_runs" ON public.simulation_runs;
DROP POLICY IF EXISTS "Dispatcher or admin manage simulation_events" ON public.simulation_events;
DROP POLICY IF EXISTS "Dispatcher or admin manage simulation_incidents" ON public.simulation_incidents;
DROP POLICY IF EXISTS "Dispatcher or admin manage simulation_results" ON public.simulation_results;
DROP POLICY IF EXISTS "Dispatcher or admin manage analytics_results" ON public.analytics_results;

CREATE POLICY "Dispatcher or admin manage simulation_runs"
  ON public.simulation_runs FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin manage simulation_events"
  ON public.simulation_events FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin manage simulation_incidents"
  ON public.simulation_incidents FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin manage simulation_results"
  ON public.simulation_results FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin manage analytics_results"
  ON public.analytics_results FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

-- 12. ENVIRONMENTAL, AI & HEALTH TABLES RLS (AUTHENTICATED READ, PRIVILEGED/SERVICE WRITE)
ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select weather_observations" ON public.weather_observations;
DROP POLICY IF EXISTS "Auth insert weather_observations" ON public.weather_observations;
DROP POLICY IF EXISTS "Public select environmental_alerts" ON public.environmental_alerts;
DROP POLICY IF EXISTS "Auth insert environmental_alerts" ON public.environmental_alerts;
DROP POLICY IF EXISTS "Public select external_ingestion_logs" ON public.external_ingestion_logs;
DROP POLICY IF EXISTS "Auth insert external_ingestion_logs" ON public.external_ingestion_logs;
DROP POLICY IF EXISTS "Public read external_events" ON public.external_events;
DROP POLICY IF EXISTS "Public insert external_events" ON public.external_events;
DROP POLICY IF EXISTS "Public update external_events" ON public.external_events;
DROP POLICY IF EXISTS "Allow authenticated read incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Allow authenticated write incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Public select incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Public insert incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Public update incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Public select provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Auth insert provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Auth update provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Auth upsert provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Public select ai_event_timeline" ON public.ai_event_timeline;
DROP POLICY IF EXISTS "Auth insert ai_event_timeline" ON public.ai_event_timeline;
DROP POLICY IF EXISTS "Public select ai_assistant_conversations" ON public.ai_assistant_conversations;
DROP POLICY IF EXISTS "Auth insert ai_assistant_conversations" ON public.ai_assistant_conversations;

DROP POLICY IF EXISTS "Authenticated read weather_observations" ON public.weather_observations;
DROP POLICY IF EXISTS "Dispatcher or admin write weather_observations" ON public.weather_observations;
DROP POLICY IF EXISTS "Authenticated read environmental_alerts" ON public.environmental_alerts;
DROP POLICY IF EXISTS "Dispatcher or admin write environmental_alerts" ON public.environmental_alerts;
DROP POLICY IF EXISTS "Dispatcher or admin read external_ingestion_logs" ON public.external_ingestion_logs;
DROP POLICY IF EXISTS "Authenticated read external_events" ON public.external_events;
DROP POLICY IF EXISTS "Dispatcher or admin update external_events" ON public.external_events;
DROP POLICY IF EXISTS "Authenticated read incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Dispatcher or admin insert incident_ai_analysis" ON public.incident_ai_analysis;
DROP POLICY IF EXISTS "Authenticated read provider_health" ON public.provider_health;
DROP POLICY IF EXISTS "Authenticated read ai_event_timeline" ON public.ai_event_timeline;
DROP POLICY IF EXISTS "Dispatcher or admin access ai_assistant_conversations" ON public.ai_assistant_conversations;

CREATE POLICY "Authenticated read weather_observations"
  ON public.weather_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dispatcher or admin write weather_observations"
  ON public.weather_observations FOR INSERT TO authenticated WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Authenticated read environmental_alerts"
  ON public.environmental_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dispatcher or admin write environmental_alerts"
  ON public.environmental_alerts FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Dispatcher or admin read external_ingestion_logs"
  ON public.external_ingestion_logs FOR SELECT TO authenticated USING (public.is_dispatcher_or_admin());

CREATE POLICY "Authenticated read external_events"
  ON public.external_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dispatcher or admin update external_events"
  ON public.external_events FOR UPDATE TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Authenticated read incident_ai_analysis"
  ON public.incident_ai_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dispatcher or admin insert incident_ai_analysis"
  ON public.incident_ai_analysis FOR INSERT TO authenticated WITH CHECK (public.is_dispatcher_or_admin());

CREATE POLICY "Authenticated read provider_health"
  ON public.provider_health FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read ai_event_timeline"
  ON public.ai_event_timeline FOR SELECT TO authenticated USING (true);

CREATE POLICY "Dispatcher or admin access ai_assistant_conversations"
  ON public.ai_assistant_conversations FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin()) WITH CHECK (public.is_dispatcher_or_admin());

-- 13. STORAGE OBJECTS RLS (No anonymous bucket/object access)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated read resqai storage objects" ON storage.objects;
    DROP POLICY IF EXISTS "Dispatcher or admin upload resqai storage objects" ON storage.objects;
    DROP POLICY IF EXISTS "Admin delete resqai storage objects" ON storage.objects;

    CREATE POLICY "Authenticated read resqai storage objects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id LIKE 'resqai-%');

    CREATE POLICY "Dispatcher or admin upload resqai storage objects"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id LIKE 'resqai-%' AND public.is_dispatcher_or_admin());

    CREATE POLICY "Admin delete resqai storage objects"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id LIKE 'resqai-%' AND public.is_admin());
  END IF;
END $$;

-- 14. LEAST-PRIVILEGE SQL GRANTS, SEQUENCES, FUNCTIONS & DEFAULT PRIVILEGES
-- Defense-in-depth alongside RLS: revoke default anon privileges & tighten authenticated SQL grants.

-- 14A. Schema privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- 14B. Revoke ALL table privileges from PUBLIC & anon, then grant explicitly to authenticated & service_role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Preserve full service_role access across all public tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Immutable append-only audit & incident timeline tables (no UPDATE/DELETE/TRUNCATE for authenticated)
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.incident_updates TO authenticated;

-- Service-owned ingestion / telemetry tables (authenticated read-only)
GRANT SELECT ON public.external_ingestion_logs, public.provider_health, public.ai_event_timeline TO authenticated;

-- External events (Edge Functions insert via service_role; dispatchers/admins read & link incident_id)
GRANT SELECT, UPDATE ON public.external_events TO authenticated;

-- Weather & AI triage analysis (read + dispatcher/admin insert)
GRANT SELECT, INSERT ON public.weather_observations, public.incident_ai_analysis TO authenticated;

-- Notifications (read, dispatcher insert, own mark-read update; no delete)
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- Operational, RBAC, reallocation & simulation tables (scoped by RLS + column guard triggers)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.departments,
  public.locations,
  public.hospitals,
  public.incidents,
  public.resources,
  public.resource_assignments,
  public.reallocation_audit_logs,
  public.reallocation_events,
  public.environmental_alerts,
  public.simulation_runs,
  public.simulation_events,
  public.simulation_incidents,
  public.simulation_results,
  public.analytics_results,
  public.ai_assistant_conversations
TO authenticated;

-- 14C. Sequence & application RPC grants
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.incident_number_seq TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_next_incident_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_next_incident_number() TO authenticated, service_role;

-- 14D. Lock down default privileges for future objects created by migration owner role (`postgres`)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
