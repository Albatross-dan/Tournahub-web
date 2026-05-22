import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Lock, Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const parseUrlAndCheckSession = async () => {
      setError(null);
      setIsLinkExpired(false);
      
      // 1. Check for errors in the hash or query string first
      // Supabase appends error query parameters to the redirect URL if the link is invalid or expired
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const params = new URLSearchParams(hash.replace('#', '?') || search);
      
      const errorMsg = params.get('error_description') || params.get('error');
      
      if (errorMsg) {
        setError(`Recovery Link Error: ${decodeURIComponent(errorMsg).replace(/\+/g, ' ')}`);
        setIsLinkExpired(true);
        setCheckingSession(false);
        return;
      }

      // 2. Check for active recovery session
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message);
          setIsLinkExpired(true);
        } else if (!session) {
          setError('Invalid, missing, or expired reset link. Please try requesting a new password reset.');
          setIsLinkExpired(true);
        } else {
          console.log('[ResetPassword] Verified active session for password change:', session.user?.email);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while establishing your session.');
        setIsLinkExpired(true);
      } finally {
        setCheckingSession(false);
      }
    };

    parseUrlAndCheckSession();
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
      
      <div className="max-w-md w-full relative z-10 animate-in fade-in duration-500">
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center group animate-bounce duration-1000">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse" />
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
            <div className="space-y-8 text-center animate-in scale-in duration-500">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-ping" />
                  <CheckCircle2 className="w-20 h-20 text-emerald-500 relative z-10" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 p-6 rounded-2xl">
                  <p className="font-black uppercase tracking-widest italic text-sm">Password Updated Successfully</p>
                  <p className="text-[10px] opacity-60 mt-2 uppercase tracking-widest">Your account credentials have been synchronized.</p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="font-black uppercase tracking-wider text-[10px]">Steering you to Sign In...</span>
                </div>
              </div>
            </div>
          ) : isLinkExpired ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-white font-black uppercase italic tracking-tight text-lg">Reset Link Expired</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  For security reasons, recovery links are short-lived. This link either has expired, was already used, or is invalid.
                </p>
                {error && (
                  <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] font-mono p-4 rounded-xl mt-2 text-left break-all">
                    {error}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full h-14 bg-primary hover:scale-[1.02] active:scale-95 transition-all rounded-2xl flex items-center justify-center space-x-2"
              >
                <span className="text-black font-black uppercase italic tracking-tighter text-sm">Request New Link</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">New Password</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white font-medium relative z-10"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-20"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white font-medium relative z-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-20"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold p-4 rounded-xl flex items-center space-x-3 animate-shake">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
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
