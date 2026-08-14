# Dynamic Resource Reallocation Engine — ResQAI Platform

## 1. Purpose

The Dynamic Reallocation Engine continuously evaluates whether the current distribution of emergency resources across active incidents is still optimal. When a significant change occurs — such as a new critical incident arriving or a unit going offline — it determines whether reassigning resources would meaningfully improve the overall emergency response system.

> **Safety Principle**: The engine **never automatically reassigns** resources. Every reallocation recommendation requires **explicit human operator review and confirmation**.

---

## 2. Trigger Events

The engine re-evaluates allocation when any of these occur via Supabase Realtime:

| Event | Channel | Trigger Condition |
| :--- | :--- | :--- |
| New CRITICAL or HIGH incident inserted | `incidents` | `eventType = INSERT`, `priority_level IN ('CRITICAL','HIGH')` |
| Existing incident priority escalated | `incidents` | `eventType = UPDATE`, `priority_level IN ('CRITICAL','HIGH')` |
| Resource status change | `resources` | `eventType = UPDATE`, `status` field changed |
| Resource assignment change | `resource_assignments` | Any `INSERT` or `DELETE` event |

All triggers are debounced by **3 seconds** to prevent burst analysis from rapid database events (e.g., a fleet status bulk update).

---

## 3. Conflict Detection (`detectConflict()`)

```typescript
detectConflict(incidents, resources, assignments): ConflictDetectionResult
```

Returns:
```typescript
{
  hasConflict: boolean,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  affectedIncidents: string[],
  affectedResources: string[],
  reason: string
}
```

**Conflict conditions evaluated:**
1. **CRITICAL severity**: CRITICAL incidents exist with no currently available fleet unit.
2. **HIGH severity**: Active demand (unassigned incidents) exceeds available fleet capacity.
3. **LOW (stable)**: No conflict detected.

---

## 4. Protection Levels

Each incident assignment is tagged with a protection level preventing inappropriate resource reallocation:

| Incident Priority | Protection Level | Reassignment Policy |
| :--- | :--- | :--- |
| `CRITICAL` | `PROTECTED` | Never reassign (penalty: +100 pts to reallocation cost) |
| `HIGH` | `HIGH` | Strong protection (penalty: +45 pts) |
| `MEDIUM` | `NORMAL` | Moderate protection (penalty: +20 pts) |
| `LOW` | `REASSIGNABLE` | No penalty — freely reassignable |

---

## 5. Candidate Selection

When a conflict exists:
1. **Available units** (status = `AVAILABLE`) are checked first. If any available unit can serve the trigger incident, `NO_REALLOCATION_REQUIRED` is returned.
2. If no available units exist, **ASSIGNED** units are evaluated as reassignment candidates.
3. Units assigned to `PROTECTED` (CRITICAL) incidents are **excluded from consideration** as candidates.
4. Each candidate is ranked by:
   - **Suitability Score** = Capability match + ETA fitness + Protection penalty applied as a cost offset.

---

## 6. Reallocation Cost

Each potential reassignment carries a cost penalty to prevent unnecessary disruption:

```
Reallocation Cost = Protection Level Penalty × 0.10
```

This penalty is subtracted from the proposed system quality score before comparing with the current score. Only improvements above the **minimum threshold (+5 pts)** are accepted as valid recommendations.

---

## 7. Global Allocation Quality Score (0-100)

The System Quality Score evaluates the entire emergency fleet allocation, **not just the trigger incident**:

| Condition | Score Impact |
| :--- | :--- |
| Served incident with ETA ≤ 15 min | No penalty |
| Served incident with ETA 15–25 min | −5 pts |
| Served incident with ETA > 25 min | −15 pts |
| Unserved CRITICAL incident | −35 pts |
| Unserved HIGH incident | −20 pts |
| Unserved MEDIUM incident | −10 pts |
| Unserved LOW incident | −5 pts |

Score range: clamped to `[0, 100]`. Score of `100` = all incidents served with excellent ETAs.

---

## 8. Before / After Comparison

The UI shows side-by-side current vs. proposed allocation:

**Current:**
```
INC-1041  HIGH   → AMB-01  ETA: 5m
INC-1042  MEDIUM → AMB-02  ETA: 7m
INC-1044  CRITICAL → No unit assigned
```

