import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMapData } from '../hooks/useMapData';
import { useRoute } from '../hooks/useRoute';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { MapLegend } from '../components/map/MapLegend';
import { MapControls } from '../components/map/MapControls';
import { RoutePanel } from '../components/map/RoutePanel';
import { MapFilterDrawer } from '../components/map/MapFilterDrawer';
import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { Hospital } from '../types/hospital';
import { DEFAULT_MAP_FILTERS, MapFilterState } from '../types/map';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, DETAIL_ZOOM } from '../config/map';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const { incidents, resources, hospitals, loading: mapDataLoading, error: mapDataError, refetch } = useMapData();
  const { route, loading: routeLoading, error: routeError, calculateRoute, clearRoute } = useRoute();

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Parse URL search params (e.g. /map?incidentId=xxx or /map?resourceId=yyy)
  useEffect(() => {
    const incId = searchParams.get('incidentId');
    const resId = searchParams.get('resourceId');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (latParam && lngParam) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        setMapZoom(DETAIL_ZOOM);
      }
    }

    if (incId && incidents.length > 0) {
      const foundInc = incidents.find((i) => i.id === incId || i.incidentNumber === incId);
      if (foundInc) {
        setSelectedIncident(foundInc);
        setMapCenter([foundInc.latitude, foundInc.longitude]);
        setMapZoom(DETAIL_ZOOM);
      }
    }

    if (resId && resources.length > 0) {
      const foundRes = resources.find((r) => r.id === resId || r.resourceCode === resId);
      if (foundRes) {
        setSelectedResource(foundRes);
        setMapCenter([foundRes.latitude, foundRes.longitude]);
        setMapZoom(DETAIL_ZOOM);
      }
    }
  }, [searchParams, incidents, resources]);

  const handleCalculateRoute = () => {
    if (selectedResource && selectedIncident) {
      calculateRoute(
        { latitude: selectedResource.latitude, longitude: selectedResource.longitude },
        { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude }
      );
    }
  };

  const handleClearSelections = () => {
    setSelectedIncident(null);
    setSelectedResource(null);
    setSelectedHospital(null);
    clearRoute();
  };

  const handleResetView = () => {
    setMapCenter(DEFAULT_MAP_CENTER);
    setMapZoom(DEFAULT_ZOOM);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-white overflow-hidden font-inter">
      {/* Top Header Bar — Kinetic Orange styled compact bar */}
      <div className="h-14 border-b-2 border-black bg-black px-6 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="font-archivo text-lg text-white tracking-[-0.04em] uppercase leading-none">
              GIS OPERATIONS MAP
            </h1>
            <span className="font-space text-[10px] text-slate-500 uppercase tracking-[-0.02em]">SPATIAL RESPONSE LAYER</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-space text-xs">
          <button
            onClick={refetch}
            className="p-1.5 rounded-full bg-black border-2 border-black text-white hover:bg-[#FF4D00] hover:text-black transition flex items-center gap-1.5 px-3"
            title="Refresh GIS spatial data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${mapDataLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>

          <span className="text-xs font-space font-bold px-3 py-1 rounded-full bg-black border-2 border-black text-white">
            INC: <strong className="text-[#FF4D00]">{incidents.length}</strong> | RES: <strong className="text-emerald-400">{resources.length}</strong> | HOSP: <strong className="text-sky-400">{hospitals.length}</strong>
          </span>
        </div>
      </div>


      {/* Main Map Viewport */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {mapDataError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-950/90 border border-red-500/50 text-red-300 px-4 py-2 text-xs font-space font-bold flex items-center gap-2 shadow-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {mapDataError}
          </div>
        )}

        {/* Floating Controls Top Right */}
        <div className="absolute top-4 right-4 z-[1000]">
          <MapControls
            onResetView={handleResetView}
            onToggleFilters={() => setShowFilterDrawer(!showFilterDrawer)}
            onClearRoute={clearRoute}
            hasRoute={Boolean(route)}
          />
        </div>

        {/* Floating Filter Drawer Top Right */}
        {showFilterDrawer && (
          <div className="absolute top-16 right-4 z-[1000]">
            <MapFilterDrawer
              filters={filters}
              onChange={setFilters}
              onClose={() => setShowFilterDrawer(false)}
            />
          </div>
        )}

        {/* Floating Route Panel Top Left */}
        {(selectedResource || selectedIncident || route) && (
          <div className="absolute top-4 left-4 z-[1000]">
            <RoutePanel
              selectedResource={selectedResource}
              selectedIncident={selectedIncident}
              route={route}
              loading={routeLoading}
              error={routeError}
              onCalculateRoute={handleCalculateRoute}
              onClearRoute={clearRoute}
              onClearSelections={handleClearSelections}
            />
          </div>
        )}

        {/* Floating Legend Bottom Right */}
        <div className="absolute bottom-6 right-4 z-[1000]">
          <MapLegend />
        </div>

        {/* Leaflet Map Component */}
        <EmergencyMap
          incidents={incidents}
          resources={resources}
          hospitals={hospitals}
          filters={filters}
          selectedIncident={selectedIncident}
          selectedResource={selectedResource}
          selectedHospital={selectedHospital}
          route={route}
          center={mapCenter}
          zoom={mapZoom}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setSelectedHospital(null);
          }}
          onSelectResource={(res) => {
            setSelectedResource(res);
            setSelectedHospital(null);
          }}
          onSelectHospital={(hosp) => {
            setSelectedHospital(hosp);
          }}
        />
      </div>
    </div>
  );
}
