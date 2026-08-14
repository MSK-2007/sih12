import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, BarChart3, Play, Radio, RefreshCw, LayoutDashboard, Bell, Zap } from 'lucide-react';
import { ReallocationMonitor } from './components/reallocation/ReallocationMonitor';
import { ReallocationHistoryPage } from './pages/ReallocationHistoryPage';
import ControlCenterPage from './pages/ControlCenterPage';
import { AlertsHistoryPage } from './pages/AlertsHistoryPage';
import SimulationDashboardPage from './pages/SimulationDashboardPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import { NotificationToast } from './components/notifications/NotificationToast';
import { useNotifications } from './hooks/useNotifications';
import { useNotificationRealtime } from './hooks/useNotificationRealtime';
import { IncidentsPage } from './pages/Incidents';
import { CreateIncidentPage } from './pages/CreateIncident';
import { IncidentDetailsPage } from './pages/IncidentDetailsPage';
import ResourcesPage from './pages/Resources';
import CreateResourcePage from './pages/CreateResource';
import ResourceDetailsPage from './pages/ResourceDetailsPage';
import EditResourcePage from './pages/EditResourcePage';
import MapPage from './pages/MapPage';
import { DemoBanner } from './components/common/DemoBanner';
import KineticLandingPage from './pages/KineticLandingPage';
import DriverPanelPage from './pages/DriverPanelPage';
import { Navigation } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/kinetic', label: 'Kinetic', icon: Zap, color: 'text-[#FF4D00]', exact: true },
  { to: '/control-center', label: 'Control Center', icon: LayoutDashboard, color: 'text-red-400', exact: true },
  { to: '/driver', label: 'Driver Panel', icon: Navigation, color: 'text-amber-500', exact: false },
  { to: '/incidents', label: 'Incidents', icon: Radio, color: 'text-amber-400', exact: false },
  { to: '/resources', label: 'Fleet Pool', icon: Truck, color: 'text-emerald-400', exact: false },
  { to: '/map', label: 'GIS Map', icon: MapPin, color: 'text-cyan-400', exact: false },
  { to: '/alerts', label: 'Alerts', icon: Bell, color: 'text-yellow-400', exact: false },
  { to: '/reallocation', label: 'Reallocation', icon: RefreshCw, color: 'text-purple-400', exact: false },
  { to: '/simulation', label: 'Simulation', icon: Play, color: 'text-slate-400', exact: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, color: 'text-blue-400', exact: false },
];

function NavBar() {
  const location = useLocation();
  return (
    <nav className="hidden lg:flex items-center gap-1.5 bg-black/90 p-1.5 rounded-full border border-white/20">
      {NAV_ITEMS.map(({ to, label, icon: Icon, color, exact }) => {
        const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';
        return (
          <Link
            key={to}
            to={to}
            className={`px-3 py-1 rounded-full font-space text-[11px] uppercase tracking-[ -0.02em ] transition flex items-center gap-1.5 ${
              isActive
                ? 'bg-[#FF4D00] text-black font-bold shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : color}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AppContent() {
  const [activeToast, setActiveToast] = useState<any>(null);
  const { refresh } = useNotifications();
  const location = useLocation();

  const handleNewNotification = (notif: any) => {
    setActiveToast(notif);
    refresh();
  };

  useNotificationRealtime(handleNewNotification);

  // If on landing page (/ or /kinetic), hide the standard app header to display full Kinetic Hero
  const isLanding = location.pathname === '/' || location.pathname === '/kinetic';

  return (
    <div className="kinetic-theme min-h-screen bg-[#000000] text-white flex flex-col font-inter selection:bg-black selection:text-[#FF4D00]">
      {/* Simulation / Demo Mode Banner */}
      <DemoBanner />

      {/* Header Bar — Kinetic Orange Header */}
      {!isLanding && (
        <header className="h-16 border-b-2 border-black bg-black px-6 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#FF4D00] text-black flex items-center justify-center font-archivo text-lg shadow-md">
                <Shield className="w-5 h-5 fill-black text-black" />
              </div>
              <div>
                <span className="font-archivo text-lg text-white tracking-tight uppercase">ResQ<span className="text-[#FF4D00]">AI</span></span>
                <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#FF4D00]/20 text-[#FF4D00] border border-[#FF4D00]/40 font-space font-bold">BRUTALIST OPERATIONAL</span>
              </div>
            </Link>
          </div>

          <NavBar />

          <div className="flex items-center gap-3">
            <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-space uppercase tracking-tight">
              OPERATOR: CONTROL_ROOM
            </span>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        <ReallocationMonitor>
          <Routes>
            <Route path="/" element={<KineticLandingPage />} />
            <Route path="/kinetic" element={<KineticLandingPage />} />
            <Route path="/dashboard" element={<Navigate to="/control-center" replace />} />
            <Route path="/control-center" element={<ControlCenterPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/create" element={<CreateIncidentPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/resources/create" element={<CreateResourcePage />} />
            <Route path="/resources/:id" element={<ResourceDetailsPage />} />
            <Route path="/resources/:id/edit" element={<EditResourcePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/driver" element={<DriverPanelPage />} />
            <Route path="/alerts" element={<AlertsHistoryPage />} />
            <Route path="/reallocation" element={<ReallocationHistoryPage />} />
            <Route path="/simulation" element={<SimulationDashboardPage />} />
            <Route path="/analytics" element={<AnalyticsDashboardPage />} />
            <Route path="*" element={<ControlCenterPage />} />
          </Routes>
        </ReallocationMonitor>
      </main>

      {/* Live Operational Toast Alerts */}
      <NotificationToast notification={activeToast} onDismiss={() => setActiveToast(null)} />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
