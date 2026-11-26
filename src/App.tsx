import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, BarChart3, Play, Radio, RefreshCw, LayoutDashboard, Bell, Zap, LogIn, LogOut, UserCheck, Activity, Bot } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { canAccessRoute } from './security/rbac';
import { OperationalLocationProvider } from './context/OperationalLocationContext';
import { ReallocationMonitor } from './components/reallocation/ReallocationMonitor';
import { ReallocationHistoryPage } from './pages/ReallocationHistoryPage';
import ControlCenterPage from './pages/ControlCenterPage';
import { AlertsHistoryPage } from './pages/AlertsHistoryPage';
import SimulationDashboardPage from './pages/SimulationDashboardPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import SystemHealthPage from './pages/SystemHealthPage';
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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LiveStatusBadge } from './components/common/LiveStatusBadge';
import { LocationSelector } from './components/common/LocationSelector';
import { AiAssistantPanel } from './components/common/AiAssistantPanel';
import { useLiveStatus } from './hooks/useLiveStatus';
import KineticLandingPage from './pages/KineticLandingPage';
import DriverPanelPage from './pages/DriverPanelPage';
import { LoginPage } from './pages/LoginPage';
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
  { to: '/system-health', label: 'Health', icon: Activity, color: 'text-teal-400', exact: false },
];

function NavBar() {
  const location = useLocation();
  const { profile } = useAuth();
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.to === '/kinetic' || (profile && canAccessRoute(profile.role, item.to))
  );

  return (
    <nav className="flex items-center gap-1 bg-black/90 p-1.5 rounded-full border border-white/20 overflow-x-auto max-w-full custom-scrollbar">
      {visibleItems.map(({ to, label, icon: Icon, color, exact }) => {
        const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';
        return (
          <Link
            key={to}
            to={to}
            className={`px-2.5 py-1 rounded-full font-space text-[11px] uppercase tracking-[-0.02em] transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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

function UserHeaderControls() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/driver"
        className="text-[11px] px-3 py-1.5 rounded-full bg-[#FF4D00] text-black hover:bg-white font-space font-bold uppercase transition flex items-center gap-1.5 shadow-md"
      >
        <Navigation className="w-3.5 h-3.5" />
        DRIVER
      </Link>
      
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full font-space text-[11px]">
        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-amber-400">{profile ? profile.role : 'GUEST'}</span>
      </div>

      {user ? (
        <button
          onClick={() => signOut()}
          title="Sign Out"
          className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-black border border-red-500/40 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      ) : (
        <Link
          to="/login"
          title="Login"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-500 text-black hover:bg-white font-space font-bold text-[11px] uppercase transition shadow-md"
        >
          <LogIn className="w-3 h-3" /> LOGIN
        </Link>
      )}
    </div>
  );
}

function AppContent() {
  const [activeToast, setActiveToast] = useState<any>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const { user, session, profile, hasPermission } = useAuth();
  const isAuthenticated = Boolean(user && session && profile);
  const canUseAiAssistant = isAuthenticated && hasPermission('AI_ASSISTANT_USE');
  const { refresh } = useNotifications(undefined, isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();
  const { health, getProviderByKey } = useLiveStatus(isAuthenticated);

  const handleNewNotification = (notif: any) => {
    if (!isAuthenticated) return;
    setActiveToast(notif);
    refresh();
  };

  useNotificationRealtime(handleNewNotification, isAuthenticated);
  const geminiProvider = getProviderByKey('gemini');

  const isLanding = location.pathname === '/' || location.pathname === '/kinetic' || location.pathname === '/login';

  return (
    <div className="kinetic-theme min-h-screen bg-[#000000] text-white flex flex-col font-inter selection:bg-black selection:text-[#FF4D00]">
      {/* Simulation / Demo Mode Banner */}
      <DemoBanner />

      {/* Header Bar — Kinetic Orange Header */}
      {!isLanding && (
        <header className="h-auto min-h-16 py-2 border-b-2 border-black bg-black px-4 md:px-6 flex flex-col lg:flex-row items-center justify-between gap-3 sticky top-0 z-50 shadow-2xl">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#FF4D00] text-black flex items-center justify-center font-archivo text-lg shadow-md">
                <Shield className="w-5 h-5 fill-black text-black" />
              </div>
              <div>
                <span className="font-archivo text-lg text-white tracking-tight uppercase">ResQ<span className="text-[#FF4D00]">AI</span></span>
                <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#FF4D00]/20 text-[#FF4D00] border border-[#FF4D00]/40 font-space font-bold">BRUTALIST OPERATIONAL</span>
              </div>
            </Link>

            <Link
              to="/driver"
              className="lg:hidden px-3 py-1 bg-[#FF4D00] text-black rounded-full font-space text-xs font-bold flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" /> DRIVER
            </Link>
          </div>

          <NavBar />

          <div className="hidden lg:flex items-center gap-3">
            <LiveStatusBadge
              overallStatus={health.overallStatus}
              geminiOnline={geminiProvider?.status === 'ONLINE'}
              onClick={() => navigate('/system-health')}
            />
            <LocationSelector />
            {canUseAiAssistant && (
              <button
                onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition ${
                  isAiAssistantOpen
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                    : 'bg-white/5 border-white/15 text-slate-400 hover:text-purple-400 hover:border-purple-500/30'
                }`}
                title="AI Assistant"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="font-space text-[10px] font-bold uppercase">AI</span>
              </button>
            )}
            <UserHeaderControls />
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        <ReallocationMonitor>
          <Routes>
            <Route path="/" element={<KineticLandingPage />} />
            <Route path="/kinetic" element={<KineticLandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><Navigate to="/control-center" replace /></ProtectedRoute>} />
            <Route path="/control-center" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ControlCenterPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']}><IncidentsPage /></ProtectedRoute>} />
            <Route path="/incidents/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><CreateIncidentPage /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']}><IncidentDetailsPage /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ResourcesPage /></ProtectedRoute>} />
            <Route path="/resources/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><CreateResourcePage /></ProtectedRoute>} />
            <Route path="/resources/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ResourceDetailsPage /></ProtectedRoute>} />
            <Route path="/resources/:id/edit" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><EditResourcePage /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']}><MapPage /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']}><DriverPanelPage /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER']}><AlertsHistoryPage /></ProtectedRoute>} />
            <Route path="/reallocation" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ReallocationHistoryPage /></ProtectedRoute>} />
            <Route path="/simulation" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><SimulationDashboardPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><AnalyticsDashboardPage /></ProtectedRoute>} />
            <Route path="/system-health" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><SystemHealthPage /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ControlCenterPage /></ProtectedRoute>} />
          </Routes>
        </ReallocationMonitor>
      </main>

      {/* Live Operational Toast Alerts */}
      {isAuthenticated && <NotificationToast notification={activeToast} onDismiss={() => setActiveToast(null)} />}

      {/* Gemini AI Conversational Assistant */}
      {canUseAiAssistant && <AiAssistantPanel isOpen={isAiAssistantOpen} onClose={() => setIsAiAssistantOpen(false)} />}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <OperationalLocationProvider>
            <AppContent />
          </OperationalLocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

