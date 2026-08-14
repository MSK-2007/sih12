# Simulation Architecture & Demonstration Scenario: ResQAI Platform

## 1. Simulation Engine Architecture
The Simulation Engine (`src/engines/simulationEngine.ts`) provides a deterministic, event-driven scenario runner designed to demonstrate ResQAI's capabilities under stress conditions.

```
       ┌───────────────────────────────────────┐
       │     Simulation Controller UI          │
       │ [START]  [PAUSE]  [RESUME]  [RESET]   │
       │ Speed: [1x]  [2x]  [5x]  [10x]        │
       └──────────────────┬────────────────────┘
                          │
                          ▼
       ┌───────────────────────────────────────┐
       │    Event Queue (Timed Triggers)       │
       │  - 10:00: Incident 1 (Road Accident)   │
       │  - 10:03: Incident 2 (Medical)        │
       │  - 10:07: Incident 3 (Building Collapse)│ <--- Trigger Reallocation
       └──────────────────┬────────────────────┘
                          │
                          ▼
       ┌───────────────────────────────────────┐
       │     ResQAI Intelligence Pipeline      │
       │ Priority -> Allocation -> Reallocation│
       └──────────────────┬────────────────────┘
                          │
                          ▼
       ┌───────────────────────────────────────┐
       │   Real-time State & Analytics Update  │
       └───────────────────────────────────────┘
```

---

## 2. Seed Dataset Overview
The simulation dataset represents an urban region divided into 5 geographic zones (North, South, East, West, Central):

- **20 Incidents**: Spanning Road Accidents, Building Collapse, Chemical Spill, Residential Fire, Flood, and Cardiac Emergencies.
- **15 Resources**: 6 Ambulances (`AMB-01` to `AMB-06`), 4 Fire Units (`FIRE-01` to `FIRE-04`), 3 Police Units (`POL-01` to `POL-03`), 2 Rescue Teams (`RSC-01`, `RSC-02`).
- **10 Hospitals**: Major Trauma Centers, General Hospitals, and Specialty Burn Centers with dynamic bed/ICU availability.
- **5 Risk Zones**: Central (High traffic risk 1.5x), East Industrial (1.4x), West Riverbank (1.3x), North Suburban (1.0x), South Residential (1.1x).

---

## 3. Core Hackathon Demonstration Scenario (The End-to-End Success Path)

### Step 1: Baseline Initialization (10:00 AM)
- Operational Command Dashboard displays 15 Available Units on the Leaflet GIS map.
- Incident 1 (`INC-101`): Road Accident in South Zone (2 injured, Priority 62 MEDIUM).
- `allocationEngine` selects nearest available ambulance (`AMB-01`, ETA 8 min). Operator approves dispatch.

### Step 2: Resource Saturation (10:05 AM)
- Incidents 2, 3, and 4 reported across town (Fires, Medical emergencies).
- Ambulances `AMB-01`, `AMB-02`, `AMB-03` are all dispatched (`BUSY`).

### Step 3: High-Urgency Emergency Arrival (10:08 AM)
- Incident 5 (`INC-105`): Structural Building Collapse in Central Zone (12 people trapped, 4 critical injuries, Priority 96 CRITICAL).
- Unassigned ambulances are located far away (ETA > 22 min).

### Step 4: ResQAI Dynamic Reallocation Trigger
- `reallocationEngine` detects that `AMB-02` (assigned to lower-priority `INC-102` Priority 45) is only 1.8 km from `INC-105` (ETA 4 min).
- Reallocation Proposal generated:
  - **Reallocate**: `AMB-02` from `INC-102` -> `INC-105`
  - **Backfill**: `AMB-05` (ETA 14 min) reassigned to `INC-102`.
  - **Net Urgency Gain**: Saved 18 minutes response time for CRITICAL casualties.

### Step 5: Operator Review & Realtime Execution
- Operator clicks `ACCEPT REALLOCATION` in control-room modal.
- Leaflet Map animates path change in real time.
- System records telemetry event to `simulation_events` table.

### Step 6: Analytics & Comparative Evaluation
- Post-simulation report compares Baseline FCFS vs ResQAI Strategy:
  - Average Critical Incident Response Time: Reduced from 19.4 min to 7.2 min.
  - Resource Allocation Efficiency: +38% optimal capability match.
