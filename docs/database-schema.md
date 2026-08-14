# Database Schema & Backend Architecture: ResQAI Platform

## 1. Overview & Migration Architecture
The ResQAI database foundation is built on PostgreSQL 15+ hosted via Supabase. Migrations are organized as modular SQL scripts in `supabase/migrations/` and seeded via `supabase/seed.sql`.

```
supabase/
├── migrations/
│   ├── 001_extensions.sql       (UUID extension)
│   ├── 002_enums.sql            (13 PostgreSQL ENUM types)
│   ├── 003_tables.sql           (12 Core relational tables)
│   ├── 004_relationships.sql    (Foreign keys & updated_at triggers)
│   ├── 005_indexes.sql          (Performance B-Tree indexes)
│   ├── 006_rls.sql              (Role-based access security policies)
│   └── 007_realtime.sql         (Supabase Realtime publication setup)
└── seed.sql                     (Demo dataset: 5 hospitals, 15 resources, 5 incidents, 5 locations)
```

---

## 2. PostgreSQL Enum Definitions

| Enum Type Name | Allowed Enum Values |
| :--- | :--- |
| `user_role` | `ADMIN`, `CONTROL_ROOM_OPERATOR`, `RESOURCE_OFFICER`, `VIEWER` |
| `department_type` | `POLICE`, `FIRE`, `MEDICAL`, `DISASTER_MANAGEMENT`, `MUNICIPAL`, `OTHER` |
| `incident_status` | `REPORTED`, `ANALYSING`, `PRIORITIZED`, `AWAITING_DISPATCH`, `DISPATCHED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `emergency_type` | `ROAD_ACCIDENT`, `FIRE`, `MEDICAL`, `FLOOD`, `BUILDING_COLLAPSE`, `NATURAL_DISASTER`, `INDUSTRIAL_ACCIDENT`, `OTHER` |
| `injury_level` | `NONE`, `MINOR`, `MODERATE`, `SEVERE`, `UNKNOWN` |
| `priority_level` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `resource_type` | `AMBULANCE`, `FIRE_UNIT`, `POLICE_UNIT`, `RESCUE_TEAM` |
| `resource_status` | `AVAILABLE`, `ASSIGNED`, `BUSY`, `OFFLINE` |
| `assignment_status` | `RECOMMENDED`, `ACCEPTED`, `REJECTED`, `DISPATCHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `risk_level` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `hospital_status` | `OPERATIONAL`, `NEAR_CAPACITY`, `FULL`, `OFFLINE` |
| `notification_type` | `CRITICAL_INCIDENT`, `RESOURCE_ASSIGNED`, `RESOURCE_REASSIGNED`, `ALLOCATION_RECOMMENDATION`, `ALLOCATION_REJECTED`, `INCIDENT_RESOLVED`, `RESOURCE_OFFLINE` |
| `simulation_status` | `STOPPED`, `RUNNING`, `PAUSED`, `COMPLETED`, `RESET` |

---

## 3. Database Table Specifications

