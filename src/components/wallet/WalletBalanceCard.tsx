import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { WalletTopUpModal } from './WalletTopUpModal';
import { Wallet, Plus, Loader2 } from 'lucide-react';

interface WalletBalanceCardProps {
  balance: number; // current USD balance
  currency?: string; // display currency (default "USD")
  isLoading?: boolean;
  onTopUpSuccess?: (newBalance: number) => void;
}

export function WalletBalanceCard({
  balance,
  currency = "USD",
  isLoading = false,
  onTopUpSuccess
}: WalletBalanceCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  
  // Motion Value for rolling number effect
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => 
    latest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  useEffect(() => {
    // Avoid animating from 0 every mount if balance is loaded
    if (!isLoading && typeof balance === 'number') {
      const controls = animate(count, balance, {
        duration: 0.8,
        ease: "easeOut"
      });
      return () => controls.stop();
    }
  }, [balance, isLoading, count]);

  if (isLoading) {
    return (
      <div className="card p-8 bg-surface border border-border-main rounded-3xl relative overflow-hidden animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-4 w-2/3">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-16 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
          <div className="w-20 h-20 bg-white/10 rounded-3xl" />
        </div>
        <div className="h-14 bg-white/10 rounded-2xl mt-8" />
      </div>
    );
  }

  const handleTopUpSuccess = (creditedUsd: number) => {
    if (onTopUpSuccess) {
      onTopUpSuccess(creditedUsd);
    }
  };

  return (
    <div className="card p-8 bg-[#0b0e14] border border-white/10 rounded-3xl relative overflow-hidden shadow-2xl">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Current balance (USD)
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-500 italic uppercase tracking-tighter">
              $
            </span>
            <motion.span className="text-6xl font-black text-white italic tracking-tighter leading-none">
              {rounded}
            </motion.span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Exchange rates sync actively with market prices
          </p>
        </div>

        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <Wallet className="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      <div className="mt-10 relative z-10 pt-6 border-t border-white/5">
        <button
          onClick={() => setIsTopUpOpen(true)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase italic tracking-wider shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add Funds</span>
        </button>
      </div>

      {/* Trigger Secure Popup Modal overlay */}
      <WalletTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={handleTopUpSuccess}
      />
    </div>
  );
}
export default WalletBalanceCard;
