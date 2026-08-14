# ResQAI Technology Stack & Technical Justification

This document provides a comprehensive technical justification for every key technology chosen for the ResQAI platform.

---

## 1. Frontend Framework & Language

### React 18 & TypeScript
- **Why React 18**: Provides high-performance component rendering with concurrent features, essential for an emergency control room interface that handles live map updates, incoming notifications, and dynamic charts simultaneously.
- **Why TypeScript**: Enforces strict type safety across complex domain models (`Incident`, `Resource`, `Assignment`, `PriorityAnalysis`, `AllocationRecommendation`), preventing runtime crashes (`TypeError`, `UndefinedProp`) during operational use.

---

## 2. Styling & Visual System

### TailwindCSS & Lucide Icons
- **Why TailwindCSS**: Enables rapid creation of a custom, dark-mode high-contrast design system tailored for control room operators (reduces visual fatigue, highlights critical incidents in red/orange without clutter).
- **Why Lucide Icons**: Provides crisp, consistent SVG icons for emergency types (Ambulances, Fire Tenders, Police Units, Hospitals, Alerts).

---

## 3. Mapping & Geographic Information System (GIS)

### Leaflet & OpenStreetMap & OSRM
- **Why Leaflet**: Lightweight, battle-tested open-source GIS library with zero proprietary API key constraints.
- **Why OpenStreetMap**: Provides global, open vector tiles for emergency route rendering.
- **Why OSRM (Open Source Routing Machine)**: Computes accurate driving routes and travel durations (ETAs) over real road networks, with seamless fallback to Haversine calculations when offline.

---

## 4. Persistence & Database

### Supabase & PostgreSQL
- **Why PostgreSQL**: Industrial-grade relational database providing foreign key integrity, spatial indexing, transaction safety, and complex analytical queries.
- **Why Supabase**: Extends PostgreSQL with instant Row Level Security (RLS) policies and WebSockets-based Realtime event channels for live notification broadcasts across control room operator seats.

---

## 5. Analytics & Visualization

### Recharts
- **Why Recharts**: Modular React chart library built on SVG primitives. Used for rendering line charts (response trends), bar charts (resource utilization), pie charts (reallocation outcomes), and baseline comparison visualizers.

---

## 6. Testing & Quality Assurance

### Vitest
- **Why Vitest**: Next-generation Vite-native test runner. Executes TypeScript unit, integration, simulation, analytics, and security test suites in seconds without requiring extra Babel transpilation pipelines.
