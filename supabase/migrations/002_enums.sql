-- Enums for ResQAI Emergency Platform

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'ADMIN',
      'CONTROL_ROOM_OPERATOR',
      'RESOURCE_OFFICER',
      'VIEWER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type') THEN
    CREATE TYPE department_type AS ENUM (
      'POLICE',
      'FIRE',
      'MEDICAL',
      'DISASTER_MANAGEMENT',
      'MUNICIPAL',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM (
      'REPORTED',
      'ANALYSING',
      'PRIORITIZED',
      'AWAITING_DISPATCH',
      'DISPATCHED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emergency_type') THEN
    CREATE TYPE emergency_type AS ENUM (
      'ROAD_ACCIDENT',
      'FIRE',
      'MEDICAL',
      'FLOOD',
      'BUILDING_COLLAPSE',
      'NATURAL_DISASTER',
      'INDUSTRIAL_ACCIDENT',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'injury_level') THEN
    CREATE TYPE injury_level AS ENUM (
      'NONE',
      'MINOR',
      'MODERATE',
      'SEVERE',
      'UNKNOWN'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM (
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
    CREATE TYPE resource_type AS ENUM (
      'AMBULANCE',
      'FIRE_UNIT',
      'POLICE_UNIT',
      'RESCUE_TEAM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status') THEN
    CREATE TYPE resource_status AS ENUM (
      'AVAILABLE',
      'ASSIGNED',
      'BUSY',
      'OFFLINE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM (
      'RECOMMENDED',
      'ACCEPTED',
      'REJECTED',
      'DISPATCHED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM (
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hospital_status') THEN
    CREATE TYPE hospital_status AS ENUM (
      'OPERATIONAL',
      'NEAR_CAPACITY',
      'FULL',
      'OFFLINE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'CRITICAL_INCIDENT',
      'RESOURCE_ASSIGNED',
      'RESOURCE_REASSIGNED',
      'ALLOCATION_RECOMMENDATION',
      'ALLOCATION_REJECTED',
      'INCIDENT_RESOLVED',
      'RESOURCE_OFFLINE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simulation_status') THEN
    CREATE TYPE simulation_status AS ENUM (
      'STOPPED',
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'RESET'
    );
  END IF;
END $$;
