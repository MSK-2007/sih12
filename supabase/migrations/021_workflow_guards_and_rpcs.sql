-- ============================================================================
-- ResQAI Migration 021: Server-Side Workflow Validation Triggers & Atomic Dispatch RPC
-- Phase 27 — Prepared for PostgreSQL 17.6 (Supabase)
-- STATUS: LOCALLY AUTHORED — AWAITING OWNER SQL EDITOR EXECUTION
-- ============================================================================

-- 1. Enforce valid incident status transitions at the database level
CREATE OR REPLACE FUNCTION public.enforce_incident_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status::text
    WHEN 'REPORTED' THEN allowed := NEW.status::text IN ('ANALYSING', 'CLOSED');
    WHEN 'ANALYSING' THEN allowed := NEW.status::text IN ('PRIORITIZED', 'CLOSED');
    WHEN 'PRIORITIZED' THEN allowed := NEW.status::text IN ('AWAITING_DISPATCH', 'CLOSED');
    WHEN 'AWAITING_DISPATCH' THEN allowed := NEW.status::text IN ('DISPATCHED', 'CLOSED');
    WHEN 'DISPATCHED' THEN allowed := NEW.status::text IN ('IN_PROGRESS', 'CLOSED');
    WHEN 'IN_PROGRESS' THEN allowed := NEW.status::text IN ('RESOLVED', 'CLOSED');
    WHEN 'RESOLVED' THEN allowed := NEW.status::text IN ('CLOSED');
    WHEN 'CLOSED' THEN allowed := FALSE;
    ELSE allowed := FALSE;
  END CASE;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid incident status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status::text = 'RESOLVED' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_incident_status_transition ON public.incidents;
CREATE TRIGGER trg_enforce_incident_status_transition
  BEFORE UPDATE OF status ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_incident_status_transition();

-- 2. Enforce valid resource status transitions & prevent double-allocation at DB level
CREATE OR REPLACE FUNCTION public.enforce_resource_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status::text
    WHEN 'AVAILABLE' THEN allowed := NEW.status::text IN ('ASSIGNED', 'BUSY', 'OFFLINE');
    WHEN 'ASSIGNED' THEN allowed := NEW.status::text IN ('BUSY', 'AVAILABLE', 'OFFLINE');
    WHEN 'BUSY' THEN allowed := NEW.status::text IN ('AVAILABLE', 'OFFLINE');
    WHEN 'OFFLINE' THEN allowed := NEW.status::text IN ('AVAILABLE');
    ELSE allowed := FALSE;
  END CASE;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid resource status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status::text = 'AVAILABLE' THEN
    NEW.current_assignment_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_resource_status_transition ON public.resources;
CREATE TRIGGER trg_enforce_resource_status_transition
  BEFORE UPDATE OF status ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_resource_status_transition();

-- 3. Partial unique index preventing >1 active assignment per resource at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uk_resource_single_active_assignment
  ON public.resource_assignments (resource_id)
  WHERE assignment_status IN ('RECOMMENDED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS');
