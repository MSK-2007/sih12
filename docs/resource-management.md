# Resource Management Module Documentation: ResQAI Platform

## 1. Module Overview
The Resource Management module provides a complete fleet registry for all emergency response units. It enables control-room operators and resource officers to view, register, edit, track, and manage the readiness of ambulances, fire units, police units, and rescue teams.

This module intentionally excludes GIS tracking, routing, allocation logic, and dispatch decisions — those belong to later phases.

---

## 2. Resource Types

| Type Enum    | Display Label  | Icon         | Color Code  |
| :----------- | :------------- | :----------- | :---------- |
| `AMBULANCE`  | Ambulance      | Truck        | Emerald     |
| `FIRE_UNIT`  | Fire Unit      | Flame        | Red         |
| `POLICE_UNIT`| Police Unit    | Shield       | Blue        |
| `RESCUE_TEAM`| Rescue Team    | LifeBuoy     | Amber       |

---

## 3. Resource Statuses

| Status      | Description                                         | Visual Colour |
| :---------- | :-------------------------------------------------- | :------------ |
| `AVAILABLE` | Ready and immediately deployable                    | Green         |
| `ASSIGNED`  | Has an active assignment but not yet responding     | Yellow/Amber  |
| `BUSY`      | Actively responding to or working at an incident    | Red (pulse)   |
| `OFFLINE`   | Taken out of service for maintenance or unavailable | Dark/Neutral  |

### Business Rules
1. `OFFLINE` resources must NOT be considered operational for allocation.
2. `BUSY` resources cannot be manually set to `AVAILABLE` unless the assignment is released — they must first return to `AVAILABLE` or go through `OFFLINE`.
3. `ASSIGNED` means the unit has been tasked but may not yet have responded.
4. `BUSY` means actively working at the incident site.
5. Resource capacity must always be `>= 0`.
6. Coordinates must satisfy: `latitude ∈ [-90, 90]`, `longitude ∈ [-180, 180]`.
7. Inactive units (`isActive = false`) are treated as non-deployable.

---

## 4. Status Transition Rules (`validateResourceStatusTransition`)

```
AVAILABLE  ──→ ASSIGNED, BUSY, OFFLINE
ASSIGNED   ──→ BUSY, AVAILABLE, OFFLINE
BUSY       ──→ AVAILABLE, OFFLINE
OFFLINE    ──→ AVAILABLE
```

Centralized in `src/types/resource.ts` as:
- `ALLOWED_RESOURCE_STATUS_TRANSITIONS` lookup table
- `validateResourceStatusTransition(current, target)` returns `{ valid: boolean; reason?: string }`

---

## 5. Resource Data Fields

| Field                | Type           | Notes                                       |
| :------------------- | :------------- | :------------------------------------------ |
| `id`                 | `string` (UUID)| Database primary key                        |
| `resourceCode`       | `string`       | Unique human code (e.g. `AMB-01`)           |
| `name`               | `string`       | Descriptive unit name                       |
| `resourceType`       | `ResourceType` | Enum: `AMBULANCE`, `FIRE_UNIT`, etc.        |
| `status`             | `ResourceStatus`| `AVAILABLE`, `ASSIGNED`, `BUSY`, `OFFLINE` |
| `latitude`           | `number`       | GPS coordinate (-90 to 90)                  |
| `longitude`          | `number`       | GPS coordinate (-180 to 180)                |
| `capability`         | `string[]`     | List of specialist capabilities             |
| `capacity`           | `number`       | Max patients/personnel (>= 0)               |
| `departmentId`       | `string?`      | Reference to owning department              |
| `currentAssignmentId`| `string?`      | Active dispatch assignment FK               |
| `lastLocationUpdate` | `string?`      | ISO timestamp of last GPS update            |
| `isActive`           | `boolean`      | Whether unit is operational                 |

---

## 6. Resource Assignment Relationship

Resources link to assignments via `resource_assignments` table:

```
resources (1) ──→ (*) resource_assignments
resource_assignments (*) ──→ (1) incidents
```

