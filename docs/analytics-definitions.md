# ResQAI Analytics — Metric Definitions

This document defines every metric shown in the ResQAI Analytics & Impact Dashboard.
Definitions match exactly what is calculated in `src/services/analytics.ts`.

> **PROTOTYPE NOTICE**: All metrics are calculated from the ResQAI prototype system.
> No values are real-world emergency-service benchmarks.
> All improvement claims are in-simulation comparisons only.

---

## 1. Response Time

**Definition**: Time elapsed from `incident.createdAt` to the `createdAt` timestamp of the first resource assignment with status `ACCEPTED` or `DISPATCHED` for that incident.

**Formula**: `first_dispatched_assignment.createdAt − incident.createdAt` (in minutes)

**When shown as `—`**: No ACCEPTED or DISPATCHED assignment exists for the incident.

**Not used**: `dispatchedAt` timestamp (often null in prototype). `createdAt` of the assignment record is used as a proxy.

---

## 2. Wait Time

**Definition**: Time elapsed from `incident.createdAt` to `recommendedAt` of the first assignment record for that incident (regardless of status).

**Formula**: `first_assignment.recommendedAt − incident.createdAt` (in minutes)

**Meaning**: How long an incident waited before any resource recommendation was generated.

---

## 3. Resolution Time

**Definition**: Time elapsed from `incident.createdAt` to `incident.updatedAt` for incidents with status `RESOLVED` or `CLOSED`.

**Formula**: `incident.updatedAt − incident.createdAt` (in minutes, only when status = RESOLVED/CLOSED)

**Limitation**: Resolution time requires the incident to have been explicitly resolved.

---

## 4. Resource Utilization

**Definition** (assignment-based proxy):

```
Utilization = (ASSIGNED + BUSY resources) / total active resources × 100
```

**Active resources**: `isActive = true`

**Why assignment-based**: True time-based utilization (time assigned / operational hours) requires persistent activity logs. This prototype uses current status as a proxy.

**Document label**: "assignment-based" — always shown in the UI next to the value.

---

## 5. Allocation Success Rate

**Definition**:

```
Allocation Success Rate = incidents with ≥1 ACCEPTED/DISPATCHED assignment / total incidents × 100
```

**Eligible incidents**: All incidents in the selected period.

**Accepted/Dispatched assignments**: Assignments with status `ACCEPTED`, `DISPATCHED`, `IN_PROGRESS`, or `COMPLETED`.

---

## 6. Allocation Quality Score

**Definition**: Average `allocationScore` from the Phase 8 Allocation Engine across all ACCEPTED/DISPATCHED assignments.

**Score range**: 0–100 (calculated by `allocationEngine.ts`)

**Score components** (from Phase 8): ETA score, capability match, resource load, distance.

**Not invented here**: The analytics dashboard reads directly from `resource_assignments.allocation_score`.

---

## 7. Reallocation Success Rate

**Definition** (prototype proxy):

```
Reallocation Success = ACCEPTED/DISPATCHED assignments with allocationScore ≥ 60 / total ACCEPTED/DISPATCHED × 100
```

**Limitation**: A true reallocation success measure requires before/after system-quality snapshots, which are not currently stored. The score ≥ 60 threshold is a proxy for "quality dispatch".

**Label**: Always shown with the proxy definition note.

---

## 8. Target Compliance

**Definition**:

```
Compliance = incidents responded within target time / incidents with response time data × 100
```

**Prototype targets** (configurable, not official standards):
- CRITICAL: 8 min
- HIGH: 12 min
- MEDIUM: 20 min
- LOW: 30 min

**Label**: Always shown with "Prototype target — not official emergency-service standard".

---

## 9. Baseline Comparison

**Baseline strategy**: RECOMMENDED assignments (not yet accepted by operator) — these represent the raw nearest-unit suggestion before operator confirmation and ResQAI optimization.

**ResQAI strategy**: ACCEPTED/DISPATCHED assignments — operator-confirmed optimized dispatch decisions.

**Limitation**: This is a proxy comparison within a single run. A true A/B experiment requires running two parallel simulations with identical scenarios — one using baseline allocation, one using ResQAI. The Phase 12 Simulation Engine uses ResQAI by default for all events.

**Improvement formula**:

For metrics where **lower is better** (response time, unassigned):
```
Improvement = (baseline − resqai) / baseline × 100
```

For metrics where **higher is better** (utilization, allocation quality):
```
Improvement = (resqai − baseline) / baseline × 100
```

**Division by zero**: If baseline = 0, improvement is shown as `N/A`.

---

## 10. Unassigned Incident

**Definition**: An incident with status `REPORTED`, `ANALYSING`, `PRIORITIZED`, or `AWAITING_DISPATCH`.

**Not included**: `DISPATCHED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.

---

## 11. Simulation Utilization

**Definition**: Same assignment-based formula as Resource Utilization, calculated at the time `SimulationEngine.recalculateMetrics()` is called.

```
(ASSIGNED + BUSY resources) / total active resources × 100
```

---

## Notes

- All calculations happen client-side from data returned by `getIncidents()`, `fetchAssignments()`, and `getResources()`.
- When Supabase is not configured, in-memory mock stores are used.
- Missing data → `—` (displayed) or `null` (in code). Never fabricated.
- Prototype improvement claims use "In this simulation…" framing. Never "ResQAI guarantees X% improvement."
