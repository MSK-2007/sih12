# ResQAI — Production & Demo Deployment Guide

## 1. Environment Setup & Configuration

Ensure `.env` in the production host contains safe public keys only:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_OSRM_ROUTING_URL=https://router.project-osrm.org
```

> [!IMPORTANT]
> **SECURITY DIRECTIVE**: Never expose `SUPABASE_SERVICE_ROLE_KEY`, database admin passwords, or secret access tokens in client-side environment variables or repository code.

---

## 2. Supabase Database Migration

Apply migrations in chronological order:

```bash
# Apply SQL migrations to production Supabase database
supabase db push
```

Migration files included:
- `001_extensions.sql` to `005_indexes.sql`: Extensions, enums, schema tables, foreign keys, performance indexes.
- `006_rls.sql`: Row Level Security policies for authenticated access.
- `007_realtime.sql`: Supabase realtime publication setup.
- `008_incident_sequence.sql`: Incident number auto-increment sequence.
- `009_notifications.sql`: Notification table and trigger functions.
- `010_simulation.sql`: Simulation run data isolation tables.
- `011_analytics_indexes.sql`: Analytics query performance indexes.

---

## 3. Production Build & Hosting

```bash
# Execute production bundle build
npm run build
```

Distributable files are generated under `dist/`.

### Deployment Host Recommendations
- **Vercel / Netlify**: Deploy root directory; set build command `npm run build` and output directory `dist`. Add single-page app rewrite rule (`/* -> /index.html`).

---

## 4. Post-Deployment Verification Checklist

- [x] Landing & Control Center pages load without JS errors.
- [x] Simulation Mode banner (`⚠ SIMULATION MODE`) visible on top header.
- [x] Authentication & protected routes functioning.
- [x] Interactive map renders vehicle markers and routes.
- [x] Reset Demo function resets simulated state without clearing schema.
- [x] Analytics dashboard displays real calculated KPIs and CSV export works.
