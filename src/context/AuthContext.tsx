import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  UserRole,
  Permission,
  normalizeUserRole,
  hasPermission as checkRolePermission,
  hasAnyRole,
  validateSelfSignupRole,
} from '../security/rbac';
import { logSecurityAuditEvent } from '../services/auditLogs';

export type { UserRole };

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  sessionExpired: boolean;
  isSupabaseConnected: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: false,
  sessionExpired: false,
  isSupabaseConnected: isSupabaseConfigured,
  signIn: async () => ({ error: new Error('AuthProvider not mounted') }),
  signUp: async () => ({ error: new Error('AuthProvider not mounted') }),
  signOut: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

function isSessionExpired(session: Session | null): boolean {
  if (!session) return false;
  if (!session.expires_at) return false;
  return session.expires_at * 1000 <= Date.now();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const fetchProfile = async (userId: string, userEmail: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, department_id, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        if (data.is_active === false) {
          await supabase.auth.signOut();
          return null;
        }
        const normalizedRole = normalizeUserRole(data.role) || 'FIELD_RESPONDER';
        return {
          id: data.id,
          fullName: data.full_name || userEmail.split('@')[0],
          email: data.email || userEmail,
          role: normalizedRole,
          departmentId: data.department_id,
          isActive: data.is_active ?? true,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('[AuthContext] Error fetching profile:', err);
    }

    // Least-privilege fallback ONLY for an already verified Supabase user whose profile trigger hasn't synced yet
    return {
      id: userId,
      fullName: userEmail.split('@')[0],
      email: userEmail,
      role: 'FIELD_RESPONDER',
      isActive: true,
    };
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      clearAuthState();
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      if (!initialSession || isSessionExpired(initialSession)) {
        if (initialSession) {
          setSessionExpired(true);
          await supabase.auth.signOut().catch(() => {});
          await logSecurityAuditEvent({
            action: 'AUTH_SESSION_EXPIRED',
            entityType: 'auth_session',
            entityId: initialSession.user?.id || 'unknown',
          });
        }
        clearAuthState();
        setLoading(false);
        return;
      }

      setSessionExpired(false);
      setSession(initialSession);
      setUser(initialSession.user);
      const userProfile = await fetchProfile(initialSession.user.id, initialSession.user.email || '');
      if (mounted) {
        if (!userProfile) {
          clearAuthState();
        } else {
          setProfile(userProfile);
        }
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (!nextSession || isSessionExpired(nextSession)) {
        const prevUserId = user?.id || 'unknown';
        clearAuthState();
        if (nextSession && isSessionExpired(nextSession)) {
          setSessionExpired(true);
          await logSecurityAuditEvent({
            action: 'AUTH_SESSION_EXPIRED',
            entityType: 'auth_session',
            entityId: prevUserId,
          });
        }
        setLoading(false);
        return;
      }

      setSessionExpired(false);
      setSession(nextSession);
      setUser(nextSession.user);

      const userProfile = await fetchProfile(nextSession.user.id, nextSession.user.email || '');
      if (mounted) {
        if (!userProfile) {
          clearAuthState();
        } else {
          setProfile(userProfile);
          if (event === 'SIGNED_IN') {
            await logSecurityAuditEvent({
              action: 'AUTH_LOGIN',
              entityType: 'profile',
              entityId: nextSession.user.id,
              newValue: { role: userProfile.role },
              userId: nextSession.user.id,
            });
          }
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase Auth is not configured in this environment.') };
    }
    setSessionExpired(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error && data.user) {
      const fetched = await fetchProfile(data.user.id, data.user.email || email);
      if (!fetched) {
        clearAuthState();
        return { error: new Error('Account is inactive or lacks an active profile.') };
      }
      setSession(data.session);
      setUser(data.user);
      setProfile(fetched);
    }
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    requestedRole: UserRole = 'FIELD_RESPONDER'
  ) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase Auth is not configured in this environment.') };
    }

    // Prevent client-side self-escalation to ADMIN or DISPATCHER
    const roleCheck = validateSelfSignupRole(requestedRole);
    if (!roleCheck.allowed) {
      await logSecurityAuditEvent({
        action: 'ACCESS_DENIED',
        entityType: 'auth_signup',
        entityId: email.trim(),
        newValue: { attemptedRole: requestedRole, reason: roleCheck.error },
      });
      return { error: new Error(roleCheck.error || 'Privileged role cannot be self-assigned.') };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: roleCheck.role,
        },
      },
    });

    if (!error && data.user) {
      await logSecurityAuditEvent({
        action: 'AUTH_SIGNUP',
        entityType: 'profile',
        entityId: data.user.id,
        newValue: { role: roleCheck.role },
        userId: data.user.id,
      });
    }

    return { error };
  };

  const signOut = async () => {
    const previousUserId = user?.id;
    if (isSupabaseConfigured) {
      if (previousUserId) {
        await logSecurityAuditEvent({
          action: 'AUTH_LOGOUT',
          entityType: 'profile',
          entityId: previousUserId,
          userId: previousUserId,
        });
      }
      await supabase.auth.signOut();
    }
    setSessionExpired(false);
    clearAuthState();
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user || !session || !profile || isSessionExpired(session)) return false;
    return hasAnyRole(profile.role, roles);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !session || !profile || isSessionExpired(session)) return false;
    return checkRolePermission(profile.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        sessionExpired,
        isSupabaseConnected: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
