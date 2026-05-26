import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

type CallbackStatus = "idle" | "verifying" | "success" | "error";

export function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (!reference) {
      console.log('[Callback Handler] No payment reference found. Navigating back to wallet.');
      navigate('/wallet');
      return;
    }

    verifyPayment();
  }, [reference]);

  const verifyPayment = async () => {
    try {
      setStatus("verifying");
      console.log(`[Callback Handler] Verifying with edge function for reference: ${reference}`);

      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference }
      });

      if (error || !data) {
        throw new Error(error?.message || 'Empty response returned from paystack-verify function.');
      }

      if (!data.success) {
        throw new Error(data.message || 'Server returned negative transaction verification status.');
      }

      setCreditedAmount(data.amount_usd || 0);
      setStatus("success");

      // Auto redirect to wallet after 3 seconds of showing success Screen
      const timeout = setTimeout(() => {
        navigate('/wallet');
      }, 3500);

      return () => clearTimeout(timeout);
    } catch (err: any) {
      console.error('[Callback Handler] Verification exception:', err);
      setErrorMessage(err.message || 'We could not securely verify your payment with Paystack.');
      setStatus("error");
    }
  };

  return (
    <Shell>
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#090b10] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          {/* Decorative Radial Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {status === "verifying" && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 py-6"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="w-20 h-20 text-primary animate-spin relative z-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    Confirming Payment
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-4 leading-loose">
                    Securing safe connection with ledger servers. Please do not close or reload this window...
                  </p>
                </div>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 py-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                    Deposit Completed
                  </h2>
                  <p className="text-3xl font-black text-emerald-400">
                    +${creditedAmount?.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-4 leading-loose">
                    Your balance has been updated instantly. Redirecting you to wallet dashboard...
                  </p>
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={() => navigate('/wallet')}
                    className="h-12 px-6 rounded-xl bg-white text-black font-black uppercase italic text-xs tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-2 mx-auto cursor-pointer"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 py-6"
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mx-auto">
                  <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    Verification Issue
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 leading-relaxed">
                    {errorMessage || 'Paystack references could not be verified securely.'}
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => navigate('/wallet')}
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all mx-auto cursor-pointer"
                  >
                    Return to Wallet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Shell>
  );
}
export default PaymentCallback;