Assignment statuses: `RECOMMENDED`, `ACCEPTED`, `REJECTED`, `DISPATCHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

The Resource Detail page displays:
- **Current Assignment** (DISPATCHED / ACCEPTED / RECOMMENDED) with incident ID, ETA, distance, and recommendation rationale.
- **Assignment History** — all past dispatches ordered by most recent.

---

## 7. Component Structure

```
src/
├── components/resources/
│   ├── ResourceStatusBadge.tsx       (Color-coded status tag with BUSY pulse)
│   ├── ResourceTypeBadge.tsx         (Icon + label badge per fleet type)
│   ├── ResourceStats.tsx             (KPI summary: Total, Available, Assigned, Busy, Offline)
│   ├── ResourceFilters.tsx           (Search, type/status dropdowns, sort controls)
│   ├── ResourceTable.tsx             (Tabular control room desk view)
│   ├── ResourceCard.tsx              (Grid card view)
│   ├── ResourceForm.tsx              (Create & Edit form with full validation)
│   ├── ResourceStatusControl.tsx     (Operator status change buttons with validation)
│   ├── ResourceDetails.tsx           (Full unit detail layout with location editor)
│   └── ResourceAssignmentHistory.tsx (Current assignment + past dispatch history)
│
├── hooks/
│   ├── useResources.ts               (List with filters, realtime subscription)
│   ├── useResource.ts                (Single unit with status/location change methods)
│   └── useResourceAssignments.ts     (Assignment history per unit, realtime)
│
├── pages/
│   ├── Resources.tsx                 (Route /resources – Fleet registry list)
│   ├── CreateResource.tsx            (Route /resources/create – Register new unit)
│   ├── ResourceDetailsPage.tsx       (Route /resources/:id – Unit command view)
│   └── EditResourcePage.tsx          (Route /resources/:id/edit – Edit unit form)
│
└── services/
    └── resources.ts                  (All Supabase + mock-fallback data operations)
```

---

## 8. Service Layer API (`src/services/resources.ts`)

| Function                         | Description                                            |
| :------------------------------- | :----------------------------------------------------- |
| `getResources(filters?)`         | List all resources with search/filter/sort             |
| `getResourceById(id)`            | Fetch a single resource by UUID                        |
| `createResource(input)`          | Register a new unit (validates duplicate resource code)|
| `updateResource(id, input)`      | Edit name, capabilities, capacity, location, isActive  |
| `updateResourceStatus(id, status)`| Validate transition rules and update status           |
| `updateResourceLocation(id, lat, lng)`| Update GPS coordinates + lastLocationUpdate       |
| `getResourceAssignments(id)`     | Fetch current + historical dispatches for a unit       |

---

## 9. Realtime Behavior

- `useResources`: Subscribes to `postgres_changes` on `public.resources` (all events)
- `useResource`: Subscribes to `UPDATE` on `public.resources` filtered by `id`
- `useResourceAssignments`: Subscribes to `*` on `public.resource_assignments` filtered by `resource_id`
- When Supabase is not configured, hooks use the local in-memory `INITIAL_RESOURCES` seed dataset from `src/services/mockData.ts`

---

## 10. Role Permissions (Supabase RLS)

| Role                   | Create | Edit | Status Change | Location Update | View |
| :--------------------- | :----- | :--- | :------------ | :-------------- | :--- |
| `ADMIN`                | ✅     | ✅   | ✅            | ✅              | ✅   |
| `CONTROL_ROOM_OPERATOR`| ❌     | ✅   | ✅            | ✅              | ✅   |
| `RESOURCE_OFFICER`     | ❌     | ❌   | ✅ (own unit) | ✅ (own unit)   | ✅   |
| `VIEWER`               | ❌     | ❌   | ❌            | ❌              | ✅   |

---

## 11. Demo Seed Dataset (`src/services/mockData.ts`)

| Code     | Name                             | Type          | Status      |
| :------- | :------------------------------- | :------------ | :---------- |
| AMB-01   | ALS Rapid Medical Response 1     | AMBULANCE     | AVAILABLE   |
| AMB-02   | Trauma Critical Response 2       | AMBULANCE     | AVAILABLE   |
| AMB-03   | Koramangala BLS Unit 3           | AMBULANCE     | AVAILABLE   |
| AMB-04   | Whitefield ALS Unit 4            | AMBULANCE     | AVAILABLE   |
| AMB-05   | Peenya Industrial ALS Unit 5     | AMBULANCE     | AVAILABLE   |
| FIRE-01  | Central Heavy Engine 1           | FIRE_UNIT     | AVAILABLE   |
| FIRE-02  | Peenya Hazmat Fire Unit 2        | FIRE_UNIT     | AVAILABLE   |
| FIRE-03  | South Engine Company 3           | FIRE_UNIT     | AVAILABLE   |
| FIRE-04  | Whitefield Ladder Company 4      | FIRE_UNIT     | AVAILABLE   |
| POL-01   | Central Traffic & Perimeter 1    | POLICE_UNIT   | AVAILABLE   |
| POL-02   | South Police Interceptor 2       | POLICE_UNIT   | AVAILABLE   |
| POL-03   | Peenya Sector Patrol 3           | POLICE_UNIT   | AVAILABLE   |
| POL-04   | Whitefield Sector Interceptor 4  | POLICE_UNIT   | AVAILABLE   |
| RSC-01   | Urban Search & Collapse Rescue 1 | RESCUE_TEAM   | AVAILABLE   |
| RSC-02   | Flood & Water Rescue Squad 2     | RESCUE_TEAM   | AVAILABLE   |
