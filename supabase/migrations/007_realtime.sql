-- Enable Supabase Realtime for Live Emergency Control Room Updates

ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE resource_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE incident_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
