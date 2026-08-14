# Development Plan & Roadmap: ResQAI Platform

## Roadmap Phases Status

### Phase 1: Problem & Research — [COMPLETED]
- Documented emergency response bottlenecks, stakeholders, operator workflow, non-autonomous decision support constraints.
- Output: `docs/problem-research.md`.

### Phase 2: System Architecture — [COMPLETED]
- Technical architecture specification, technology stack selection, clean layer separation, security RBAC model.
- Output: `docs/architecture.md`, `docs/database-schema.md`, `docs/intelligence-engine.md`, `docs/simulation.md`.

### Phase 3: Database & Backend Foundation — [COMPLETED]
- Configured React + TypeScript + Vite project structure with Tailwind CSS dark control-room theme.
- Created SQL migrations (`001_extensions.sql` through `007_realtime.sql` and `008_incident_sequence.sql`) and `supabase/seed.sql`.
- 12 PostgreSQL tables: `profiles`, `departments`, `incidents`, `resources`, `resource_assignments`, `hospitals`, `locations`, `incident_updates`, `notifications`, `simulation_runs`, `simulation_events`, `analytics_results`.
- Implemented TypeScript domain models (`src/types/`) and database service layer (`src/services/`).

### Phase 4: Incident Management Module — [COMPLETED]
- Built complete Incident Management UI module with routes `/incidents`, `/incidents/create`, `/incidents/:id`.
- Grid (Card) and Tabular (Desk Table) view toggle with priority badges (CRITICAL pulse, HIGH, MEDIUM, LOW).
- Multi-field search, emergency type filter, priority filter, status filter, injury filter, and priority score sorting.
- Form validation for emergency intake (title, type, description, address, coordinates, casualties, injury level).
- State machine transition validation (`isValidStatusTransition`) preventing invalid state jumps.
- Audit update timeline logging (`incident_updates` integration) and update posting form.
- Realtime state synchronization hooks (`useIncidents`, `useIncident`, `useIncidentUpdates`).
- Connected active incident metrics to Control Room Dashboard.
- Output: `docs/incident-management.md`.

### Phase 5: Resource Management Module — [COMPLETED]
- Fleet management module supporting 4 resource types (`AMBULANCE`, `FIRE_UNIT`, `POLICE_UNIT`, `RESCUE_TEAM`).
- Readiness status machine (`AVAILABLE`, `ASSIGNED`, `BUSY`, `OFFLINE`) with state transition validation rules (`validateResourceStatusTransition`).
- Live statistics summary bar (Total, Available, Assigned, Busy, Offline counters connected to Supabase state).
- Built routes: `/resources`, `/resources/create`, `/resources/:id`, `/resources/:id/edit`.
- Built components: `ResourceTable`, `ResourceCard`, `ResourceFilters`, `ResourceStatusBadge`, `ResourceTypeBadge`, `ResourceForm`, `ResourceDetails`, `ResourceStatusControl`, `ResourceAssignmentHistory`, `ResourceStats`.
- Form validation enforcing unique resource codes, capacity $\ge 0$, and valid coordinate bounds.
- Current assignment and historical dispatch timeline logging (`resource_assignments` integration).
- Realtime state synchronization hooks (`useResources`, `useResource`, `useResourceAssignments`).
- Connected live resource counts to Command Center Dashboard.
- Output: `docs/resource-management.md`.

### Phase 6: GIS & Routing System — [COMPLETED]
- Real-time Leaflet & OpenStreetMap interactive GIS system with OSRM driving route engine.
- Configured default prototype map center (Bengaluru `[12.9716, 77.5946]`) in `src/config/map.ts`.
- Distinct SVG markers for Incidents (CRITICAL pulse red, HIGH orange, MEDIUM yellow, LOW green), Resources (Ambulance, Fire, Police, Rescue), and Trauma Hospitals.
- Built routing service `src/services/routing.ts` returning strongly typed `RouteResult` (distanceKm, durationMinutes, geometry polyline) with client-side caching and Haversine fallback.
- Pairwise Spatial Routing Analysis panel allowing control-room operators to select Resource + Incident and calculate driving distance and ETA.
- Deep linking: `/map?incidentId=:id` and `/map?resourceId=:id` auto-center and inspect target spatial markers.
- Added "View On GIS Map" buttons on `/incidents/:id` and `/resources/:id`.
- Realtime spatial state updates via Supabase Realtime in `useMapData`.
- Output: `docs/gis-routing.md`.

