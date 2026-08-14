-- Indexes for High-Performance Control Room Queries

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority_level ON incidents(priority_level);
CREATE INDEX idx_incidents_priority_score ON incidents(priority_score DESC);
CREATE INDEX idx_incidents_emergency_type ON incidents(emergency_type);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at DESC);
CREATE INDEX idx_incidents_location_id ON incidents(location_id);

CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_department_id ON resources(department_id);

CREATE INDEX idx_assignments_incident_id ON resource_assignments(incident_id);
CREATE INDEX idx_assignments_resource_id ON resource_assignments(resource_id);
CREATE INDEX idx_assignments_status ON resource_assignments(assignment_status);

CREATE INDEX idx_incident_updates_incident_id ON incident_updates(incident_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_simulation_events_run_id ON simulation_events(simulation_run_id);
CREATE INDEX idx_analytics_results_run_id ON analytics_results(simulation_run_id);
