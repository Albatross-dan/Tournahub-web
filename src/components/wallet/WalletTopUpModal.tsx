import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletTopUp } from '../../hooks/useWalletTopUp';
import { CURRENCIES, formatCurrency, toUsd, toSubunit } from '../../config/currencies';
import type { SupportedCurrency } from '../../types/payment';
import { X, Loader2, DollarSign, Wallet } from 'lucide-react';

interface WalletTopUpModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: (amountUsd: number) => void;
}

export function WalletTopUpModal({ isOpen, onClose, onSuccess }: WalletTopUpModalProps) {
  if (import.meta.env.DEV) {
    const missing = [
      'VITE_SUPABASE_URL',
      'VITE_PAYSTACK_PUBLIC_KEY',
    ].filter(k => !import.meta.env[k]);
    if (missing.length > 0) {
      console.error('[WalletTopUpModal] Missing env vars:', missing);
    }
  }

  const { user, profile } = useAuth();
  const {
    step,
    errorMessage,
    successAmount,
    initiateTopUp,
    reset
  } = useWalletTopUp();

  // Pick user's preferred currency, mapping database preferred_currency if valid, otherwise defaulting to NGN
  const initialCurrency = React.useMemo<SupportedCurrency>(() => {
    const pref = profile?.preferred_currency as string;
    if (pref && pref in CURRENCIES) {
      return pref as SupportedCurrency;
    }
    return 'NGN';
  }, [profile?.preferred_currency]);

  const [currency, setCurrency] = useState<SupportedCurrency>(initialCurrency);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const autoSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set initial state on mount and update with user preference
  useEffect(() => {
    if (isOpen) {
      reset();
      setCurrency(initialCurrency);
      setSelectedPreset(CURRENCIES[initialCurrency].suggested_amounts[0] || null);
      setCustomAmount('');
      setValidationError(null);
    }
  }, [isOpen, initialCurrency, reset]);

  // Handle auto-success redirect after 2s
  useEffect(() => {
    if (step === 'success' && successAmount !== null) {
      autoSuccessTimeoutRef.current = setTimeout(() => {
        onSuccess(successAmount);
        onClose();
      }, 2000);
    }
    return () => {
      if (autoSuccessTimeoutRef.current) {
        clearTimeout(autoSuccessTimeoutRef.current);
      }
    };
  }, [step, successAmount, onSuccess, onClose]);

  if (!isOpen) return null;

  const currentCurrencyConfig = CURRENCIES[currency];

  const activeAmount = selectedPreset !== null ? selectedPreset : parseFloat(customAmount) || 0;
  const estimatedUsd = toUsd(activeAmount, currency);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as SupportedCurrency;
    setCurrency(newCurrency);
    const newConfig = CURRENCIES[newCurrency];
    setSelectedPreset(newConfig.suggested_amounts[0] || null);
    setCustomAmount('');
    setValidationError(null);
  };

  const handlePresetSelect = (preset: number) => {
    setSelectedPreset(preset);
    setCustomAmount('');
    setValidationError(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setCustomAmount(value);
      setSelectedPreset(null);
      setValidationError(null);
    }
  };

  const handlePayClick = async () => {
    const min = currentCurrencyConfig.min_amount;
    const max = currentCurrencyConfig.max_amount;

    if (activeAmount < min || activeAmount > max) {
      setValidationError(`Amount must be between ${formatCurrency(min, currency)} and ${formatCurrency(max, currency)}`);
      return;
    }

    if (!user) return;

    const computedSubunit = toSubunit(activeAmount, currency);
    const email = user.email || '';
    const name = profile?.username || email.split('@')[0] || 'User';

    await initiateTopUp({
      amountSubunit: computedSubunit,
      currency,
      amountUsd: estimatedUsd,
      userEmail: email,
      username: name
    });
  };

  const handleDoneClick = () => {
    if (autoSuccessTimeoutRef.current) {
      clearTimeout(autoSuccessTimeoutRef.current);
    }
    if (successAmount !== null) {
      onSuccess(successAmount);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex sm:items-center items-end justify-center">
        {/* Backdrop glassmorphism overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={step === 'idle' || step === 'error' ? onClose : undefined}
        />

        {/* Modal Card - Responsive bottom-sheet on mobile, centered modal on desktop */}
        <motion.div
          initial={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? { y: '100%' }
              : { opacity: 0, y: 20 }
          }
          animate={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? { y: 0 }
              : { opacity: 1, y: 0 }
          }
          exit={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? { y: '100%' }
              : { opacity: 0, y: 20 }
          }
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div>
              <h3 id="modal-heading-pwa" className="text-lg font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" /> Add Funds
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                Top up your TournaHub wallet
              </p>
            </div>
            {(step === 'idle' || step === 'error') && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body Content with AnimatePresence Step Transition */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Currency Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Payment Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={handleCurrencyChange}
                        className="w-full h-12 pl-4 pr-10 bg-slate-950/85 border border-white/10 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none transition-colors"
                      >
                        {Object.values(CURRENCIES).map((curr) => (
                          <option key={curr.code} value={curr.code} className="bg-slate-900 text-white">
                            {curr.flag} {curr.code} — {curr.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Suggested Preset Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Suggested Amount
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {currentCurrencyConfig.suggested_amounts.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePresetSelect(preset)}
                          className={`py-2 rounded-lg text-xs font-black transition-all border ${
                            selectedPreset === preset
                              ? 'ring-2 ring-emerald-400 bg-emerald-400/10 text-emerald-400 border-emerald-400'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {formatCurrency(preset, currency)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Or Enter Custom Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                        {currentCurrencyConfig.symbol}
                      </span>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={handleCustomChange}
                        className="w-full h-12 pl-10 pr-4 bg-slate-950/85 border border-white/10 rounded-xl text-white font-black italic text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    {validationError && (
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
                        ⚠️ {validationError}
                      </p>
                    )}
                  </div>

                  {/* USD Conversion Estimate */}
                  {activeAmount > 0 && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Estimated Value (USD)
                      </span>
                      <span className="text-sm font-black italic text-emerald-400">
                        ≈ ${estimatedUsd.toFixed(2)} USD
                      </span>
                    </div>
                  )}

                  <p className="text-[9px] text-center uppercase tracking-wide text-slate-500 leading-normal">
                    * Exchange rate is approximate. Final rate is processed securely at payment checkout.
                  </p>

                  {/* Make Payment Trigger Button */}
                  <button
                    onClick={handlePayClick}
                    disabled={activeAmount <= 0}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-extrabold text-xs uppercase italic tracking-wider transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Pay {currentCurrencyConfig.symbol}{activeAmount.toLocaleString('en', { minimumFractionDigits: 0 })}
                  </button>

                  <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 uppercase font-bold">
                    <span>🔒 Secured by Paystack. Your details are never saved.</span>
                  </div>
                </motion.div>
              )}

              {step === 'initializing' && (
                <motion.div
                  key="initializing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-wider animate-pulse">
                      Setting up secure payment...
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Spawning sandbox checkout handlers with Paystack API.
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 'awaiting_payment' && (
                <motion.div
                  key="awaiting_payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="py-10 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      className="absolute w-12 h-12 bg-emerald-400 rounded-full blur-md"
                    />
                    <div className="w-8 h-8 rounded-full bg-emerald-400 border border-emerald-500 flex items-center justify-center text-slate-950 font-black relative">
                      !
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-wider">
                      Complete checkout in the popup window
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Don't close or refresh this page.
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancel / Go Back
                  </button>
                </motion.div>
              )}

              {step === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-wider">
                      Verifying your payment...
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      This only takes a moment
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="py-10 flex flex-col items-center justify-center text-center space-y-5"
                >
                  {/* Self-drawing circular checkmark animation */}
                  <svg className="w-14 h-14" viewBox="0 0 52 52">
                    <circle className="stroke-emerald-400/20 fill-none" cx="26" cy="26" r="25" strokeWidth="2" />
                    <motion.circle
                      className="stroke-emerald-400 fill-none"
                      cx="26"
                      cy="26"
                      r="25"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    <motion.path
                      className="stroke-emerald-400 fill-none"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.4, ease: 'easeInOut' }}
                    />
                  </svg>

                  <div className="space-y-1.5 text-center">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="text-3xl font-black italic text-emerald-400 block tracking-tight"
                    >
                      +${successAmount?.toFixed(2)}
                    </motion.span>
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">
                      added to your wallet
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                      Your balance is synchronized. Redirecting shortly...
                    </p>
                  </div>

                  <button
                    onClick={handleDoneClick}
                    className="w-full h-12 rounded-xl bg-white text-slate-900 text-xs font-black uppercase italic tracking-wider cursor-pointer active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </motion.div>
              )}

              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="py-8 flex flex-col items-center justify-center text-center space-y-5"
                >
                  {/* Red failure overlay */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-12 h-12 bg-red-500/15 border border-red-500/25 rounded-full flex items-center justify-center text-red-500 font-black text-lg"
                  >
                    ✕
                  </motion.div>

                  <div className="space-y-1.5 px-4">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-wider">
                      Transaction Refused
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-relaxed">
                      {errorMessage || 'A validation exception occurred. Please verify sandbox inputs and retry.'}
                    </p>
                  </div>

                  <div className="w-full flex gap-2">
                    <button
                      onClick={reset}
                      className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase italic tracking-wider cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-extrabold text-xs uppercase italic tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default WalletTopUpModal;