### Phase 7: Priority Intelligence Engine — [COMPLETED]
- Explainable weighted scoring engine calculating Priority Score ($0-100$) and Priority Level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Formula: $P = 0.30 S + 0.20 A + 0.20 I + 0.15 E + 0.10 L + 0.05 W$.
- Created `src/engines/priorityConfig.ts`, `src/engines/priorityExplanation.ts`, `src/engines/priorityEngine.ts`.
- Built 10 unit test cases in `src/engines/__tests__/priorityEngine.test.ts` validating boundaries, missing fields, and waiting time decay.
- Integrated `recalculateIncidentPriority(id)` into `src/services/incidents.ts` with Supabase persistence and timeline updates.
- Added "AI PRIORITY INTELLIGENCE ANALYSIS" card on `/incidents/:id` with factor progress bars, natural language rationale, and "[RECALCULATE PRIORITY]" trigger button.
- Realtime score synchronization across control-room screens.
- Output: `docs/priority-engine.md`.

### Phase 8: Resource Allocation Engine — [COMPLETED]
- Multi-factor suitability allocation engine ranking available fleet units ($0-100$).
- Formula: $A = 0.30 C + 0.25 E + 0.15 D + 0.15 V + 0.10 W + 0.05 P$.
- Created `src/engines/allocationConfig.ts`, `src/engines/resourceRequirements.ts`, `src/engines/allocationExplanation.ts`, `src/engines/allocationEngine.ts`.
- Built 12 unit test cases in `src/engines/__tests__/allocationEngine.test.ts` validating capability matching, ETA impact, tie-breakers, partial availability, and stale detection.
- Service `src/services/allocation.ts` integrating Phase 6 OSRM routing, atomic stale checks, `resource_assignments` database persistence, resource status updates (`AVAILABLE` $\to$ `ASSIGNED`), and incident status updates (`AWAITING_DISPATCH` $\to$ `DISPATCHED`).
- Mounted `ResourceRecommendations` and `DispatchConfirmationModal` on `/incidents/:id` with multi-unit selection and explicit human operator dispatch confirmation.
- Output: `docs/allocation-engine.md`.

### Phase 9: Dynamic Resource Reallocation Engine — [COMPLETED]
- Realtime conflict detection engine monitoring incidents, resources, and assignments via Supabase Realtime.
- Global System Quality Score ($0-100$) penalising unserved CRITICAL ($-35$), HIGH ($-20$), MEDIUM ($-10$), and LOW ($-5$) incidents plus ETA overruns.
- Protection level policy (`PROTECTED`, `HIGH`, `NORMAL`, `REASSIGNABLE`) preventing inappropriate reassignment from critical incidents.
- Greedy Pareto optimization: evaluates all reassignable candidates and selects the one maximizing net system quality improvement.
- Minimum improvement threshold guard (configurable, default $+5$ pts) rejects marginal reallocation suggestions.
- Created `src/engines/reallocationConfig.ts`, `src/engines/reallocationExplanation.ts`, `src/engines/reallocationEngine.ts`.
- Built 14 unit test cases in `src/engines/__tests__/reallocationEngine.test.ts`.
- Service `src/services/reallocation.ts`: `analyzeDynamicReallocation()`, `confirmReallocation()` (atomic stale check), `rejectReallocation()`, `getReallocationHistory()`.
- Realtime hook `src/hooks/useReallocationRealtime.ts` with 3-second debounce and concurrent analysis guard.
- State hook `src/hooks/useReallocation.ts` managing analysis, confirmation, rejection.
- UI: `ReallocationMonitor` (global), `ReallocationAlertBanner` (sticky amber top banner), `ReallocationReviewModal` (operator review with before/after comparison), `AllocationComparisonPanel` (quality delta visualization), `ReallocationHistoryPage` at `/reallocation`.
- Dev-mode demo trigger `[DEV] Run Analysis` visible only when `import.meta.env.DEV`.
- Operator rejection stores audit records with optional reason. Stale recommendation blocking prevents race conditions.
- Output: `docs/dynamic-reallocation.md`.

### Phase 10: Control Center Dashboard — [COMPLETED]
- Built `/control-center` primary emergency operations command center interface.
- Created `src/services/controlCenter.ts` aggregating live KPI metrics, fleet summaries, active dispatches, operator attention alerts, and service health checks.
- Created custom hook `src/hooks/useControlCenter.ts` with Supabase Realtime auto-refresh across `incidents`, `resources`, and `resource_assignments`.
- Built modular UI components in `src/components/control-center/`:
  - `ControlCenterHeader`: live IST clock, multi-field search, priority filters (`ALL`, `CRITICAL`, `HIGH`), and `+ Create Incident` quick action.
  - `KpiGrid`: 7 live metric cards (Active Incidents, Critical, Available Pool, Active Dispatches, Unassigned, Fleet Utilization %, Average Response ETA).
  - `OperatorAttention`: actionable alert box for unassigned P1 emergencies, response delays ($>10$ min), and offline units.
  - `CriticalIncidentsList`: priority-ranked P1 emergency queue with quick drawer trigger.
  - `ResourceStatusPanel`: fleet readiness progress bars across Ambulances, Fire, Police, and Rescue units.
  - `ActiveResponsesList`: live dispatches stream showing unit code, target incident, status, ETA, distance, and GIS route link.
  - `SystemStatusCard`: verifiable connection health indicators for DB, Realtime, GIS, OSRM Routing, and Auth.
  - `IncidentDrawer`: slide-over panel for inspecting incident details, AI priority explanation, and resource allocation without navigating away.
  - `RecentActivityTimeline`: live audit log stream.
