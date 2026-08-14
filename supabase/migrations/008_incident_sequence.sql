-- Sequence and database-safe incident number generator function

CREATE SEQUENCE IF NOT EXISTS incident_number_seq START WITH 1006;

CREATE OR REPLACE FUNCTION generate_next_incident_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('incident_number_seq') INTO seq_val;
  RETURN 'INC-' || seq_val::TEXT;
END;
$$ LANGUAGE plpgsql;
