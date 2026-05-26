import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { WalletTopUpModal } from './WalletTopUpModal';
import { Wallet as WalletIcon, Plus, Shield, Lock, AlertTriangle } from 'lucide-react';
import type { Wallet } from '../../types/payment';

interface WalletBalanceCardProps {
  wallet?:          Wallet | null;
  balance?:         number; // legacy compatibility mapping
  isLoading?:       boolean;
  onTopUpSuccess?:  (newBalance: number) => void;
  className?:       string;
}

export function WalletBalanceCard({
  wallet = null,
  balance,
  isLoading = false,
  onTopUpSuccess,
  className = ''
}: WalletBalanceCardProps) {
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Compute active balance prioritizing database state over legacy input
  const activeBalance = wallet ? wallet.balance : (typeof balance === 'number' ? balance : 0);
  const isLocked = wallet ? wallet.is_locked : false;
  const lockedReason = wallet ? wallet.locked_reason : null;
  const riskLevel = wallet ? wallet.risk_level : 'normal';

  // Animated rolling counter
  const balanceAnimValue = useMotionValue(0);
  const displayValue = useTransform(balanceAnimValue, (latest) =>
    latest.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  useEffect(() => {
    if (!isLoading) {
      const controls = animate(balanceAnimValue, activeBalance, {
        duration: 0.8,
        ease: 'easeOut'
      });
      return () => controls.stop();
    }
  }, [activeBalance, isLoading, balanceAnimValue]);

  if (isLoading) {
    return (
      <div className={`p-6 bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden animate-pulse ${className}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-2/3">
            <div className="h-4 bg-white/5 rounded w-1/3" />
            <div className="h-10 bg-white/5 rounded w-3/4" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
          </div>
          <div className="w-14 h-14 bg-white/5 rounded-xl" />
        </div>
        <div className="h-12 bg-white/5 rounded-xl mt-6" />
      </div>
    );
  }

  return (
    <div className={`p-6 bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden shadow-2xl ${className}`}>
      {/* Visual glowing effects */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Wallet Balance
            </span>
            {riskLevel !== 'normal' && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-400 uppercase tracking-widest">
                ⚠️ {riskLevel}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black italic text-emerald-400">$</span>
            <motion.span className="text-5xl font-black italic text-white tracking-tight leading-none">
              {displayValue}
            </motion.span>
          </div>

          {isLocked && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 max-w-sm">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Locked: {lockedReason || 'Verification active'}
              </span>
            </div>
          )}
        </div>

        <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
          <WalletIcon className="w-7 h-7 text-emerald-400" />
        </div>
      </div>

      {/* Quick Deposit Action Button */}
      <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
        <button
          onClick={() => setShowTopUpModal(true)}
          disabled={isLocked}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 border border-emerald-600 disabled:border-transparent text-white font-extrabold text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add Funds</span>
        </button>
      </div>

      {/* Ledger Statistics Row */}
      {wallet && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">
          <div>
            Total Deposited:{' '}
            <span className="text-slate-300">
              ${Number(wallet.total_deposited_usd || 0).toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            Total Withdrawn:{' '}
            <span className="text-slate-300">
              ${Number(wallet.total_withdrawn_usd || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {!wallet && (
        <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          Top up your wallet to join paid tournament events.
        </p>
      )}

      {/* Nested Flow Modal */}
      <WalletTopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={(amount) => {
          onTopUpSuccess?.(amount);
        }}
      />
    </div>
  );
}

export default WalletBalanceCard;
