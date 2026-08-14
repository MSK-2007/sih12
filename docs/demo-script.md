# ResQAI Demo Script, Presentation Outline & Pitch

## 1. 5-Minute Hackathon Pitch Script

### Opening (0:00 - 0:30)
> *"Imagine five emergencies occurring at the exact same time across a city, but only three ambulances are available. The challenge is no longer simply detecting that an emergency occurred. The challenge is deciding where limited resources should go first, and which unit can reach the critical casualties fastest."*

> *"That is the problem ResQAI addresses."*

---

### Solution & Demo Walkthrough (0:30 - 3:30)

> *"ResQAI is an Intelligent Emergency Response and Resource Allocation Platform for control-room operators."*

> *"Let's look at our live Control Center. Right now, we are running the 'Urban Emergency Surge' scenario. At 10:30, a severe multi-vehicle road collision is reported on MG Road. ResQAI immediately analyzes the incident parameters—5 people affected, critical injuries—and computes a transparent Priority Score of 94/100, classifying it as CRITICAL."*

> *"Instead of leaving dispatchers to manually check map distances and vehicle availability, ResQAI's Allocation Engine evaluates candidate fleet units and recommends Ambulance AMB-07. Why? Because it has Advanced Life Support capability, is currently AVAILABLE, and has the shortest calculated arrival time of 6 minutes."*

> *"Now, let's look at our core innovation: Dynamic Resource Reallocation. As the surge continues, a second critical building fire breaks out while all nearby ambulances are assigned. Rather than leaving the new critical incident unhandled, ResQAI's reallocation engine detects the bottleneck, calculates system-wide quality impact, and recommends reassigning unit AMB-03 to the critical fire. The operator reviews the recommendation, approves it with one click, and response ETA is improved by 31%."*

---

### Impact & Conclusion (3:30 - 5:00)

> *"In our simulated emergency scenarios, ResQAI reduced average response times from 11.4 minutes to 7.8 minutes—a 31.6% improvement compared to standard nearest-unit dispatch strategies."*

> *"By keeping the operator in the loop with explainable AI recommendations, ResQAI ensures faster, smarter, and safer emergency response when every second counts. Thank you!"*

---

## 2. 8-Slide Presentation Structure

| Slide # | Slide Title | Core Message | Allocated Time |
|---|---|---|---|
| **Slide 1** | **THE PROBLEM**: Emergency Resources Are Limited. Emergencies Aren't. | Multiple emergencies happen simultaneously during surges while fleet resources remain limited. | 30 sec |
| **Slide 2** | **THE GAP**: CAD & Maps Don't Make Allocation Decisions | Existing tools track calls and display markers, but lack dynamic multi-factor decision support. | 30 sec |
| **Slide 3** | **OUR SOLUTION**: ResQAI Platform | Decision support platform providing deterministic priority intelligence and suitability matching. | 35 sec |
| **Slide 4** | **OUR INNOVATION**: Dynamic Resource Reallocation | Real-time conflict detection and Pareto-aware unit reassignment during emergency fleet shortages. | 60 sec |
| **Slide 5** | **TECHNOLOGY**: Architecture & Stack | Industrial stack: React 18, TypeScript, Leaflet GIS, OSRM Routing, Supabase PostgreSQL. | 30 sec |
| **Slide 6** | **LIVE PROTOTYPE**: Operational Control Center | Live demonstration screenshot showing Incident Detail, Priority Card, Allocation Explanation, and Map. | 90 sec |
| **Slide 7** | **IMPACT**: Simulated Operational Improvements | In simulation tests, reduced average response time by 31.6% and reduced unassigned critical incidents. | 40 sec |
| **Slide 8** | **FUTURE SCOPE**: Scaling to Smart Cities | Scalability roadmap: integration with municipal CAD APIs, traffic signals, hospital bed tracking, and weather streams. | 25 sec |

---

## 3. Step-by-Step 5-Minute Demo Timeline ("Urban Emergency Surge")

| Time | Action / UI State | Key Highlight to Display |
|---|---|---|
| **00:00** | Open `/control-center` | Control Center Overview, KPI cards, live GIS map showing 15 resources and 10 hospitals across Bangalore. |
| **00:20** | Incident Arrival | New road collision incident (INC-1001) appears in the queue. |
| **00:40** | Incident Analysis | Open Incident Details. Show Priority Score (94/100), Priority Level (CRITICAL), and rule explanation bullets. |
| **01:00** | Allocation Recommendation | Display "WHY THIS RESOURCE?" card for AMB-07 with capability match (ALS), distance (3.2 km), and ETA (6 min). |
| **01:40** | Operator Dispatch | Operator clicks **DISPATCH**. Incident status updates to DISPATCHED; map renders travel route. |
| **02:20** | Secondary Surge & Shortage | Second critical incident (Building Fire INC-1002) arrives while available ambulances are low. |
| **02:40** | Shortage Alert | Alert Toast appears: *"High Priority Fleet Shortage Detected"*. |
| **03:00** | Reallocation Proposal | Reallocation card highlights recommendation to reassign unit AMB-03 with ETA improvement breakdown. |
| **03:20** | Operator Confirmation | Operator clicks **APPROVE REALLOCATION**. System quality score increases. |
| **04:00** | Incident Resolution | Incident status updated to RESOLVED; resource status returns to AVAILABLE. |
| **04:20** | Analytics Review | Navigate to `/analytics`. Show Impact Summary card and Baseline vs. ResQAI comparison table. |
| **05:00** | Demo Completion | Summary screen displaying ResQAI core statement. |
