import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Trophy, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isTournaHub = window.location.hostname.includes('tournahub.me');
      
      let redirectTo = 'https://tournahub.me/reset-password';
      if (isLocalhost) {
        redirectTo = 'http://localhost:3000/reset-password';
      } else if (!isTournaHub) {
        // Fallback to active origin for AI Studio dev and preview frames
        redirectTo = `${window.location.origin}/reset-password`;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.03)_0%,transparent_100%)] pointer-events-none" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img 
                src="/logo.png" 
                alt="TournaHubLogo" 
                className="w-24 h-24 object-contain relative z-10 grayscale hover:grayscale-0 transition-all duration-500" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
              Forgot <span className="text-primary italic">Password</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px]">
              Request a secure reset link
            </p>
          </div>
        </div>

        <div className="bg-[#050505]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-black">
          {success ? (
            <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 p-6 rounded-2xl">
                <p className="font-bold text-sm leading-relaxed tracking-tight">
                  If an account exists for {email}, a reset link has been sent to your email.
                </p>
              </div>
              <Link 
                to="/login"
                className="w-full flex items-center justify-center bg-white text-black py-4 rounded-2xl text-sm font-black uppercase tracking-widest italic hover:scale-[1.02] transition-transform active:scale-95"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                  <input
                    type="email"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white font-medium relative z-10"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                disabled={loading}
                className="w-full h-16 bg-primary hover:scale-[1.02] active:scale-95 transition-all rounded-2xl flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                ) : (
                  <span className="text-black font-black uppercase italic tracking-tighter text-lg">Request Reset Link</span>
                )}
              </button>

              <Link 
                to="/login"
                className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all pt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </form>
          )}
        </div>
        
        <div className="mt-8 flex justify-center items-center space-x-3 opacity-20 group">
          <div className="h-[1px] w-8 bg-slate-800" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Secure Protocol v2.5</span>
          <div className="h-[1px] w-8 bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
