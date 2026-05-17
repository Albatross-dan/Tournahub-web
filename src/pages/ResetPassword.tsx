import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session (Supabase handles the hash/token automatically)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired reset link. Please try requesting a new one.');
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Establishing Secure Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.03)_0%,transparent_100%)] pointer-events-none" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
              <img 
                src="/logo.png" 
                alt="TournaHubLogo" 
                className="w-24 h-24 object-contain relative z-10" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
              Reset <span className="text-primary italic">Password</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px]">
              Secure your account with a new password
            </p>
          </div>
        </div>

        <div className="bg-[#050505]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-black">
          {success ? (
            <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                <CheckCircle2 className="w-20 h-20 text-emerald-500" />
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 p-6 rounded-2xl">
                <p className="font-black uppercase tracking-widest italic text-sm">Password Updated</p>
                <p className="text-[10px] opacity-60 mt-2 uppercase tracking-widest">Redirecting to Sign In...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">New Password</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                  <input
                    type="password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white font-medium relative z-10"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                  <input
                    type="password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white font-medium relative z-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold p-4 rounded-xl flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!error}
                className="w-full h-16 bg-primary hover:scale-[1.02] active:scale-95 transition-all rounded-2xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                ) : (
                  <span className="text-black font-black uppercase italic tracking-tighter text-lg">Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>
        
        <div className="mt-12 flex justify-center items-center space-x-3 opacity-20 group">
          <div className="h-px w-8 bg-slate-800" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Secure Protocol v2.5</span>
          <div className="h-px w-8 bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
