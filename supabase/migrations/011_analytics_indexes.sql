-- Migration 011: Analytics Performance Indexes
-- ResQAI Platform Phase 13

-- Incidents table indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_priority_level ON public.incidents(priority_level);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_emergency_type ON public.incidents(emergency_type);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON public.incidents(reported_at DESC);

-- Resource assignments table indexes
CREATE INDEX IF NOT EXISTS idx_resource_assignments_incident_id ON public.resource_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id ON public.resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_status ON public.resource_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_created_at ON public.resource_assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_dispatched_at ON public.resource_assignments(dispatched_at DESC);

-- Resources table indexes
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_is_active ON public.resources(is_active);

-- Notifications table indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
