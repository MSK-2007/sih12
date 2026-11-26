import React, { useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';
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
  const { user, session, profile, loading, sessionExpired } = useAuth();
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-space text-xs uppercase tracking-widest text-zinc-400">
        Verifying session credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          expired: sessionExpired,
        }}
      />
    );
  }

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

  return children;
};
