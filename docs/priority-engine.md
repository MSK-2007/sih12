# Priority Intelligence Engine Documentation: ResQAI Platform

## 1. Executive Summary & Purpose
The Priority Intelligence Engine is the core decision-support scoring model of ResQAI. Its purpose is to evaluate incoming emergency reports and calculate an explainable, deterministic Priority Score ($0-100$) and Priority Level classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### Safety & Positioning Statement
ResQAI is a prototype decision-support prototype. Priority scores are baseline decision-support recommendations and do NOT replace emergency operators, medical triage standards, police, fire, or disaster management authorities. Every recommendation remains subject to human control-room operator review.

---

## 2. Mathematical Scoring Formula

The priority score $P \in [0, 100]$ is calculated as a weighted linear combination of 6 normalized factors:

$$P = 0.30 S + 0.20 A + 0.20 I + 0.15 E + 0.10 L + 0.05 W$$

Where:
- **$S$ = Severity Score ($0-100$, Weight $30\%$)**: Incident severity level. If missing, estimated via heuristic from category, injury level, and casualties.
- **$A$ = People Affected Score ($0-100$, Weight $20\%$)**:
  - $0 \to 0$
  - $1 \to 20$
  - $2 \to 35$
  - $3 \to 50$
  - $4 \to 60$
  - $5 \to 70$
  - $6-10 \to 80$
  - $11-20 \to 90$
  - $20+ \to 100$
- **$I$ = Injury Level Score ($0-100$, Weight $20\%$)**:
  - `NONE` $\to 0$
  - `MINOR` $\to 25$
  - `MODERATE` $\to 50$
  - `SEVERE` $\to 100$
  - `UNKNOWN` $\to 40$
- **$E$ = Emergency Type Score ($0-100$, Weight $15\%$)**:
  - `BUILDING_COLLAPSE` $\to 100$
  - `INDUSTRIAL_ACCIDENT` $\to 95$
  - `NATURAL_DISASTER` $\to 95$
  - `FIRE` $\to 90$
  - `MEDICAL` $\to 90$
  - `ROAD_ACCIDENT` $\to 85$
  - `FLOOD` $\to 85$
  - `OTHER` $\to 50$
- **$L$ = Location Risk Score ($0-100$, Weight $10\%$)**:
  - `CRITICAL` $\to 100$
  - `HIGH` $\to 80$
  - `MEDIUM` $\to 50$
  - `LOW` $\to 25$
  - Default: $50$ (Neutral fallback)
- **$W$ = Waiting Time Score ($0-100$, Weight $5\%$)**:
  - $0-2\text{ min} \to 10$
  - $2-5\text{ min} \to 30$
  - $5-10\text{ min} \to 50$
  - $10-20\text{ min} \to 75$
  - $20-30\text{ min} \to 90$
  - $30+\text{ min} \to 100$
  (Calculated dynamically from `reportedAt` relative to current system time).

---

## 3. Threshold Classifications & Urgency

| Priority Score Range | Classification | Urgency Recommendation |
| :--- | :--- | :--- |
| **$80 - 100$** | `CRITICAL` | *Immediate operator attention recommended* |
| **$60 - 79$** | `HIGH` | *Prompt response recommended* |
| **$30 - 59$** | `MEDIUM` | *Response should be planned* |
| **$0 - 29$** | `LOW` | *Routine monitoring* |

---

## 4. Engine Architecture (`src/engines/`)

```
src/engines/
├── priorityConfig.ts         (Centralized weights, factor mappings, threshold functions)
├── priorityExplanation.ts    (Natural language rationale generator)
├── priorityEngine.ts         (RuleBasedPriorityEngine implementing PriorityEngine interface)
└── __tests__/
    └── priorityEngine.test.ts (10 unit test cases covering all edge & boundary scenarios)
```

### Data Contract (`PriorityAnalysis`):
```ts
export interface PriorityAnalysis {
  score: number;                   // 0-100
  level: PriorityLevel;            // LOW | MEDIUM | HIGH | CRITICAL
  factors: PriorityFactorContribution[];
  explanation: string;             // Natural language rationale
  urgency: string;                 // Recommended urgency statement
  calculatedAt: string;
  engineVersion: string;
}
```

---

## 5. Explainability & Human Rationale
The engine avoids "black-box AI" claims by breaking down exact mathematical contributions for every factor:

```
Severity:        90/100  (Weight 30%)  => +27.0 pts
People Affected: 60/100  (Weight 20%)  => +12.0 pts
Injury Level:    100/100 (Weight 20%)  => +20.0 pts
Emergency Type:  85/100  (Weight 15%)  => +12.8 pts
Location Risk:   80/100  (Weight 10%)  => +8.0 pts
Waiting Time:    30/100  (Weight 5%)   => +1.5 pts
---------------------------------------------------
Total Priority Score:                     81.3 => 81/100 (CRITICAL)
```

Natural Rationale Output:
> *"Priority elevated due to severe injuries reported, multiple people affected (4 casualties), and high-risk emergency category."*

---

## 6. Unit Test Verification (10 Scenarios)
The test suite in `src/engines/__tests__/priorityEngine.test.ts` validates:
1. **Minor Medical Incident**: Evaluates to LOW/MEDIUM.
2. **Road Accident with Severe Injuries**: Evaluates to HIGH/CRITICAL.
3. **Building Collapse with 10 Casualties**: Evaluates to CRITICAL.
4. **Single Minor Injury**: Evaluates to LOW/MEDIUM (<50).
5. **Large Affected Count Impact**: Verifies $25$ casualties yields higher score than $1$ casualty.
6. **Waiting Time Decay Impact**: Verifies $35$ min delayed report yields higher score than fresh report.
7. **Missing Fields Fallback**: Handles `{}` empty input gracefully without throwing errors.
8. **Boundary Score 29/30**: Correctly classifies LOW vs MEDIUM.
9. **Boundary Score 59/60**: Correctly classifies MEDIUM vs HIGH.
10. **Boundary Score 79/80**: Correctly classifies HIGH vs CRITICAL.

---

## 7. Incident Recalculation & Realtime Flow
- Service `recalculateIncidentPriority(incidentId)` runs `priorityEngine.calculatePriority()`.
- Updates `priority_score` and `priority_level` in Supabase `incidents` table.
- Appends timeline entry: `"AI Priority Recalculated: 82/100 — HIGH (Prompt response recommended)"`.
- Realtime hooks broadcast updated priority score across all connected control-room screens.

---

## 8. Future ML Extension Architecture
The `PriorityEngine` interface allows seamless substitution or ensemble blending with a future machine learning engine:

```ts
export interface PriorityEngine {
  calculatePriority(input: PriorityEngineInput, weights?: PriorityWeights): PriorityAnalysis;
}
```

A future `MLPriorityEngine` can implement this exact interface while the baseline `RuleBasedPriorityEngine` remains available for validation and explainability audit logs.
