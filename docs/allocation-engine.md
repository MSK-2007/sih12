# Resource Allocation Engine Documentation: ResQAI Platform

## 1. Executive Summary & Purpose
The Resource Allocation Engine determines the best available emergency response units for a given incident. It evaluates capability fit, travel ETA, driving distance, availability status, current workload, and priority compatibility to rank candidate units with explainable suitability scores ($0-100$).

### Core Workflow:
```
Incident ──→ Priority Analysis ──→ Resource Requirements ──→ Eligible Units (AVAILABLE) ──→ OSRM Route & ETA ──→ Suitability Scoring ──→ Ranking ──→ Operator Review ──→ Dispatch Confirmation
```

### Safety & Non-Autonomous Dispatch Principle:
The allocation engine **recommends** resource dispatches. It **never automatically dispatches** units without explicit human control-room operator review and confirmation.

---

## 2. Mathematical Suitability Formula

The suitability allocation score $A \in [0, 100]$ is calculated as:

$$A = 0.30 C + 0.25 E + 0.15 D + 0.15 V + 0.10 W + 0.05 P$$

Where:
- **$C$ = Capability Match ($30\%$)**:
  - `EXACT_MATCH` $\to 100$
  - `GOOD_MATCH` $\to 85$
  - `PARTIAL_MATCH` $\to 60$
  - `NO_MATCH` $\to 0$
- **$E$ = Travel ETA Score ($25\%$)**:
  - $0-3\text{ min} \to 100$
  - $3-5\text{ min} \to 90$
  - $5-8\text{ min} \to 75$
  - $8-12\text{ min} \to 60$
  - $12-20\text{ min} \to 40$
  - $20+\text{ min} \to 20$
- **$D$ = Driving Distance Score ($15\%$)**:
  - $0-2\text{ km} \to 100$
  - $2-5\text{ km} \to 90$
  - $5-10\text{ km} \to 70$
  - $10-20\text{ km} \to 50$
  - $20+\text{ km} \to 20$
- **$V$ = Availability Score ($15\%$)**: `AVAILABLE` $\to 100$, `ASSIGNED`/`BUSY`/`OFFLINE` $\to 0$ (Non-available units are excluded before ranking).
- **$W$ = Workload Score ($10\%$)**: `AVAILABLE` (0 active assignment) $\to 100$, pending workload $\to 70$.
- **$P$ = Priority Compatibility ($5\%$)**: `CRITICAL` $\to 100$, `HIGH` $\to 85$, `MEDIUM` $\to 65$, `LOW` $\to 40$.

---

## 3. Resource Requirements Mapping (`resourceRequirements.ts`)

| Incident Type | Required Unit Types & Quantities |
| :--- | :--- |
| **ROAD_ACCIDENT** | $1\text{--}2\text{ Ambulances}$, $1\text{ Police Unit}$ ($+1\text{ Rescue Team}$ if casualties $>5$ or `CRITICAL`) |
| **FIRE** | $1\text{--}2\text{ Fire Units}$, $1\text{ Ambulance}$ ($+1\text{ Police Unit}$ if `HIGH`/`CRITICAL`) |
| **BUILDING_COLLAPSE** | $2\text{ Rescue Teams}$, $1\text{--}2\text{ Ambulances}$, $1\text{ Fire Unit}$, $1\text{ Police Unit}$ |
| **FLOOD** | $2\text{ Rescue Teams}$, $1\text{ Ambulance}$, $1\text{ Fire Unit}$ |
| **INDUSTRIAL_ACCIDENT**| $1\text{ Fire Unit}$ (Hazmat), $1\text{ Ambulance}$ (Toxicology ALS), $+1\text{ Rescue Team}$ if casualties $>4$ |
| **MEDICAL** | $1\text{--}2\text{ Ambulances}$ (ALS/BLS) |

---

## 4. Module Architecture (`src/engines/` & `src/components/allocation/`)

```
src/
├── engines/
│   ├── allocationConfig.ts         (Weights, score mapping functions, preferred capability tags per emergency category)
│   ├── resourceRequirements.ts    (Dynamic resource type & quantity requirement resolver)
│   ├── allocationExplanation.ts   (Generates natural rationale statements for recommendations)
│   ├── allocationEngine.ts        (ResourceAllocationEngine class & evaluateCapabilityMatch)
│   └── __tests__/
│       └── allocationEngine.test.ts (12 unit test cases covering edge and tie-breaker scenarios)
│
├── services/
│   └── allocation.ts              (Data layer orchestrating routing, candidate evaluation, stale detection & DB transactions)
│
├── hooks/
│   └── useAllocation.ts           (State management hook for analysis, dispatching, and stale handling)
│
└── components/allocation/
    ├── RecommendationCard.tsx     (Recommendation card with rank, suitability score gauge, ETA, distance, and map link)
    ├── DispatchConfirmationModal.tsx(Modal popup for explicit operator review and confirmation)
    └── ResourceRecommendations.tsx(Main recommendations container mounted on /incidents/:id)
```

---

## 5. Transaction Safety & Stale Detection
Before confirming a dispatch, `confirmDispatch()` performs a mandatory **atomic stale check**:
1. Re-fetches database status for all selected resource IDs.
2. If ANY selected unit was assigned by another operator during review (status $\neq$ `AVAILABLE`), the system rejects dispatch and displays:
   > *"AMB-07 is no longer available. Recalculate recommendations."*
3. Prevents duplicate assignments and race conditions across control-room screens.

---

## 6. Unit Test Suite (12 Scenarios)
The test suite in `src/engines/__tests__/allocationEngine.test.ts` validates:
1. **Multiple Resources Ranking**: Capable units with short ETAs are ranked #1.
2. **Capability Preference**: Capable ALS trauma unit ranks above BLS unit for severe accidents despite slight distance difference.
3. **BUSY Unit Exclusion**: `BUSY` resources are completely excluded from recommendations.
4. **No Resources Status**: Returns `NO_RESOURCES_AVAILABLE` when all units are unavailable.
5. **Score Tie-Breaker**: Breaks ties by favoring lower ETA and shorter distance.
6. **Critical Priority Influence**: Evaluates $100\%$ compatibility score for `CRITICAL` incidents.
7. **Multiple Requirements**: Generates multi-type requirements (Ambulance + Police + Rescue).
8. **Partial Recommendation Status**: Returns `PARTIAL_RECOMMENDATION` when available units are fewer than required.
9. **Route Fallback Handling**: Seamlessly handles Haversine estimate fallback if OSRM is unreachable.
10. **Stale Resource Detection**: Correctly identifies non-`AVAILABLE` units.
11. **Explanation Rationale**: Ensures human-readable explanation strings are generated.
12. **Allocation Summary**: Verifies summary message outputs.

---

## 7. Future Dynamic Reallocation Integration (Phase 9)
Phase 8 calculates candidate suitability for currently available units (`AVAILABLE`). Phase 9 will consume `AllocationAnalysis` to identify candidate units currently assigned to lower-priority incidents when a `CRITICAL` incident emerges.
