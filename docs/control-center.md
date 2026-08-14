# Control Center Dashboard Documentation — ResQAI Platform

## 1. Executive Summary & Purpose

The **ResQAI Control Center Dashboard** (`/control-center`) is the primary operational command center interface for emergency control-room operators. It unifies real-time incident tracking, Priority Intelligence scores, fleet readiness, OSRM GIS routing, AI allocation recommendations, and dynamic reallocation alerts into a high-density, professional command center environment.

---

## 2. Architecture & Data Flow

```
Supabase Realtime / DB ──→ src/services/controlCenter.ts ──→ src/hooks/useControlCenter.ts
                                                                        │
                                                                        ▼
                                                             src/pages/ControlCenterPage.tsx
                                                                        │
          ┌─────────────────────┬─────────────────────┬─────────────────┴───────────────────┬─────────────────────┐
          ▼                     ▼                     ▼                                     ▼                     ▼
 ControlCenterHeader        KpiGrid          OperatorAttention                     CriticalIncidentsList     Live GIS Map
                                                      │                                     │               (EmergencyMap)
                                                      ▼                                     ▼                     │
                                           ReallocationAlertBanner                   IncidentDrawer               ▼
                                           & ReallocationReviewModal                                        ActiveResponses &
                                                  (Phase 9)                                               SystemStatusCard
```

---

## 3. Core Dashboard Modules & Components

### 3.1 Header Bar & Operational Controls (`ControlCenterHeader.tsx`)
- Title: **RESQAI CONTROL CENTER**
- Status: **● LIVE MONITORING** with real-time pulsing indicator.
- Live IST clock updating every second.
- Global multi-field search input filtering incident code, title, address, or emergency category.
- Quick priority filter pills (`ALL`, `CRITICAL`, `HIGH`).
- Direct action trigger: **`+ Create Incident`**.

### 3.2 Key Performance Indicators (`KpiGrid.tsx`)
1. **Active Emergencies**: Total un-resolved incident count.
2. **Critical (P1 Priority)**: Count of emergencies with `priorityLevel = 'CRITICAL'`.
3. **Available Pool**: Fleet units in `AVAILABLE` status ready for immediate dispatch.
4. **Active Dispatches**: Fleet units in `ASSIGNED` / `BUSY` response state.
5. **Unassigned**: Incidents awaiting unit assignment.
6. **Fleet Utilization %**: Calculated as $\frac{\text{Active Units}}{\text{Total Operational Units}} \times 100$.
7. **Average Response ETA**: Fleet-wide average response time estimate ($6\text{ min}$).

### 3.3 Operator Attention Alerts (`OperatorAttention.tsx`)
Surfaces high-priority operational items requiring human decision support action:
- **Critical Unassigned Emergencies**: Highlights P1 emergencies lacking assigned response units with immediate **`Inspect Incident`** trigger.
- **Dynamic Reallocation Alerts**: Triggers **`Review Reallocation`** modal from Phase 9.
- **Delayed Responses**: Alerts when an emergency has been waiting $>10$ minutes without unit dispatch.
- **Fleet Capacity Reduction**: Alerts when units transition to `OFFLINE`.

### 3.4 Tactical GIS Map (`EmergencyMap.tsx`)
- Embeds Phase 6 OpenStreetMap + OSRM driving route engine.
- Color-coded markers for Incidents (CRITICAL pulse red, HIGH orange, MEDIUM yellow, LOW green), Fleet Units (Ambulance, Fire, Police, Rescue), and Trauma Hospitals.
- Interactive clicks on map markers launch the **Incident Drawer** (`IncidentDrawer.tsx`).

### 3.5 Critical Emergencies List (`CriticalIncidentsList.tsx`)
- Dedicated queue sorting `priorityLevel = 'CRITICAL'` emergencies by highest priority score ($0-100$).
- Displays casualties, injury level, location, assignment state, and quick **`Open`** drawer trigger.

### 3.6 Fleet Readiness & Utilization (`ResourceStatusPanel.tsx`)
- Segmented status breakdown across 4 fleet categories (`AMBULANCE`, `FIRE_UNIT`, `POLICE_UNIT`, `RESCUE_TEAM`).
- Multi-color progress bars representing `Available` (green), `Assigned` (yellow), `Busy` (orange), and `Offline` (gray).

### 3.7 Active Response Dispatches (`ActiveResponsesList.tsx`)
- Real-time stream of units en route to emergencies showing resource code, target incident, ETA in minutes, distance in km, and direct map route link.

### 3.8 Health & Service Connection Status (`SystemStatusCard.tsx`)
Verifies live operational connectivity for:
- Database (`● ONLINE`)
- Realtime Event System (`● ACTIVE`)
- GIS Map (`● READY`)
- OSRM Routing Engine (`● READY`)
- Operator Authentication (`● VERIFIED`)

### 3.9 Quick Slide-Over Incident Drawer (`IncidentDrawer.tsx`)
Allows operators to inspect emergency details, review Phase 7 AI priority score rationale, execute Phase 8 resource allocation analysis, and dispatch units without leaving the Control Center.

---

## 4. Realtime Integration

`useControlCenter.ts` subscribes to Supabase Realtime changes across:
- `incidents` (new incidents, status changes, priority recalculations)
- `resources` (availability status transitions, GPS coordinate updates)
- `resource_assignments` (dispatches, unit completions)

When database updates occur, the dashboard automatically updates KPI counters, map markers, critical lists, and active dispatches without full page reloads.

---

## 5. Security & Access Control

Route `/control-center` requires Control Room Operator role authentication. All metrics and operational logs are scoped to verified operator sessions.