### 3.1 `profiles`
Extends `auth.users(id)` with system authorization role and department context.
- `id` (UUID, Primary Key -> `auth.users.id` ON DELETE CASCADE)
- `full_name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `role` (`user_role`, NOT NULL DEFAULT `'CONTROL_ROOM_OPERATOR'`)
- `department_id` (UUID, FK -> `departments.id` ON DELETE SET NULL)
- `avatar_url` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.2 `departments`
Emergency management departments.
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `department_type` (`department_type`, DEFAULT `'OTHER'`)
- `contact_number` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.3 `locations`
Geographic emergency zones and risk indices.
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `address` (TEXT)
- `latitude`, `longitude` (DOUBLE PRECISION, NOT NULL)
- `zone` (TEXT, NOT NULL)
- `risk_level` (`risk_level`, DEFAULT `'MEDIUM'`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.4 `incidents`
Emergency incidents reported into the system.
- `id` (UUID, Primary Key)
- `incident_number` (TEXT, UNIQUE, NOT NULL, e.g. `INC-1001`)
- `emergency_type` (`emergency_type`, NOT NULL)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `latitude`, `longitude` (DOUBLE PRECISION, NOT NULL)
- `address` (TEXT, NOT NULL)
- `people_affected` (INTEGER, DEFAULT 1 CHECK >= 0)
- `injury_level` (`injury_level`, DEFAULT `'MODERATE'`)
- `severity` (`priority_level`, DEFAULT `'MEDIUM'`)
- `priority_score` (NUMERIC(5,2), DEFAULT 0.00 CHECK 0-100)
- `priority_level` (`priority_level`, DEFAULT `'MEDIUM'`)
- `status` (`incident_status`, DEFAULT `'REPORTED'`)
- `reported_at` (TIMESTAMPTZ, DEFAULT NOW())
- `created_by` (UUID, FK -> `profiles.id`)
- `assigned_operator` (UUID, FK -> `profiles.id`)
- `location_id` (UUID, FK -> `locations.id`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.5 `resources`
Emergency response fleet units.
- `id` (UUID, Primary Key)
- `resource_code` (TEXT, UNIQUE, NOT NULL, e.g. `AMB-01`)
- `name` (TEXT, NOT NULL)
- `resource_type` (`resource_type`, NOT NULL)
- `status` (`resource_status`, DEFAULT `'AVAILABLE'`)
- `latitude`, `longitude` (DOUBLE PRECISION, NOT NULL)
- `capability` (TEXT[], DEFAULT `'{}'`)
- `capacity` (INTEGER, DEFAULT 1 CHECK >= 1)
- `department_id` (UUID, FK -> `departments.id`)
- `current_assignment_id` (UUID, FK -> `resource_assignments.id`)
- `last_location_update` (TIMESTAMPTZ)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.6 `resource_assignments`
Tracks dispatch recommendations and active assignments.
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK -> `incidents.id` ON DELETE CASCADE)
- `resource_id` (UUID, FK -> `resources.id` ON DELETE CASCADE)
- `assignment_status` (`assignment_status`, DEFAULT `'RECOMMENDED'`)
- `recommended_at` (TIMESTAMPTZ, DEFAULT NOW())
- `accepted_at`, `dispatched_at`, `started_at`, `completed_at` (TIMESTAMPTZ)
- `distance_km` (NUMERIC(6,2))
- `estimated_response_minutes` (NUMERIC(5,1))
- `allocation_score` (NUMERIC(5,2))
- `recommendation_reason` (TEXT)
- `assigned_by` (UUID, FK -> `profiles.id`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.7 `hospitals`
Medical treatment facilities.
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `address` (TEXT, NOT NULL)
- `latitude`, `longitude` (DOUBLE PRECISION, NOT NULL)
- `emergency_capability` (TEXT[])
- `available_beds` (INTEGER, DEFAULT 0 CHECK >= 0)
- `icu_available` (INTEGER, DEFAULT 0 CHECK >= 0)
- `status` (`hospital_status`, DEFAULT `'OPERATIONAL'`)
- `contact_number` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.8 `incident_updates`
Timeline activity audit log per incident.
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK -> `incidents.id` ON DELETE CASCADE)
- `user_id` (UUID, FK -> `profiles.id`)
- `status` (`incident_status`, NOT NULL)
- `message` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3.9 `notifications`
System alerts for control room operators and officers.
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `profiles.id` ON DELETE CASCADE)
- `type` (`notification_type`, NOT NULL)
- `title` (TEXT, NOT NULL)
- `message` (TEXT, NOT NULL)
- `incident_id` (UUID, FK -> `incidents.id`)
- `resource_id` (UUID, FK -> `resources.id`)
- `is_read` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3.10 `simulation_runs`
Metadata for simulation runs.
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `status` (`simulation_status`, DEFAULT `'RUNNING'`)
- `started_at`, `ended_at` (TIMESTAMPTZ)
- `incident_count`, `resource_count` (INTEGER)
- `configuration` (JSONB)
- `created_by` (UUID, FK -> `profiles.id`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.11 `simulation_events`
Individual timeline logs during simulation runs.
- `id` (UUID, Primary Key)
- `simulation_run_id` (UUID, FK -> `simulation_runs.id` ON DELETE CASCADE)
- `event_type` (TEXT, NOT NULL)
- `event_time` (TIMESTAMPTZ, NOT NULL)
- `incident_id` (UUID, FK -> `incidents.id`)
- `resource_id` (UUID, FK -> `resources.id`)
- `payload` (JSONB)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3.12 `analytics_results`
Computed performance benchmark metrics.
- `id` (UUID, Primary Key)
- `simulation_run_id` (UUID, FK -> `simulation_runs.id` ON DELETE CASCADE)
- `metric_name` (TEXT, NOT NULL)
- `metric_value` (NUMERIC(10,2), NOT NULL)
- `metric_unit` (TEXT, NOT NULL)
- `baseline_value`, `resqai_value` (NUMERIC(10,2))
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 4. Row Level Security & Realtime Setup
- RLS enabled on all 12 tables with role-based policies for `ADMIN`, `CONTROL_ROOM_OPERATOR`, `RESOURCE_OFFICER`, and `VIEWER`.
- Supabase Realtime enabled for: `incidents`, `resources`, `resource_assignments`, `incident_updates`, `notifications`.
