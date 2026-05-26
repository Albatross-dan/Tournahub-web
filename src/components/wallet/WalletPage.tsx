import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { WalletBalanceCard } from './WalletBalanceCard';
import { TransactionHistory } from './TransactionHistory';
import WithdrawalModal from './WithdrawalModal';
import Shell from '../layout/Shell';
import LoadingState from '../ui/LoadingState';
import { Shield, Sparkles, TrendingUp, HelpCircle, ArrowUpRight, ArrowDownLeft, Lock } from 'lucide-react';

export function WalletPage() {
  const { wallet, isLoading, error, refetch, environment, isLocked } = useWallet();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  if (isLoading) {
    return (
      <Shell>
        <LoadingState message="Decrypting secure gaming ledger..." />
      </Shell>
    );
  }

  const isSandbox = environment === 'sandbox';

  // Map the new table schema parameters to match any fields expected by older components/modals
  const activeBalance = wallet ? wallet.balance : 0;
  
  const mappedLimits = {
    remaining_withdrawal_usd: wallet ? Math.max(0, Number(wallet.daily_withdrawal_limit) - Number(wallet.total_withdrawn_usd)) : 500,
    single_tx_limit_usd: wallet ? Number(wallet.single_tx_limit) : 200,
    is_locked: isLocked,
    locked_reason: wallet?.locked_reason || 'Security review active',
    risk_level: wallet?.risk_level || 'normal'
  };

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        
        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              My Wallet
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Secure in-game ledgers and instantaneous paystack topups
            </p>
          </div>
          {isSandbox && (
            <span className="px-2.5 py-1 text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full tracking-widest">
              ⚡ Sandbox active
            </span>
          )}
        </div>

        {/* Global Security Warning Callout */}
        {isLocked && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-red-500 uppercase italic tracking-tighter">
                Wallet Locked: {wallet?.locked_reason || 'Awaiting Security Clearance'}
              </p>
              <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest mt-0.5 leading-relaxed">
                Your wallet is temporarily locked for security review. Funding and withdrawal actions are suspended. Please contact support.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Grid Splitter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Financial Balance Cards & Statistics (2 cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Side: Modern Interactive Wallet Deposit Card */}
              <WalletBalanceCard
                wallet={wallet}
                isLoading={isLoading}
                onTopUpSuccess={() => {
                  refetch();
                }}
              />

              {/* Right Side: Available Payout / Bank Withdrawal Card */}
              <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Available For Payout
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black italic text-teal-400">$</span>
                    <span className="text-5xl font-black italic text-white tracking-tight leading-none">
                      {activeBalance.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Secure local withdrawals processed inside 24 hours.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <button
                    disabled={isLocked || activeBalance < 1 || mappedLimits.remaining_withdrawal_usd <= 0}
                    onClick={() => setIsWithdrawOpen(true)}
                    className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-705 border border-white/10 disabled:bg-slate-950 disabled:border-transparent disabled:text-slate-600 text-slate-200 hover:text-white font-extrabold text-xs uppercase italic tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    <span>Withdraw Funds</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Quick Summary Statistical Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatItem label="Total Deposited" value={wallet?.total_deposited_usd || 0} theme="emerald" />
              <StatItem label="Total Withdrawn" value={wallet?.total_withdrawn_usd || 0} theme="teal" />
              <StatItem label="Daily Limit" value={wallet?.daily_withdrawal_limit || 500} theme="amber" />
              <StatItem label="Single TX limit" value={wallet?.single_tx_limit || 200} theme="sky" />
            </div>
          </div>

          {/* Right Sidebar: Paginated Transaction list & Security Limit indicators */}
          <div className="space-y-6">
            
            {/* Limit metrics card */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs font-black text-slate-200 uppercase italic tracking-wider">
                  Limits & Security
                </span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Risk Classification:</span>
                  <span className={`italic font-black ${
                    wallet?.risk_level === 'blocked' ? 'text-red-400' :
                    wallet?.risk_level === 'elevated' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {wallet?.risk_level || 'normal'}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/40 rounded-lg text-[9px] font-medium text-slate-500 uppercase leading-snug">
                  * Dynamic risk thresholds adjust based on ledger account age and verification scores.
                </div>
              </div>
            </div>

            {/* Completed transactions history block */}
            <TransactionHistory />

          </div>

        </div>

      </div>

      {/* Unified Payout Cashout Modal */}
      {wallet && (
        <WithdrawalModal
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          onSuccess={() => {
            refetch();
          }}
          limits={mappedLimits as any}
          balanceUsd={activeBalance}
          exchangeRate={1} // Base is always set as 1 as we are in strict USD mode on table
        />
      )}
    </Shell>
  );
}

// Inline Styled Stat Box Component
function StatItem({ label, value, theme }: { label: string; value: number; theme: 'emerald' | 'teal' | 'amber' | 'sky' }) {
  const themeClasses = {
    emerald: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400',
    teal: 'bg-teal-500/5 border-teal-500/15 text-teal-400',
    amber: 'bg-amber-500/5 border-amber-500/15 text-amber-400',
    sky: 'bg-sky-500/5 border-sky-500/15 text-sky-400'
  };

  return (
    <div className={`p-4 rounded-xl border ${themeClasses[theme]}`}>
      <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block">
        {label}
      </span>
      <span className="text-lg font-black italic block mt-1.5 leading-none">
        ${Number(value).toFixed(2)}
      </span>
    </div>
  );
}

export default WalletPage;
