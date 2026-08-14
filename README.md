# ResQAI — Intelligent Emergency Response & Resource Allocation Platform

> **Core Statement**: *"When multiple emergencies happen simultaneously and resources are limited, ResQAI helps emergency operators prioritize incidents and allocate the most suitable available resources."*

---

## Overview

**ResQAI** is a decision-support command center platform designed for emergency control-room operators. It features deterministic priority intelligence, automated resource suitability scoring, dynamic reallocation conflict detection, real-time GIS mapping, emergency scenario simulation, and empirical analytics.

> [!NOTE]
> **SIMULATION MODE NOTICE**: All emergency data displayed in the default demo setup is simulated for platform evaluation. The system operates on synthetic data and is not connected to live municipal emergency infrastructure.

---

## Core Features

- **Control Center Dashboard**: Central operational overview displaying active incidents, priority alerts, resource availability, active responses, and GIS map.
- **Priority Intelligence Engine**: Deterministic explainable 0–100 priority scoring model based on emergency type, population affected, injury severity, zone risk, and waiting time.
- **Resource Allocation Engine**: Multi-factor suitability scoring considering capability matching, travel distance, estimated response time (ETA), and resource workload.
- **Dynamic Resource Reallocation**: Continuous monitoring of emergency surges and resource bottlenecks; recommends Pareto-efficient resource reassignment when high-priority critical emergencies arise.
- **GIS & Interactive Routing**: OpenStreetMap & OSRM integration for live tracking of ambulances, fire tenders, police units, hospitals, and dispatch routes.
- **Real-time Operator Alerts & Notifications**: Severity-tiered notifications for critical unassigned incidents, fleet status changes, and reallocation opportunities.
- **Emergency Simulation Engine**: Reproducible multi-incident scenarios (e.g. *Urban Emergency Surge*) with pause, step, and reset controls.
- **Analytics & Impact Dashboard**: Empirical metrics measuring response times, fleet utilization, allocation scores, and baseline vs. ResQAI performance comparisons.

---

## Architecture & Technology Stack

```
[ Control Room Operator Interface (React + Tailwind + Leaflet) ]
                             │
                             ▼
     [ Application Layer (Typescript + Hooks + Services) ]
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
[ Intelligence Engine ] [ GIS & Routing ] [ Simulation Engine ]
- Priority Model        - OpenStreetMap   - Event Loop
- Allocation Model      - OSRM Routing    - Isolation Store
- Reallocation Model    - Haversine Calc  - Reproducibility
       └─────────────────────┬─────────────────────┘
                             ▼
               [ Supabase / PostgreSQL Data ]
               - Incidents, Resources, Assignments
               - Realtime Subscriptions & RLS
```

### Technology Justification

- **React 18 & TypeScript**: Responsive, type-safe control room interface with real-time state updates.
- **TailwindCSS & Lucide Icons**: High-contrast, dark-mode operational dashboard layout with clear hierarchy.
- **Leaflet & React-Leaflet**: Lightweight, high-performance GIS mapping engine.
- **Supabase & PostgreSQL**: Structured relational data model with RLS security policies and real-time event streaming.
- **Recharts**: Modular SVG charting library for operational analytics and baseline comparison visuals.
- **Vitest**: Fast, Vite-native testing suite for unit, integration, simulation, and security validation.

---

## Quick Start & Local Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/resqai.git
cd resqai

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
cp .env.example .env

# 4. Start Development Server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Verification & Testing

ResQAI includes a complete test suite covering unit, integration, simulation, analytics, security, and end-to-end workflows:

```bash
# Run all automated tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end workflow validation
npm run test:e2e

# Run TypeScript compilation check
npm run lint

# Production build test
npm run build
```

---

## Project Structure

```
resqai/
├── src/
│   ├── components/       # UI Components (Control Center, Maps, Analytics, Allocation)
│   ├── engines/          # Priority, Allocation & Reallocation Engines
│   ├── hooks/            # Custom React Hooks (useAnalytics, useNotifications, etc.)
│   ├── pages/            # Application Page Views
│   ├── services/         # Data & API Services (incidents, resources, routing)
│   ├── simulation/       # Scenario Generator & Simulation Clock Engine
│   └── types/            # TypeScript Interface Definitions
├── tests/                # Automated Vitest Test Suites
│   ├── unit/             # Engine Unit Tests
│   ├── integration/      # Workflow Integration Tests
│   ├── simulation/       # Scenario & Isolation Tests
│   ├── analytics/        # Calculation & Baseline Tests
│   ├── security/         # Security & RBAC Tests
│   └── e2e/              # End-to-End Workflow Tests
├── supabase/             # PostgreSQL Migrations, RLS Policies & Seed Scripts
└── docs/                 # Hackathon & Technical Documentation
```

---

## License & Disclaimer

ResQAI is created for demonstration and hackathon evaluation. All emergency data shown in demo mode is simulated.
