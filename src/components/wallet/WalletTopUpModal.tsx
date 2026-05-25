import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletTopUp } from '../../hooks/useWalletTopUp';
import { CURRENCIES } from '../../config/currencies';
import { SupportedCurrency } from '../../types/payment';
import { Loader2, X, AlertTriangle, CheckCircle2, Shield, Wallet, Globe } from 'lucide-react';

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amountUsd: number) => void;
}

const PRESETS: Record<SupportedCurrency, number[]> = {
  NGN: [1000, 2000, 5000, 10000, 20000, 50000],
  GHS: [10, 20, 50, 100, 200, 500],
  ZAR: [20, 50, 100, 200, 500, 1000],
  USD: [5, 10, 20, 50, 100, 200],
  KES: [100, 200, 500, 1000, 2000, 5000],
};

export function WalletTopUpModal({ isOpen, onClose, onSuccess }: WalletTopUpModalProps) {
  const { user, profile } = useAuth();
  const { step, errorMessage, successAmount, initiateTopUp, reset } = useWalletTopUp();
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Clean form when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedPreset(PRESETS[currency][0]);
      setCustomAmount("");
    }
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const currentConfig = CURRENCIES[currency];
  const activeAmount = selectedPreset !== null ? selectedPreset : parseFloat(customAmount) || 0;
  
  // Calculate subunit multiplier (e.g. 100 for cents/kobos)
  const amountSubunit = Math.round(activeAmount * currentConfig.subunit_multiplier);
  
  // Estimate USD amount using standard approximate rate
  const amountUsd = activeAmount / currentConfig.approx_usd_rate;

  const handlePresetSelect = (val: number) => {
    setSelectedPreset(val);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setCustomAmount(val);
      setSelectedPreset(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (activeAmount <= 0) return;

    const email = user.email || 'guest@tournahub.com';
    const name = profile?.username || email.split('@')[0];

    await initiateTopUp({
      amountSubunit,
      currency,
      amountUsd,
      userEmail: email,
      userName: name
    });
  };

  const handleSuccessDone = () => {
    if (successAmount !== null) {
      onSuccess(successAmount);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step === "idle" || step === "error" ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] md:max-h-[85vh] rounded-3xl bg-[#090b10] border border-white/10 shadow-2xl shadow-black/80 flex flex-col pt-6 overflow-hidden"
        >
          {/* Top header navigation item */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Paystack Secure Top up
              </span>
            </div>
            {(step === "idle" || step === "error" || step === "success") && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-colors"
                id="close-wallet-modal-btn"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-get-scrollable flex-1 space-y-4">
            <AnimatePresence mode="wait">
              {step === "idle" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Currency Selection drop-down */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Payment Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                        className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                      >
                        {Object.values(CURRENCIES).map((curr) => (
                          <option key={curr.code} value={curr.code} className="bg-[#090b10] text-white">
                            {curr.flag} &nbsp;&nbsp; {curr.code} - {curr.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Globe className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Preset Amount buttons selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Select Amount
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {PRESETS[currency].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetSelect(preset)}
                          className={`h-12 rounded-xl text-xs font-black italic uppercase tracking-tighter transition-all duration-200 border ${
                            selectedPreset === preset
                              ? 'bg-primary border-primary text-black scale-[1.03] shadow-lg shadow-primary/25'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {currentConfig.flag} {preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Or input customized amount */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Or Custom Amount
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={handleCustomChange}
                        className="w-full h-14 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl text-white font-black italic tracking-tight text-lg focus:outline-none focus:border-primary transition-colors"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500 italic">
                        {currentConfig.code}
                      </div>
                    </div>
                  </div>

                  {/* Pricing dynamic computation section */}
                  {activeAmount > 0 && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Estimated conversion
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {currency} {activeAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black italic tracking-tighter text-emerald-500">
                          +${amountUsd.toFixed(2)}
                        </p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                          Fund Account
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Disclaimer banner */}
                  <p className="text-[9px] font-medium text-slate-500 tracking-wide text-center uppercase leading-tight">
                    Payments are secure and processed automatically. Your selected currency will be debited and converted directly to USD wallet balance.
                  </p>

                  {/* Bottom checkout triggers */}
                  <button
                    disabled={activeAmount <= 0}
                    onClick={handleSubmit}
                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black uppercase italic tracking-wider shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 text-sm cursor-pointer"
                  >
                    <span>Securely Add to Wallet</span>
                  </button>
                </motion.div>
              )}

              {step === "initializing" && (
                <motion.div
                  key="initializing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                      Setting up transaction
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Securing API connection with Paystack...
                    </p>
                  </div>
                </motion.div>
              )}

              {step === "awaiting_payment" && (
                <motion.div
                  key="awaiting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                    <Loader2 className="w-16 h-16 text-primary animate-spin relative" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter animate-pulse">
                      Awaiting Payment Authorization
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-6">
                      Please enter your credentials in the Paystack secure checkout popup window to complete transaction.
                    </p>
                  </div>
                </motion.div>
              )}

              {step === "verifying" && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter animate-pulse">
                      Verifying Transaction
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Validating secure signatures and finalizing deposit balance...
                    </p>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                      Deposit Successful!
                    </h3>
                    <p className="text-3xl font-black tracking-tight text-emerald-400">
                      +${successAmount?.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                      Funds successfully allocated. Your ledger balance has been instantly adjusted. Enjoy.
                    </p>
                  </div>
                  <button
                    onClick={handleSuccessDone}
                    className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase italic tracking-wider active:scale-[0.98] transition-all text-sm cursor-pointer"
                  >
                    Done
                  </button>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                  <div className="space-y-2 px-4">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                      Transaction Failed
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider leading-relaxed">
                      {errorMessage || 'A network error occurred while securing your payment with Paystack.'}
                    </p>
                  </div>
                  <div className="w-full flex space-x-3">
                    <button
                      onClick={reset}
                      className="flex-1 h-14 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-black uppercase italic tracking-wider active:scale-[0.98] transition-all text-xs cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase italic tracking-wider active:scale-[0.98] transition-all text-xs hover:text-white"
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
