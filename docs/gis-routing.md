# GIS & Spatial Routing System Documentation: ResQAI Platform

## 1. Module Overview
The GIS & Routing module provides a real-time spatial operations environment for the ResQAI platform. Built on Leaflet and OpenStreetMap with OSRM (Open Source Routing Machine) integration, it visually displays emergency incidents, response fleet units, and trauma hospitals while enabling dynamic distance and ETA calculations.

This module acts as a spatial data provider for Phase 8 (Resource Allocation Engine) without making dispatch decisions autonomously.

---

## 2. GIS Architecture (`src/components/map/`)

```
src/
├── config/
│   └── map.ts                  (Default center [12.9716, 77.5946], zoom 13, OSM tile URLs, OSRM API endpoint)
├── types/
│   └── map.ts                  (RouteResult contract, MapFilterState, SelectedEntity, Coordinate)
├── services/
│   ├── routing.ts              (OSRM API routing, client-side caching, Haversine fallback)
│   └── geocoding.ts            (Nominatim reverse geocoding with caching)
├── hooks/
│   ├── useMapData.ts           (Fetches incidents, resources, hospitals with Supabase Realtime sync)
│   └── useRoute.ts             (Route calculation state machine: calculateRoute, clearRoute)
├── components/map/
│   ├── EmergencyMap.tsx        (Leaflet MapContainer, TileLayer, MapController for smooth flyTo)
│   ├── MapMarkerUtils.ts       (SVG Leaflet DivIcons preventing broken image assets in Vite)
│   ├── IncidentMarker.tsx      (Severity markers: CRITICAL pulse red, HIGH orange, MEDIUM yellow, LOW green)
│   ├── ResourceMarker.tsx      (Type markers: Ambulance, Fire, Police, Rescue with readiness status colors)
│   ├── HospitalMarker.tsx      (Trauma Center markers with bed and ICU capacity popups)
│   ├── RouteLayer.tsx          (Leaflet Polyline rendering calculated driving routes)
│   ├── MapLegend.tsx           (Collapsible visual legend)
│   ├── MapControls.tsx         (Recenter view, filter drawer toggle, clear route)
│   ├── RoutePanel.tsx          (Pair analysis panel displaying distance in km and ETA in minutes)
│   └── MapFilterDrawer.tsx     (Layer visibility toggles & multi-category checkboxes)
└── pages/
    └── MapPage.tsx             (Route /map full-bleed interactive GIS command dashboard)
```

---

## 3. Spatial Markers & Visual Language

### Incident Markers (`IncidentMarker.tsx`)
- **CRITICAL**: Pulsing red circular SVG marker
- **HIGH**: Orange circular SVG marker
- **MEDIUM**: Yellow circular SVG marker
- **LOW**: Green circular SVG marker
- **Popup**: Incident number, title, priority, casualties affected, injury severity, and "View Incident" link (`/incidents/:id`).

### Resource Markers (`ResourceMarker.tsx`)
- **Icons**: Distinct SVG icons for `AMBULANCE`, `FIRE_UNIT`, `POLICE_UNIT`, `RESCUE_TEAM`.
- **Status Colors**: `AVAILABLE` (Green), `ASSIGNED` (Yellow), `BUSY` (Red), `OFFLINE` (Dark Slate).
- **Popup**: Resource code, unit name, fleet type, capabilities, capacity, and "View Unit" link (`/resources/:id`).

### Hospital Markers (`HospitalMarker.tsx`)
- **Icon**: Blue Trauma Cross SVG badge.
- **Popup**: Hospital name, trauma capabilities, available beds count, ICU capacity, and emergency contact.

---

## 4. OSRM Routing Service & Data Contract (`RouteResult`)

### Interface Contract (`src/types/map.ts`):
```ts
export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // LatLng coordinate tuples for Leaflet Polyline
  provider: 'OSRM' | 'HAVERSINE_ESTIMATE';
  calculatedAt: string;
}
```

### Routing Logic (`src/services/routing.ts`):
1. **API Endpoint**: `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}`
2. **Client-Side Cache**: Caches route results by coordinate string key `lat1,lng1_lat2,lng2`.
3. **Haversine Fallback**: If network requests time out (>5s) or the OSRM service is unavailable, automatically calculates Haversine straight-line distance, estimates travel time (at 35 km/h urban speed), and returns intermediate polyline steps.

---

## 5. Interaction & Navigation Integration
- **Map Selection**: Clicking a Resource marker + Incident marker activates the "Spatial Routing Analysis" panel.
- **URL Deep Linking**:
  - Navigating to `/map?incidentId=:id` auto-centers and opens details for that incident.
  - Navigating to `/map?resourceId=:id` auto-centers and opens details for that resource unit.
- **Details Page Integration**:
  - `/incidents/:id` includes a **"View On GIS Map"** button.
  - `/resources/:id` includes a **"View On Map"** button.

---

## 6. Realtime Synchronization
`useMapData` subscribes to Supabase Realtime publications on:
- `public.incidents`: Automatically updates markers when new emergencies are reported or status changes.
- `public.resources`: Moves resource markers automatically when GPS coordinates are updated in Phase 5.
- `public.hospitals`: Updates bed/ICU counts dynamically.
