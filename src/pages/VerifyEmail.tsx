import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Loader2, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const logoUrl = '/android-chrome-512x512.png';

export default function VerifyEmail() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Try to retrieve email and username from state, then query params, with safe fallbacks
  const stateEmail = location.state?.email || '';
  const queryEmail = searchParams.get('email') || '';
  const email = (stateEmail || queryEmail).trim();

  const isFromLogin = searchParams.get('fromLogin') === 'true' || location.state?.fromLogin;

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Manage resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown(cooldown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setResendError('We could not identify your email address. Please return to standard Login to retry.');
      return;
    }

    if (cooldown > 0) return;

    setResending(true);
    setResendSuccess(null);
    setResendError(null);

    try {
      // Direct email confirmation redirect back to verify-callback where their transition is processed
      const emailRedirectTo = `${window.location.origin}/verify-callback`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;

      setResendSuccess('A new verification link has been successfully dispatched to your email address!');
      setCooldown(60); // 60s security cooldown
    } catch (err: any) {
      console.error('Failed to resend verification:', err);
      setResendError(err.message || 'We could not dispatch the link. Feel free to contact support.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Ambient Blur Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none opacity-30" />

      <div className="max-w-md w-full relative z-10 transition-all duration-300">
        
        {/* Top Branding Section */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src={logoUrl} 
                alt="TournaHub Logo" 
                className="w-20 h-20 object-contain relative z-10 hover:scale-105 transition-all duration-500" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black italic text-white tracking-tight uppercase">
              {isFromLogin ? 'Verify Your ' : 'Account '}
              <span className="text-primary italic">{isFromLogin ? 'Credentials' : 'Created!'}</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.25em] text-[9px]">
              {isFromLogin ? 'Action Required to Activate' : 'Secure Verification Protocol'}
            </p>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-[#050505]/85 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center text-center space-y-6">
            
            {/* Visual Header Indicator */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative w-16 h-16 rounded-full bg-[#0a0a0c] border border-white/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>

            {/* Instruction Details */}
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold italic uppercase text-[#f3f4f6] tracking-tight">
                CHECK YOUR EMAIL INBOX
              </h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                We've sent a secure connection link to your email address:
                {email ? (
                  <span className="block mt-1 px-3 py-1.5 bg-[#0e0f11] text-primary select-all font-mono font-bold text-[11px] rounded-xl border border-white/5 break-all">
                    {email}
                  </span>
                ) : (
                  <span className="block mt-1 italic text-slate-500 font-bold">your registration email address</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                To active your Tournahub membership and join esports tournaments, please click the confirmation link inside the email.
              </p>
            </div>

            {/* Notification/Help Box */}
            <div className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 text-left space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Can't find the email?</span>
              <ul className="text-[10px] text-slate-400 font-medium space-y-1 justify-center list-disc list-inside">
                <li>Check your <strong className="text-slate-300">Spam or Promotions</strong> folders</li>
                <li>Verify your registration spelling matches exactly</li>
                <li>Wait a few minutes for mail servers to sync</li>
              </ul>
            </div>

            {/* Display message feedback */}
            {resendSuccess && (
              <div className="w-full bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[11px] p-4 rounded-2xl flex items-start space-x-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="font-bold leading-normal">{resendSuccess}</span>
              </div>
            )}

            {resendError && (
              <div className="w-full bg-red-950/20 border border-red-500/20 text-red-400 text-[11px] p-4 rounded-2xl flex items-start space-x-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="font-bold leading-normal">{resendError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full pt-4 space-y-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0 || !email}
                className="w-full relative group overflow-hidden rounded-2xl h-14 flex items-center justify-center cursor-pointer transition-all duration-300 border border-white/10 hover:border-white/20 select-none bg-[#0a0a0c]"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 text-slate-300 group-hover:text-white text-xs font-black uppercase italic tracking-widest flex items-center gap-2">
                  {resending ? (
                    <>
                      Sending Link...
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      Resend Cooldown ({cooldown}s)
                    </>
                  ) : (
                    <>
                      Resend Verification Link
                      <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                    </>
                  )}
                </span>
              </button>

              <Link 
                to="/login"
                className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In Screen</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Secure watermark */}
        <div className="mt-8 flex justify-center items-center space-x-3 opacity-20">
          <div className="h-[1px] w-8 bg-slate-800" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Secure Protocol v2.5</span>
          <div className="h-[1px] w-8 bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