**Proposed:**
```
INC-1041  HIGH   → AMB-01  ETA: 5m   (unchanged)
INC-1042  MEDIUM → AMB-04  ETA: 9m   (alternative)
INC-1044  CRITICAL → AMB-02  ETA: 5m (reassigned)
```

System Quality: **71 → 89** (+18 pts improvement)

---

## 9. Operator Approval Workflow

```
Trigger Event
   ↓
Realtime Analysis (debounced 3s)
   ↓
REALLOCATION_RECOMMENDED
   ↓
Alert Banner appears (top of screen)
   ↓
Operator clicks "Review Details"
   ↓
ReallocationReviewModal opens
   ↓
Operator reviews Before/After comparison
   ↓
[CONFIRM REALLOCATION] or [REJECT]
   ↓
Stale check (re-verify resource states)
   ↓
Atomic DB updates (if confirmed)
   ↓
Audit log entry created
```

**If operator confirms**: Atomic updates to `resource_assignments`, resource status (`ASSIGNED`), incident status (`DISPATCHED`), and incident timeline entries.

**If operator rejects**: Recommendation marked `REJECTED`. Audit entry added. No resource state changes.

---

## 10. Stale Recommendation Protection

Before any DB write is committed, `confirmReallocation()` re-fetches all affected resources from the database. If any resource state changed since the recommendation was generated (e.g., another operator already dispatched the unit):

> *"This recommendation is no longer current because resource state changed. Please recalculate."*

The confirmation is blocked and the operator must re-trigger analysis.

---

## 11. Atomic Assignment Update

`confirmReallocation()` performs these steps sequentially:
1. **Stale check** — re-fetch all affected resources.
2. **Release old assignment** — add incident update to donor incident timeline.
3. **Create new assignment** — insert into `resource_assignments`.
4. **Update resource status** — `ASSIGNED` with new assignment ID.
5. **Update incident status** — advance trigger incident to `DISPATCHED`.
6. **Create audit record** — log in `reallocation_events`.

---

## 12. Realtime Behavior (`useReallocationRealtime.ts`)

- Subscribes to three Supabase Realtime channels: `realloc-incidents`, `realloc-resources`, `realloc-assignments`.
- Filters events for significant changes only (CRITICAL/HIGH incidents, status transitions).
- **3-second debounce** prevents analysis bursts from rapid batch events.
- **Concurrent analysis guard** (`isAnalyzing.current`) prevents overlapping analysis runs.
- Automatically calls `onReallocationNeeded(recommendation)` when a `REALLOCATION_RECOMMENDED` result is found.

---

## 13. Possible Results

| Status | Meaning | Example Message |
| :--- | :--- | :--- |
| `NO_REALLOCATION_REQUIRED` | Available unit can serve new incident directly | "AMB-04 is available and can respond in 4 min." |
| `REALLOCATION_RECOMMENDED` | Reassigning from lower-priority improves system quality | "Reassign AMB-02 from INC-1042 to INC-1044 (+18 pts system quality)." |
| `NO_FEASIBLE_REALLOCATION` | All units are protected or quality doesn't improve | "No safe reallocation. Additional resources required." |
| `PARTIAL_REALLOCATION` | (Future) One of multiple required resources can be reassigned | — |

---

## 14. Limitations

- **Prototype scope**: Assignment snapshots are computed at analysis time and may not perfectly reflect complex in-transit resource positions.
- **Routing accuracy**: ETA values depend on OSRM; fallback to Haversine estimates are less accurate.
- **Global optimality**: The engine uses greedy candidate selection, not exhaustive multi-variable combinatorial optimization. A future Phase may introduce linear programming or simulated annealing.
- **Single trigger per analysis**: Each run analyzes one trigger incident. Multiple simultaneous conflicts are evaluated sequentially, not jointly.

---

## 15. Future Optimization Improvements

- **Multi-incident simultaneous optimization**: Evaluate all unserved incidents together in a single global optimization pass.
- **Simulated annealing**: Accept temporarily worse local states to escape local optima.
- **Resource positioning prediction**: Use historical incident patterns to pre-position resources.
- **Hungarian algorithm**: Optimal assignment for multi-resource, multi-incident scenarios.
