# Incident Management Module Documentation: ResQAI Platform

## 1. Module Overview
The Incident Management module is the central operational record system of ResQAI. It handles emergency report intake, priority sorting, status lifecycle progression, and update timeline logging for emergency control rooms.

---

## 2. Incident Lifecycle & Status Workflow
An emergency incident progresses through a strict, validated status state machine:

```
[ REPORTED ] ──> [ ANALYSING ] ──> [ PRIORITIZED ] ──> [ AWAITING_DISPATCH ] ──> [ DISPATCHED ] ──> [ IN_PROGRESS ] ──> [ RESOLVED ] ──> [ CLOSED ]
```

### Valid Transition State Machine (`isValidStatusTransition`):
- `REPORTED`: Can transition to `ANALYSING`, `CLOSED`.
- `ANALYSING`: Can transition to `PRIORITIZED`, `CLOSED`.
- `PRIORITIZED`: Can transition to `AWAITING_DISPATCH`, `CLOSED`.
- `AWAITING_DISPATCH`: Can transition to `DISPATCHED`, `CLOSED`.
- `DISPATCHED`: Can transition to `IN_PROGRESS`, `CLOSED`.
- `IN_PROGRESS`: Can transition to `RESOLVED`, `CLOSED`.
- `RESOLVED`: Can transition to `CLOSED`.
- `CLOSED`: Terminal state (no further transitions permitted).

---

## 3. Incident Data Fields & Validation Rules

| Field Name | Type | Validation Rules / Constraints |
| :--- | :--- | :--- |
| `incidentNumber` | `string` | Unique identifier (e.g. `INC-1001`), database sequence generated |
| `title` | `string` | **Required**, non-empty string |
| `emergencyType` | `EmergencyType` | **Required**, enum (`ROAD_ACCIDENT`, `FIRE`, `MEDICAL`, `FLOOD`, `BUILDING_COLLAPSE`, `NATURAL_DISASTER`, `INDUSTRIAL_ACCIDENT`, `OTHER`) |
| `description` | `string` | **Required**, non-empty text |
| `address` | `string` | **Required**, non-empty text |
| `latitude` | `number` | **Required**, numeric value between $-90.0$ and $+90.0$ |
| `longitude` | `number` | **Required**, numeric value between $-180.0$ and $+180.0$ |
| `peopleAffected` | `number` | **Required**, integer $\ge 0$ |
| `injuryLevel` | `InjuryLevel` | **Required**, enum (`NONE`, `MINOR`, `MODERATE`, `SEVERE`, `CRITICAL`, `UNKNOWN`) |
| `status` | `IncidentStatus` | Defaults to `REPORTED` on creation |
| `priorityScore` | `number` | Range $0.00$ to $100.00$ (Calculated in Phase 7) |
| `priorityLevel` | `PriorityLevel` | Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |

---

## 4. Component Structure (`src/components/incidents/` & `src/pages/`)
```
src/
├── components/incidents/
│   ├── IncidentStatusBadge.tsx    (Visual badge styled by status token)
│   ├── IncidentPriorityBadge.tsx  (Visual priority badge with critical pulse)
│   ├── IncidentFilters.tsx        (Search bar, multi-category filters, sorting)
│   ├── IncidentCard.tsx           (Grid view card component)
│   ├── IncidentTable.tsx          (Control room tabular view component)
│   ├── IncidentForm.tsx           (Create incident input form with validation)
│   ├── IncidentTimeline.tsx       (Audit log timeline of updates)
│   ├── IncidentUpdateForm.tsx     (Form to post operational timeline updates)
│   └── IncidentDetails.tsx        (Full incident detail layout)
│
├── hooks/
│   ├── useIncidents.ts            (Realtime-enabled incident list & filter hook)
│   ├── useIncident.ts             (Single incident detail & status transition hook)
│   └── useIncidentUpdates.ts      (Timeline updates subscription hook)
│
└── pages/
    ├── Incidents.tsx              (Route /incidents - Grid/Table toggle list)
    ├── CreateIncident.tsx         (Route /incidents/create - Report intake page)
    └── IncidentDetailsPage.tsx    (Route /incidents/:id - Incident command page)
```

---

## 5. Service Layer API (`src/services/incidents.ts`)
- `getIncidents(filters?: IncidentFilters)`: Queries incidents from Supabase or local store, applies search queries, enum filters, and sorting.
- `getIncidentById(id: string)`: Fetches a single incident record.
- `createIncident(input: CreateIncidentInput)`: Inserts a new incident with database sequence number generation and initial update log.
- `updateIncidentStatus(id: string, newStatus: IncidentStatus, message?: string)`: Validates status transition rules and updates database.
- `addIncidentUpdate(incidentId: string, message: string, status: IncidentStatus)`: Inserts an entry into `incident_updates`.
- `getIncidentUpdates(incidentId: string)`: Fetches timeline audit logs ordered by timestamp.

---

## 6. Realtime & RLS Security
- **Supabase Realtime**: List and detail views listen to `postgres_changes` on `public.incidents` and `public.incident_updates`.
- **Row Level Security**:
  - `CONTROL_ROOM_OPERATOR` and `ADMIN`: Read/Write access across all incidents and updates.
  - `RESOURCE_OFFICER`: Read access to incidents and update log permissions.
  - `VIEWER`: Read-only select query permissions.
