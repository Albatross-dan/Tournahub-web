import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Mail, Lock, Loader2 } from 'lucide-react';
import logoUrl from '@/src/assets/images/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        if (!agreedToTerms || !agreedToPrivacy) {
          throw new Error('Please agree to both the Terms & Conditions and the Privacy Policy by ticking the boxes.');
        }

        // Enforce username requirements
        if (!username || username.length < 3) {
          throw new Error('Tournaments username must be at least 3 characters long');
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Tournaments username can only contain letters, numbers, and underscores');
        }

        // Check uniqueness before signing up (quick pre-check)
        const { data: existing, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) console.error('Username check error:', checkError);
        if (existing) {
          throw new Error('Tournaments username is already taken. Try another one, champion.');
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.05)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img 
                src={logoUrl} 
                alt="TournaHubLogo" 
                className="w-32 h-32 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic text-text-main tracking-tight uppercase">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </h1>
            <p className="text-text-muted font-bold uppercase tracking-[0.2em] text-[10px]">
              {isSignUp ? 'Create your professional account' : 'Welcome back to the Arena'}
            </p>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-2xl border border-border-main rounded-[2.5rem] p-8 shadow-2xl shadow-black/20">
          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Tournaments username</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <span className="text-primary font-black italic text-lg leading-none">@</span>
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                    placeholder="Enter your Tournaments username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                <input
                  type="email"
                  required
                  className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[9px] uppercase font-black tracking-widest text-text-muted hover:text-primary transition-colors relative z-20"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                <input
                  type="password"
                  required
                  className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-3 px-1">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-4 w-4 bg-background/40 border border-border-main rounded text-primary focus:ring-1 focus:ring-primary/50 accent-primary cursor-pointer relative z-20"
                  />
                  <label htmlFor="agree-terms" className="text-[10px] font-black text-text-muted hover:text-text-main uppercase tracking-wider leading-none cursor-pointer select-none relative z-20">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-primary hover:underline italic font-black cursor-pointer"
                    >
                      Terms & Conditions
                    </Link>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="agree-privacy"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="h-4 w-4 bg-background/40 border border-border-main rounded text-primary focus:ring-1 focus:ring-primary/50 accent-primary cursor-pointer relative z-20"
                  />
                  <label htmlFor="agree-privacy" className="text-[10px] font-black text-text-muted hover:text-text-main uppercase tracking-wider leading-none cursor-pointer select-none relative z-20">
                    I agree to the{" "}
                    <Link
                      to="/privacy-policy"
                      className="text-primary hover:underline italic font-black cursor-pointer"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold p-4 rounded-xl flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 bg-primary transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative h-16 flex items-center justify-center space-x-3">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
                ) : (
                  <span className="text-slate-900 text-xl font-black italic uppercase tracking-tighter">
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border-main space-y-6">
            <button 
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                setSuccess(null);
                try {
                  if (isSignUp) {
                    if (!agreedToTerms || !agreedToPrivacy) {
                      throw new Error('Please agree to both the Terms & Conditions and the Privacy Policy by ticking the boxes.');
                    }

                    // Enforce username requirements
                    if (!username || username.length < 3) {
                      throw new Error('Please enter a Tournaments username (at least 3 characters) above first to sign up with Google.');
                    }

                    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                      throw new Error('Tournaments username can only contain letters, numbers, and underscores.');
                    }

                    // Check uniqueness
                    const { data: existing, error: checkError } = await (supabase as any)
                      .from('profiles')
                      .select('username')
                      .eq('username', username)
                      .maybeSingle();

                    if (checkError) {
                      console.error('Username check error:', checkError);
                    }
                    if (existing) {
                      throw new Error('This Tournaments username is already taken. Try another one, champion.');
                    }

                    // Save username to local storage so AuthContext can pick it up on redirect back
                    localStorage.setItem('pending_oauth_username', username);
                  }

                  const { data, error } = await supabase.auth.signInWithOAuth({ 
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin,
                      skipBrowserRedirect: false
                    }
                  });
                  
                  if (error) {
                    throw error;
                  }
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full flex items-center justify-center space-x-4 bg-surface hover:bg-surface-hover border border-border-main py-4 rounded-2xl transition-all"
            >
              <div className="bg-white p-1 rounded-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
                  <path fill="#34A853" d="M16.04 18.013c-1.09.693-2.447 1.096-4.04 1.096-3.13 0-5.783-2.115-6.734-4.89l-4.026 3.15C3.198 21.341 7.27 24 12 24c3.055 0 5.864-1.012 7.82-2.823l-3.78-3.164z"/>
                  <path fill="#4285F4" d="M19.82 21.177l3.78 3.164c2.502-2.31 4.4-6.07 4.4-11.841 0-.82-.07-1.611-.194-2.373H12v4.544h7.524c-.328 1.674-1.272 3.092-2.617 4.026l3.78 3.164z"/>
                  <path fill="#FBBC05" d="M5.266 14.235L1.24 17.385C.454 15.795 0 13.978 0 12c0-1.978.454-3.795 1.24-5.385l4.026 3.115C5.084 10.556 5 11.265 5 12c0 .735.084 1.444.266 2.235z"/>
                </svg>
              </div>
              <span className="text-xs font-black text-text-main uppercase tracking-widest italic">Continue with Google</span>
            </button>

            <div className="text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[11px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-8 decoration-border-main hover:decoration-primary/30"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center flex items-center justify-center space-x-3 opacity-30 group cursor-help hover:opacity-100 transition-opacity">
          <div className="h-px w-8 bg-border-main" />
          <span className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted">Encrypted Uplink Established</span>
          <div className="h-px w-8 bg-border-main" />
        </div>

        <div className="mt-6 text-center flex items-center justify-center space-x-4">
          <Link
            to="/terms"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
          >
            Terms & Conditions
          </Link>
          <span className="text-border-main text-xs font-black">•</span>
          <Link
            to="/privacy-policy"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
