# Intelligence & Optimization Engines Specification: ResQAI Platform

## 1. Engine Architecture Overview
All intelligent decision logic in ResQAI is decoupled into standard TypeScript engine modules in `src/engines/`. No business decision formulas are hardcoded inside React components.

```
Incoming Incident Data
          │
          ▼
┌───────────────────────────┐
│   priorityEngine.ts       │ ──> Priority Score (0-100), Classification & Breakdown
└─────────┬─────────────────┘
          │
          ▼
┌───────────────────────────┐
│ resourceRequirementEngine │ ──> Required Resource Types & Minimum Counts
└─────────┬─────────────────┘
          │
          ▼
┌───────────────────────────┐
│   allocationEngine.ts     │ ──> Recommended Unit, ETA, Distance, Score & Alternatives
└─────────┬─────────────────┘
          │ (If higher priority event arrives)
          ▼
┌───────────────────────────┐
│ reallocationEngine.ts     │ ──> Dynamic Swap Proposal, Pareto Benefit & Rationale
└───────────────────────────┘
```

---

## 2. Priority Intelligence Engine (`priorityEngine.ts`)

### 2.1 Formula & Weights
$$\text{Priority Score} = \min\left(100, \sum (W_i \times F_i) + \text{TimeDecay}\right)$$

Where factors $F_i$ are normalized to $[0, 100]$:

| Factor | Weight ($W_i$) | Rating Logic |
| :--- | :--- | :--- |
| **Severity** ($F_{\text{sev}}$) | 30% | `LOW` = 25, `MEDIUM` = 50, `HIGH` = 75, `CRITICAL` = 100 |
| **People Affected** ($F_{\text{pop}}$) | 20% | $\min(100, \text{Count} \times 15)$ |
| **Injury Level** ($F_{\text{inj}}$) | 20% | `NONE` = 0, `MINOR` = 30, `MODERATE` = 60, `SEVERE` = 85, `CRITICAL` = 100 |
| **Emergency Type** ($F_{\text{type}}$) | 15% | `BUILDING_COLLAPSE` = 100, `INDUSTRIAL_ACCIDENT` = 95, `FLOOD` = 90, `FIRE` = 85, `ROAD_ACCIDENT` = 75, `MEDICAL` = 70, `NATURAL_DISASTER` = 90, `OTHER` = 40 |
| **Location Risk** ($F_{\text{loc}}$) | 10% | Zone Risk Multiplier $\times 50$ (capped at 100) |
| **Waiting Time** ($F_{\text{time}}$) | 5% | $+2.5$ points per elapsed minute waiting for dispatch (capped at 25) |

### 2.2 Classification Buckets
- **0 - 29**: `LOW`
- **30 - 59**: `MEDIUM`
- **60 - 79**: `HIGH`
- **80 - 100**: `CRITICAL`

---

## 3. Resource Requirement Engine (`resourceRequirementEngine.ts`)
Maps emergency incident properties to required resource categories:
- `ROAD_ACCIDENT` + `SEVERE`/`CRITICAL` Injuries -> `AMBULANCE` (1-2), `POLICE_UNIT` (1)
- `FIRE` -> `FIRE_UNIT` (1-2), `AMBULANCE` (1 if injuries reported), `POLICE_UNIT` (1 if high severity)
- `BUILDING_COLLAPSE` -> `RESCUE_TEAM` (1-2), `AMBULANCE` (2), `FIRE_UNIT` (1)
- `FLOOD` -> `RESCUE_TEAM` (1-2), `AMBULANCE` (1)
- `INDUSTRIAL_ACCIDENT` -> `FIRE_UNIT` (1), `AMBULANCE` (1), `RESCUE_TEAM` (1)

---

## 4. Resource Allocation Engine (`allocationEngine.ts`)

### 4.1 Scoring Function
For each candidate resource $R_j$ of the required type:

$$\text{AllocationScore}(R_j) = W_{\text{ETA}} \cdot S_{\text{ETA}} + W_{\text{Cap}} \cdot S_{\text{Cap}} + W_{\text{Readiness}} \cdot S_{\text{Readiness}}$$

Where:
- $S_{\text{ETA}} = \max(0, 100 - (\text{ETA}_{\text{minutes}} \times 4))$
- $S_{\text{Cap}} = 100$ if resource capabilities include required tags (e.g. ALS/Extrication), else 60.
- $S_{\text{Readiness}} = 100$ if `AVAILABLE`, $40$ if `ASSIGNED` to lower priority incident (potential pre-emption candidate).

### 4.2 Output Structure
Returns an `AllocationRecommendation`:
- `recommendedResource`: Best candidate object
- `allocationScore`: 0-100 score
- `etaMinutes`: Estimated travel time via OSRM/Haversine
- `distanceKm`: Traveled distance
- `explanation`: Transparent bullet points explaining choice
- `alternativeCandidates`: Array of second/third best options with comparative ETAs

---

## 5. Dynamic Reallocation Engine (`reallocationEngine.ts`)

### 5.1 Reallocation Triggers
1. Arrival of a `CRITICAL` priority incident ($P_{\text{new}} \ge 80$) when all suitable resources are `ASSIGNED`.
2. Sudden change in incident severity or affected count.
3. Assigned resource encounters road blockage / delayed ETA.

### 5.2 Pre-emption Swap Algorithm
1. Identify new unassigned incident $I_{\text{new}}$ with priority $P_{\text{new}}$.
2. Find currently assigned resources $R_k$ assigned to active incidents $I_{\text{active}, k}$ where:
   $$P_{\text{new}} - P_{\text{active}, k} \ge \Delta_{\text{threshold}} \quad (\text{e.g., } \Delta \ge 25 \text{ points})$$
3. Compute swap delta:
   $$\Delta_{\text{ETA}} = \text{ETA}(R_k \to I_{\text{new}}) - \text{ETA}(R_{\text{fallback}} \to I_{\text{active}, k})$$
4. If Net Urgency Benefit > 0, generate `ReallocationProposal`:
   - `preemptedResource`: Unit to be re-routed
   - `fromIncident`: Existing lower-priority incident
   - `toIncident`: New higher-priority incident
   - `rationale`: Clear explanation of priority gap and net response time gain
   - `operatorActionRequired`: Requires manual approval (`ACCEPT` / `REJECT`)