- Reused Phase 6 Leaflet GIS `EmergencyMap` with interactive marker selection.
- Redirected `/` and `/dashboard` to `/control-center` while preserving all existing deep links.
- Output: `docs/control-center.md`.

### Phase 11: Notifications & Alerts System — [COMPLETED]
- Built centralized in-app real-time operational notification and alert system.
- Created `src/types/notifications.ts`: `NotificationSeverity` (`INFO`, `WARNING`, `CRITICAL`, `SUCCESS`), `NotificationType`, `NotificationState` (`UNREAD`, `READ`, `ACKNOWLEDGED`, `DISMISSED`), `AppNotification`.
- Created `src/engines/notificationRules.ts`: event-to-notification rule evaluation logic generating severity, title/message, action URL, and unique deduplication keys.
- Created `src/engines/notificationEngine.ts`: deduplication key cache enforcement preventing duplicate alert storms.
- Created `src/services/notificationEvents.ts`: centralized event processing handlers (`handleIncidentCreated`, `handleResourceStatusChanged`, `handleNoResourceAvailable`, `handleReallocationRecommended`).
- Created `src/services/notifications.ts`: Supabase table persistence + in-memory store with `getNotifications`, `markAsRead`, `markAllAsRead`, `acknowledgeNotification`, `dismissNotification`.
- Created custom hooks `src/hooks/useNotifications.ts` and `src/hooks/useNotificationRealtime.ts`.
- Built UI components in `src/components/notifications/`:
  - `NotificationBadge`: unread count badge (hides if 0).
  - `NotificationBell`: top-bar bell button triggering dropdown panel.
  - `NotificationPanel`: dropdown panel with `All`, `Unread`, `Critical` tabs and `Mark All as Read` button.
  - `NotificationItem`: notification card with severity icon, relative time, and action routing buttons.
  - `NotificationToast`: live floating toast overlay for CRITICAL and WARNING alerts.
- Built `/alerts` route at `src/pages/AlertsHistoryPage.tsx` with search, severity filter pills, and audit log list.
- Created SQL migration `supabase/migrations/009_notifications.sql` with indexes and RLS policies.
- Output: `docs/notifications.md`.

### Phase 12: Emergency Simulation Engine — [COMPLETED]
- Built `SimulationEngine`, `SimulationClock`, and scenario event loop with `sim-` ID data isolation.
- Created preset scenarios (*Urban Emergency Surge*, *Normal Day*, *Mass Casualty*, *Resource Shortage*, *Cascading Emergencies*).
- Created `/simulation` route with interactive controls (START, PAUSE, RESUME, STEP, STOP, RESET).
- Output: `docs/simulation.md`.

### Phase 13: Analytics & Performance Metrics — [COMPLETED]
- Built empirical analytics service deriving all KPIs directly from operational database records.
- 8-tab analytics view (`/analytics`): Overview, Response, Resources, Allocation, Reallocation, Incidents, Baseline vs. ResQAI, Simulation.
- Recharts visualizations and CSV export service (`analyticsExport.ts`).
- Output: `docs/analytics-definitions.md`.

### Phase 14: Testing, Security & Hardening — [COMPLETED]
- Vitest automated testing framework setup with 11 test suites and 28 passing test cases across unit, integration, simulation, analytics, security, and e2e categories.
- Role-based permissions, script input sanitization, and database error masking.
- Clean `npx tsc --noEmit` and production `npm run build`.
- Output: `docs/testing-report.md`, `docs/known-issues.md`.

### Phase 15: Final Demo, Deployment & Hackathon Readiness — [COMPLETED]
- Prominent `DemoBanner` ("⚠ SIMULATION MODE - All emergency data shown is simulated") with safe reset control.
- "WHY THIS RESOURCE?" explainable decision-support cards and Allocation / Reallocation visualizers.
- Complete documentation suite (`README.md`, `problem-statement.md`, `architecture.md`, `technology.md`, `demo-script.md`, `judge-qa.md`, `deployment.md`, `testing-report.md`, `known-issues.md`, `final-readiness-report.md`).
- 5-minute pitch script, 8-slide presentation breakdown, and 00:00–05:00 demo timeline.
- Output: `docs/final-readiness-report.md`.

