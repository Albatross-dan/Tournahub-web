import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        // Enforce username requirements
        if (!username || username.length < 3) {
          throw new Error('Username must be at least 3 characters long');
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }

        // Check uniqueness before signing up (quick pre-check)
        const { data: existing, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) console.error('Username check error:', checkError);
        if (existing) {
          throw new Error('Username is already taken. Try another one, champion.');
        }

        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: username,
              role: 'user'
            }
          }
        });
        if (error) throw error;
        
        if (data.user && data.session) {
          // Auto-logged in
          navigate('/dashboard');
        } else {
          setSuccess('Check your email for a verification link!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/20 p-3 rounded-2xl">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">TournaHub</h1>
          <p className="text-slate-400">
            {isSignUp ? 'Create your player account' : 'Welcome back, champion'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-widest text-[10px]">Battle Name (Username)</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 h-5 w-5 flex items-center justify-center">
                  <span className="text-primary font-black italic">@</span>
                </div>
                <input
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="TheDragon_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                />
              </div>
              <p className="text-[9px] text-slate-500 italic mt-1 uppercase tracking-tight">This will be your ONLY public identity across the platform.</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-widest text-[10px]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                className="input-field pl-10"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                className="input-field pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-4 text-lg font-black italic uppercase tracking-tighter rounded-2xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{isSignUp ? 'Initialize Profile' : 'Enter Arena'}</span>
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-background px-4 text-slate-500 italic">Secure Uplink</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord' })}
            className="flex items-center justify-center space-x-2 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 py-3 rounded-xl transition-all group"
          >
            <div className="bg-[#5865F2] p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Discord</span>
          </button>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-all group"
          >
            <div className="bg-white p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/><path fill="#34A853" d="M16.04 18.013c-1.09.693-2.447 1.096-4.04 1.096-3.13 0-5.783-2.115-6.734-4.89l-4.026 3.15C3.198 21.341 7.27 24 12 24c3.055 0 5.864-1.012 7.82-2.823l-3.78-3.164z"/><path fill="#4285F4" d="M19.82 21.177l3.78 3.164c2.502-2.31 4.4-6.07 4.4-11.841 0-.82-.07-1.611-.194-2.373H12v4.544h7.524c-.328 1.674-1.272 3.092-2.617 4.026l3.78 3.164z"/><path fill="#FBBC05" d="M5.266 14.235L1.24 17.385C.454 15.795 0 13.978 0 12c0-1.978.454-3.795 1.24-5.385l4.026 3.115C5.084 10.556 5 11.265 5 12c0 .735.084 1.444.266 2.235z"/></svg>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Google</span>
          </button>
        </div>

        <div className="text-center space-y-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
          
          <div className="pt-4">
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="text-[10px] text-slate-500 hover:text-slate-400 uppercase tracking-widest font-bold"
            >
              Stuck? Clear Cache & Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
