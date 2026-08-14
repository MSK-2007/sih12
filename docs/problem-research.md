# Problem & Research: ResQAI Platform

## 1. Problem Context (PH-06)
In real-world emergency response scenarios, multiple critical incidents frequently occur simultaneously across urban and rural zones (e.g., road accidents, fires, floods, building collapses). Traditional dispatch systems rely primarily on manual dispatchers, first-come-first-served queues, or static proximity matching.

### Key Pain Points:
1. **Queue Bottlenecks**: High-severity incidents reported later may wait behind low-severity incidents reported earlier.
2. **Sub-optimal Allocation**: Matching resources solely based on raw Euclidean distance without considering resource capability, traffic ETA, hospital capacity, or unit readiness.
3. **Lack of Dynamic Reallocation**: When an ultra-critical emergency occurs (e.g., building collapse with casualties), resources already dispatched to lower-priority incidents are rarely pre-empted or re-routed systematically.
4. **Lack of Explainability**: Operators are presented with black-box recommendations without clear breakdown of *why* a particular resource was chosen.
5. **Operator Fatigue & Error**: In high-stress scenarios, manual decision-making creates response delays.

---

## 2. Solution: ResQAI Decision-Support System
ResQAI is an **Intelligent Emergency Control-Room Platform** designed to assist human operators in making real-time, high-stakes dispatch decisions.

### Core Non-Negotiable Principles:
- **Decision-Support, Not Autonomous Execution**: Human operators retain final control to approve, reject, or modify any recommendation (`ACCEPT DISPATCH` / `REJECT` / `REALLOCATE`).
- **Explainable Optimization**: Every priority score and allocation recommendation includes a detailed, multi-factor breakdown.
- **Dynamic Re-evaluation**: The system continuously monitors the active emergency field and evaluates whether a higher-priority event justifies reallocating an already-assigned unit.
- **Data-Driven Simulation**: Analytics and performance metrics are calculated strictly from real or simulated execution data, avoiding hardcoded fake improvement stats.

---

## 3. Key Stakeholders & User Roles
1. **System Admin (`ADMIN`)**: User management, system configuration, department setup, resource fleet configuration.
2. **Control Room Operator (`CONTROL_ROOM_OPERATOR`)**: Monitor live map, inspect incoming incidents, view AI priority scores, evaluate resource recommendations, approve/reject dispatches, handle dynamic reallocations.
3. **Resource Officer / Field Unit (`RESOURCE_OFFICER`)**: View assigned unit status, update location telemetry, mark status (`EN_ROUTE`, `ON_SCENE`, `COMPLETED`), accept dispatches.
4. **Executive / Auditor (`VIEWER`)**: Read-only access to live dashboards, active map view, and post-simulation analytics.

---

## 4. Benchmark & Innovation Summary
| Feature | Legacy Dispatch Systems | ResQAI Platform |
| :--- | :--- | :--- |
| **Prioritization** | Static / Manual Queue | Dynamic multi-factor scoring (0-100) with weighted time decay |
| **Resource Selection** | Nearest available unit | Capability + Capacity + Traffic ETA + Workload suitability |
| **Reallocation** | Manual pre-emption (rare) | Automated dynamic swap detection with Pareto optimization |
| **Explainability** | None (Dispatcher intuition) | Transparent factor breakdown & rationale for operator approval |
| **Telemetry & Mapping** | Disconnected tools | Integrated GIS map with real-time Leaflet visualization & OSRM routing |
