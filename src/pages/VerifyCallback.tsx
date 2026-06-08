import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, CheckCircle, AlertCircle, Loader2, ArrowRight, RefreshCw, Mail } from 'lucide-react';

const logoUrl = '/android-chrome-512x512.png';

export default function VerifyCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuth } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorTitle, setErrorTitle] = useState('Verification Hook Falter');
  const [errorDesc, setErrorDesc] = useState('Decoding confirmation token failed.');
  const [savedEmail, setSavedEmail] = useState('');
  
  // Resend state variables in case link is expired
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    // Collect email stored locally during initial registration
    const emailStored = localStorage.getItem('pending_signup_email') || '';
    if (emailStored) {
      setSavedEmail(emailStored);
    }

    const checkVerification = async () => {
      try {
        // 1. Analyze URL for parameters indicating error
        // Supabase often appends error parameters directly inside the query or hash string (e.g. link expired)
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const combined = search + '&' + hash.replace('#', '');
        
        const params = new URLSearchParams(combined);
        const errType = params.get('error') || params.get('error_code');
        const errDesc = params.get('error_description');

        if (errType || errDesc) {
          console.warn('[VerifyCallback] Error parameters found in URL:', { errType, errDesc });
          setStatus('error');
          setErrorTitle(errType === 'access_denied' ? 'Verification Link Expired' : 'Invalid Verification Link');
          setErrorDesc(
            errDesc?.replace(/\+/g, ' ') || 
            'This verification key is either invalid, malformed, or has already been used. Please request a new confirmation link.'
          );
          return;
        }

        // 2. Wait up to 3 seconds for Supabase client to parse URL and active session
        // If query parameters had 'code', Supabase handles exchange in background.
        let session = null;
        for (let i = 0; i < 6; i++) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[VerifyCallback] Error getting session on retry:', error);
          }
          if (data?.session) {
            session = data.session;
            break;
          }
          // Brief pause before trying again to allow PKCE exchange to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (session?.user) {
          console.log('[VerifyCallback] Resolved active user confirmed session:', session.user);
          
          // Clear temporary signup email
          localStorage.removeItem('pending_signup_email');

          // Trigger state refreshment inside AuthContext
          await refreshAuth();
          
          setStatus('success');
        } else {
          // If no session resides, check if we has any authenticated user immediately
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('[VerifyCallback] Authenticated user retrieved:', user);
            localStorage.removeItem('pending_signup_email');
            await refreshAuth();
            setStatus('success');
          } else {
            console.warn('[VerifyCallback] No authenticated user or session detected after waiting.');
            setStatus('error');
            setErrorTitle('No Session Resides');
            setErrorDesc('We could not verify your session. This might happen if your browser is blocking cookies or third-party states.');
          }
        }
      } catch (err: any) {
        console.error('[VerifyCallback] Exception during verification hook parsing:', err);
        setStatus('error');
        setErrorDesc(err.message || 'An expected security check failure occurred.');
      }
    };

    checkVerification();
  }, [navigate, searchParams, refreshAuth]);

  // Handler for resending the link from inside the callback
  const handleResend = async () => {
    if (!savedEmail) {
      setResendError('We could not find your registration email. Please return to the Sign In page.');
      return;
    }

    setResending(true);
    setResendStatus(null);
    setResendError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: savedEmail,
        options: {
          emailRedirectTo: window.location.origin + '/verify-callback',
        },
      });

      if (error) throw error;
      setResendStatus('A brand new verification link has been successfully sent to ' + savedEmail + '!');
    } catch (err: any) {
      console.error('[VerifyCallback] Resend from callback failed:', err);
      setResendError(err.message || 'Resending failed. Try typing your email in the Login screen.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blur Ambient Backdrops */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Logo Branding Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <img 
              src={logoUrl} 
              alt="TournaHub Logo" 
              className="w-20 h-20 object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black italic text-white tracking-tight uppercase">
              Email <span className="text-primary italic">Verification</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.25em] text-[9px]">
              Credential Exchange Gateway
            </p>
          </div>
        </div>

        {/* Dynamic State Layout Card */}
        <div className="bg-[#050505]/85 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          
          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="flex flex-col items-center text-center space-y-6 py-6 animate-pulse">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-white italic">
                  AUTHORIZING CREDENTIALS...
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed uppercase tracking-wider">
                  Establishing secure tunnel with Supabase authenticators. Hold on, fighter.
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
                <div className="relative w-16 h-16 rounded-full bg-emerald-950/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-9 h-9" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black italic uppercase text-white tracking-tight">
                  VERIFICATION SUCCESSFUL!
                </h3>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  Account Verified & Active
                </p>
                <p className="text-xs text-slate-300 font-medium leading-relaxed pt-2">
                  Congratulations! Your email address has been successfully verified. You are now fully certified to enter tournaments, challenge champions, and request prize distributions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full relative group overflow-hidden rounded-2xl h-14 flex items-center justify-center bg-primary active:scale-95 transition-all duration-200 mt-4 cursor-pointer"
              >
                <span className="relative z-10 text-black text-sm font-black uppercase italic tracking-widest flex items-center gap-1.5">
                  Enter the Arena
                  <ArrowRight className="w-4 h-4 text-black font-black" />
                </span>
              </button>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full" />
                <div className="relative w-16 h-16 rounded-full bg-red-950/20 border border-red-500/35 flex items-center justify-center text-red-500">
                  <AlertCircle className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black italic uppercase text-white tracking-tight leading-none">
                  {errorTitle}
                </h3>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mt-1">
                  Access Failed
                </p>
                <p className="text-xs text-slate-400 font-medium leading-relaxed pt-2">
                  {errorDesc}
                </p>
              </div>

              {/* Expired Action Recovery (Resend box) */}
              {savedEmail ? (
                <div className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 text-left space-y-3 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-primary" /> Active Recovery Action
                  </span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    We can immediately trigger a fresh validation link for your recorded email:
                    <strong className="block text-primary break-all mt-1 font-mono font-extrabold text-[10px]">{savedEmail}</strong>
                  </p>
                  
                  {resendStatus && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold py-2 px-3 rounded-lg text-left">
                      {resendStatus}
                    </div>
                  )}

                  {resendError && (
                    <div className="bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] font-bold py-2 px-3 rounded-lg text-left">
                      {resendError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full bg-[#111218] border border-white/5 hover:border-white/10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      {resending ? (
                        <>Delivering... <Loader2 className="w-3 h-3 animate-spin text-primary" /></>
                      ) : (
                        <>Fire Fresh Link <RefreshCw className="w-3 h-3 text-primary" /></>
                      )}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 text-center mt-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Login or registration email is not cached. Please return to the standard gate to sign in or retry.
                  </p>
                </div>
              )}

              <div className="w-full pt-2">
                <Link 
                  to="/login"
                  className="w-full flex items-center justify-center bg-[#111218] hover:bg-[#191b24] text-slate-300 border border-white/5 rounded-2xl py-3.5 text-xs font-black uppercase italic tracking-widest transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Footer info lock mark */}
        <div className="mt-8 flex justify-center items-center space-x-3 opacity-20">
          <div className="h-[1px] w-8 bg-slate-800" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Secure Protocol v2.5</span>
          <div className="h-[1px] w-8 bg-slate-800" />
        </div>

      </div>
    </div>
  );
}
