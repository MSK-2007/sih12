import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export type UserRole = 'ADMIN' | 'CONTROL_ROOM_OPERATOR' | 'DISPATCHER' | 'FIELD_RESPONDER';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConnected: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const DEFAULT_DEMO_PROFILE: UserProfile = {
  id: 'demo-operator-123',
  fullName: 'Command Operator',
  email: 'operator@resqai.gov.in',
  role: 'CONTROL_ROOM_OPERATOR',
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: DEFAULT_DEMO_PROFILE,
  session: null,
  loading: false,
  isSupabaseConnected: isSupabaseConfigured,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  hasRole: () => true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(DEFAULT_DEMO_PROFILE);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string, userEmail: string): Promise<UserProfile> => {
    if (!isSupabaseConfigured) return DEFAULT_DEMO_PROFILE;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          fullName: data.full_name || userEmail.split('@')[0],
          email: data.email || userEmail,
          role: (data.role as UserRole) || 'CONTROL_ROOM_OPERATOR',
          departmentId: data.department_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('[AuthContext] Error fetching profile:', err);
    }

    return {
      id: userId,
      fullName: userEmail.split('@')[0],
      email: userEmail,
      role: 'CONTROL_ROOM_OPERATOR',
    };
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '').then(setProfile);
      } else {
        setProfile(DEFAULT_DEMO_PROFILE);
      }
      setLoading(false);
    });

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id, session.user.email || '');
        setProfile(userProfile);
      } else {
        setProfile(DEFAULT_DEMO_PROFILE);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'CONTROL_ROOM_OPERATOR') => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(DEFAULT_DEMO_PROFILE);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isSupabaseConnected: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
