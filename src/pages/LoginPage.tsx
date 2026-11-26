import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, User, CheckCircle, ArrowRight, KeyRound, AlertTriangle } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export const LoginPage: React.FC = () => {
  const { signIn, signUp, isSupabaseConnected, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as { from?: string; expired?: boolean } | null) || null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('FIELD_RESPONDER');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    routeState?.expired || sessionExpired ? 'Your session has expired. Please authenticate again.' : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName, 'FIELD_RESPONDER');
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage('Account created with FIELD_RESPONDER access! Sign in after confirming email.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage('Logged in successfully!');
          const redirectTarget = routeState?.from && routeState.from !== '/login' ? routeState.from : '/control-center';
          setTimeout(() => navigate(redirectTarget), 400);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication process failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (selectedRole: UserRole, presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('');
    setRole(selectedRole);
    setErrorMessage(null);
    setSuccessMessage(`Selected ${presetEmail}. Enter account password to authenticate.`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col justify-between font-inter">
      <KineticPageHeader
        title="COMMAND AUTHENTICATION"
        subtitle="SUPABASE AUTH & ROLE-BASED ACCESS CONTROL GATEWAY"
      />

      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-zinc-900/90 border-2 border-white/20 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Top Decorative Strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF4D00] via-cyan-400 to-amber-400" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#FF4D00] text-black flex items-center justify-center font-bold">
              <Shield className="w-6 h-6 fill-black" />
            </div>
            <div>
              <h2 className="font-archivo text-xl font-bold uppercase tracking-tight">
                {isSignUp ? 'Create Operator Account' : 'Portal Login'}
              </h2>
              <p className="font-space text-xs text-zinc-400 uppercase">
                {isSupabaseConnected ? 'Connected to Supabase Auth' : 'Demo Offline Mode Active'}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-space uppercase text-zinc-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Officer Name"
                    className="w-full bg-black/60 border border-zinc-700 focus:border-[#FF4D00] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-space uppercase text-zinc-300 mb-1">Command Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@resqai.gov.in"
                  className="w-full bg-black/60 border border-zinc-700 focus:border-[#FF4D00] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-space uppercase text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-zinc-700 focus:border-[#FF4D00] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-space uppercase text-zinc-300 mb-1">Operational Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-black/60 border border-zinc-700 focus:border-[#FF4D00] rounded px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="FIELD_RESPONDER">FIELD_RESPONDER (Standard Onboarding)</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1 font-space">
                  DISPATCHER and ADMIN privileges can only be assigned by a system ADMIN.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#FF4D00] hover:bg-white text-black font-space font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Authenticate & Enter'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400 font-space">
            <span>{isSignUp ? 'Already registered?' : "Need an account?"}</span>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#FF4D00] hover:underline font-bold"
            >
              {isSignUp ? 'Sign In' : 'Register Here'}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-zinc-950 border border-white/10 p-4 rounded-xl font-space">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase mb-3">
            <KeyRound className="w-4 h-4" /> Role Directory (Password Required)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAccountSelect('ADMIN', 'admin@resqai.gov.in')}
              className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 flex flex-col text-left"
            >
              <span className="font-bold text-red-400">ADMIN</span>
              <span className="text-[9px] text-zinc-500">Governance</span>
            </button>
            <button
              type="button"
              onClick={() => handleAccountSelect('DISPATCHER', 'dispatcher@resqai.gov.in')}
              className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 flex flex-col text-left"
            >
              <span className="font-bold text-cyan-400">DISPATCHER</span>
              <span className="text-[9px] text-zinc-500">Dispatch & Realloc</span>
            </button>
            <button
              type="button"
              onClick={() => handleAccountSelect('FIELD_RESPONDER', 'responder@resqai.gov.in')}
              className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 flex flex-col text-left"
            >
              <span className="font-bold text-emerald-400">FIELD RESPONDER</span>
              <span className="text-[9px] text-zinc-500">Driver Telemetry</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
