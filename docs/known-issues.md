# ResQAI — Known Issues & Architectural Limitations

This document lists non-critical architectural limitations and known technical boundaries of the current prototype.

---

## Low & Medium Priority Architectural Notes

### 1. In-Memory Fallback State (Low)
- **Description**: When Supabase environment variables are missing or unconfigured, ResQAI seamlessly falls back to local in-memory data stores.
- **Impact**: Changes made during a local session without Supabase persist in memory until page reload.
- **Mitigation**: Standard behavior for standalone hackathon prototypes.

### 2. OSRM Public Routing Fallback (Low)
- **Description**: ResQAI queries the public OSRM routing API (`router.project-osrm.org`) for driving routes. If network connectivity drops or the public server throttles requests, the GIS engine automatically falls back to straight-line Haversine distance calculations.
- **Impact**: ETA values revert to speed-based estimations during network outages.
- **Mitigation**: Haversine fallback ensures zero UI crashes or blank screens.

### 3. Baseline Strategy Approximation (Medium)
- **Description**: In the Analytics module, baseline strategy performance is calculated using unaccepted RECOMMENDED assignments as a proxy for raw nearest-unit dispatch.
- **Impact**: Provides a single-run comparison rather than a dual parallel simulation run.
- **Mitigation**: Clearly documented in UI disclaimers and `docs/analytics-definitions.md`.
