# ResQAI Architecture & Data Flow

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------+
|                 Operator Control Center Interface                     |
|         (React 18 + TailwindCSS + Leaflet GIS + Recharts)            |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                        Application Layer                              |
|          (React Router + Custom Hooks + UI State Managers)            |
+-----------------------------------------------------------------------+
         |                         |                         |
         v                         v                         v
+------------------+     +-------------------+     +--------------------+
| Priority Engine  |     | Allocation Engine |     | Reallocation Engine|
| - Risk Scoring   |     | - Suitability     |     | - Conflict Detection|
| - Classification |     | - Capability Match|     | - Pareto Evaluation|
| - Rule Breakdown |     | - Route & ETA     |     | - Impact Analysis  |
+------------------+     +-------------------+     +--------------------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                        GIS & Routing Service                          |
|         (OpenStreetMap Tiles + OSRM Routing + Haversine)             |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    Persistence & Realtime Layer                       |
|           (Supabase Client / PostgreSQL / Memory Store)              |
|        - Incidents, Fleet Resources, Assignments, Notifications      |
+-----------------------------------------------------------------------+
```

---

## 2. Core Components & Responsibilities

### A. Operational Interface
- **Control Center Page**: Central multi-panel operational view featuring live KPIs, active incident queue, interactive map, fleet resource status, and alert drawer.
- **GIS Map View**: Renders live markers for emergencies, ambulances, fire tenders, police units, hospitals, and active response routes.
- **Analytics Page**: Displays 8 tabbed views of empirical operational metrics and baseline vs. ResQAI performance comparisons.

### B. Intelligence Engines
- **Priority Engine (`priorityEngine.ts`)**: Evaluates incident reports against 5 weighted risk factors (Emergency Type, People Affected, Injury Severity, Zone Risk, Waiting Time) to produce deterministic 0–100 scores and explanations.
- **Allocation Engine (`allocationEngine.ts`)**: Evaluates candidate fleet units against incident requirements and ranks them using multi-factor suitability scoring.
- **Dynamic Reallocation Engine (`reallocationEngine.ts`)**: Monitors active fleet allocations during surge conditions and recommends optimal unit reassignments when new critical emergencies arise.

### C. Simulation & Realtime System
- **Simulation Engine (`SimulationEngine.ts`)**: Manages multi-event emergency scenarios (*Urban Emergency Surge*) with simulation clock controls and isolated simulated data storage (`sim-` IDs).
- **Notification Engine (`notifications.ts`)**: Subscribes to real-time database changes and pushes alert toasts to control-room operators.
