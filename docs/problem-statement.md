# ResQAI — Problem Statement, Gap & Core Innovation

## 1. The Problem: Emergency Resource Scarcity During Surges

In municipal and regional emergency management, emergencies rarely occur in isolation. During peak traffic hours, severe weather events, or major accidents, multiple high-severity emergencies occur simultaneously across a city.

However, emergency response fleets—ambulances, fire engines, police units, and heavy rescue vehicles—are strictly limited in quantity and geographically dispersed across stations.

When five critical emergencies occur at once with only three available ambulances, traditional control rooms face an operational bottleneck:

> *"Which emergency should receive attention first, and which available unit is best suited to respond?"*

---

## 2. The Operational Gap in Existing Systems

Current CAD (Computer-Aided Dispatch) and GIS mapping software excel at:
- Receiving and logging emergency incident calls.
- Displaying vehicle locations on a map via GPS trackers.
- Manual assignment of available resources by dispatchers.

**The Gap**: Existing tools lack **dynamic decision support**. They rely entirely on manual operator memory to evaluate complex multi-factor trade-offs (distance, capability, traffic delay, casualty count, unit workload, and priority escalation). When multiple incidents arrive concurrently, manual decision-making leads to delayed dispatch times, sub-optimal unit assignments, and unhandled high-priority emergencies.

---

## 3. The ResQAI Solution

**ResQAI** is an intelligent decision-support command center platform that assists control-room operators in real time.

It continuously executes three core capabilities:

1. **Deterministic Priority Intelligence**: Evaluates incident reports and assigns an explainable 0–100 priority score and priority classification (CRITICAL, HIGH, MEDIUM, LOW) based on objective risk factors.
2. **Multi-Factor Resource Allocation**: Computes suitability scores for candidate fleet units considering vehicle capability, travel distance, estimated arrival time (ETA), and current workload.
3. **Operator Decision Support**: Recommends top candidate units with transparent bulleted explanations while keeping the human operator in full control to confirm, approve, or override recommendations.

---

## 4. The Core Innovation: Dynamic Resource Reallocation

ResQAI's primary technical innovation is **Dynamic Resource Reallocation**:

When a new **CRITICAL** emergency arrives during a fleet shortage:
- ResQAI detects the capacity conflict in real time.
- It analyzes active low/medium priority assignments.
- If reassigning a unit to the critical incident yields a significant net gain in system-wide operational efficiency (without compromising safe minimum response thresholds for the lower-priority incident), ResQAI alerts the operator with a recommended reallocation proposal.

This continuous Pareto-aware recalculation ensures that critical life-threatening emergencies receive immediate response even under severe resource constraints.
