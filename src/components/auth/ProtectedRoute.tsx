import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Lock, AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, hasAnyRole } from '../../security/rbac';
import { logSecurityAuditEvent } from '../../services/auditLogs';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: readonly UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'],
}) => {
  const { user, session, profile, loading, sessionExpired, profileError, authError } = useAuth();
  const location = useLocation();

  const isAuthenticated = Boolean(user && session && profile);
  const isAuthorized = isAuthenticated && hasAnyRole(profile?.role, allowedRoles);

  useEffect(() => {
    if (!loading && isAuthenticated && !isAuthorized && profile) {
      void logSecurityAuditEvent({
        action: 'ACCESS_DENIED',
        entityType: 'route',
        entityId: location.pathname,
        newValue: {
          role: profile.role,
          requiredRoles: allowedRoles,
        },
        userId: profile.id,
      });
    }
  }, [loading, isAuthenticated, isAuthorized, profile, location.pathname, allowedRoles]);

  // State 1: Verification in progress
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 font-space text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF4D00] border-t-transparent animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="font-archivo text-sm uppercase text-white tracking-wider">
            Verifying Session Credentials...
          </h3>
          <p className="text-xs text-zinc-400">
            Authenticating operator session with Supabase backend
          </p>
        </div>
      </div>
    );
  }

  // State 2: Profile synchronization failure for an authenticated Auth user
  if (user && session && !profile && profileError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 font-space">
        <div className="max-w-md w-full bg-zinc-950 border-2 border-red-500/40 rounded-xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-archivo text-lg uppercase text-white">Profile Synchronization Failure</h2>
          <p className="text-xs text-zinc-400 font-inter">
            {profileError || 'Unable to retrieve operator profile permissions from backend.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-[#FF4D00] text-black font-bold text-xs uppercase hover:bg-white transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
            </button>
            <Link
              to="/login"
              className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs uppercase hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              Re-authenticate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Unauthenticated / Session Expired
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 font-space">
        <div className="max-w-md w-full bg-zinc-950 border-2 border-[#FF4D00]/50 rounded-xl p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF4D00]" />

          <div className="w-14 h-14 mx-auto rounded-full bg-[#FF4D00]/20 text-[#FF4D00] flex items-center justify-center border border-[#FF4D00]/40">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="font-archivo text-xl uppercase text-white tracking-tight">
              Command Authentication Required
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              You must be signed in to access <span className="text-white font-mono">{location.pathname}</span>.
            </p>
          </div>

          {(sessionExpired || authError) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-xs font-mono flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError || 'Your operational session has expired. Please authenticate again.'}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/login"
              state={{ from: location.pathname, expired: sessionExpired }}
              className="px-6 py-2.5 rounded bg-[#FF4D00] text-black font-bold text-xs uppercase hover:bg-white transition flex items-center justify-center gap-2 shadow-lg"
            >
              <LogIn className="w-4 h-4" /> Enter Command Login
            </Link>
            <Link
              to="/"
              className="px-4 py-2.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs uppercase hover:bg-zinc-800 transition flex items-center justify-center gap-2"
            >
              Public Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Role-Based Access Restriction
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-950 border-2 border-red-500/40 rounded-xl p-6 text-center space-y-4 font-space">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-archivo text-lg uppercase text-white">Access Restricted</h2>
          <p className="text-xs text-zinc-400">
            Role <span className="text-amber-400 font-bold">{profile?.role}</span> does not have permission to access{' '}
            <span className="text-white">{location.pathname}</span>.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to={profile?.role === 'FIELD_RESPONDER' ? '/driver' : '/control-center'}
              className="px-4 py-2 rounded bg-[#FF4D00] text-black font-bold text-xs uppercase hover:bg-white transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Return to Permitted Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 5: Authenticated and Authorized
  return children;
};
