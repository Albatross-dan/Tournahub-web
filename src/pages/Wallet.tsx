import React, { useState, useEffect } from 'react';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import Shell from '../components/layout/Shell';
import { 
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, 
  History, CreditCard, Plus, ArrowRight, TrendingUp,
  CheckCircle2, Shield, Trophy, AlertTriangle, Clock
} from 'lucide-react';
import { formatCurrencyDynamic, formatDate, cn } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import { SupportedCurrency } from '../types/finance';
import { Link } from 'react-router-dom';
import { WalletBalanceCard } from '../components/wallet/WalletBalanceCard';
import WithdrawalModal from '../components/wallet/WithdrawalModal';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';

export default function Wallet() {
  const { profile } = useAuth();
  const [currency, setCurrency] = useState<SupportedCurrency>('KES'); // Default to KES for demo/preference
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const { 
    summary, limits, recentActivity, 
    loading, refreshing, refreshWallet,
    isLocked, environment 
  } = useWallet(currency);

  useRefetchOnFocus(refreshWallet);

  const isSandbox = environment === 'sandbox';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    
    if (reference) {
      handleVerify(reference);
    }
  }, []);

   async function handleVerify(reference: string) {
    try {
      setVerificationLoading(true);
      toast.loading('Verifying secure payment transaction...', { id: 'wallet-verify' });
      
      await walletService.confirmPaymentRequest(reference, { reference, status: 'success' });

      toast.success('Transaction verified! Funds deposited successfully.', { id: 'wallet-verify' });
      refreshWallet();
    } catch (err: any) {
      console.error('[Payment Verification] Error:', err);
      toast.error(err.message || 'Verification failed. Please contact support.', { id: 'wallet-verify' });
    } finally {
      setVerificationLoading(false);
      // Clean up URL query parameters cleanly
      const url = new URL(window.location.href);
      url.searchParams.delete('reference');
      url.searchParams.delete('trxref');
      url.searchParams.delete('provider');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }

  if (loading || verificationLoading) return (
    <Shell>
      <LoadingState message={verificationLoading ? "Verifying secure payment..." : "Decrypting Ledger..."} />
    </Shell>
  );

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-text-main uppercase italic tracking-tighter">My Wallet</h1>
          <div className="flex items-center space-x-2">
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
              className="bg-surface border border-border-main rounded-lg px-3 py-1.5 text-xs font-bold text-text-main uppercase italic tracking-tighter outline-none focus:border-primary/50 transition-colors"
            >
              <option value="USD">USD ($)</option>
              <option value="KES">KES (KSh)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="GHS">GHS (₵)</option>
              <option value="UGX">UGX (USh)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
            {refreshing && (
              <Clock className="w-4 h-4 text-primary animate-spin" />
            )}
          </div>
        </div>

        {/* Sandbox Indicator */}
        {isSandbox && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center space-x-3">
            <div className="bg-amber-500 rounded-lg p-1.5">
              <AlertTriangle className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-500 uppercase italic tracking-tighter">
                Sandbox Mode Active
              </p>
              <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">
                No real money involved. Payments are simulated for testing purposes.
              </p>
            </div>
          </div>
        )}

        {/* Locked Wallet Banner */}
        {isLocked && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center space-x-4">
            <div className="bg-red-500 rounded-xl p-2.5 shadow-lg shadow-red-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-red-500 uppercase italic tracking-tighter">
                Wallet Locked: {limits?.locked_reason || 'Security Review Required'}
              </p>
              <p className="text-xs text-red-500/70 font-bold uppercase tracking-widest mt-0.5">
                Financial operations are temporarily suspended. Please contact support to resolve this.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Balance Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WalletBalanceCard 
                balance={summary?.balance_usd || 0}
                isLoading={loading}
                onTopUpSuccess={(_newBalance) => {
                  refreshWallet(true);
                }}
              />
              
              {/* Withdrawal Display Card */}
              <div className="card p-8 bg-[#0b0e14] border border-white/10 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                 
                 <div className="space-y-4">
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Available Payout</p>
                   <div className="flex items-baseline space-x-2">
                     <span className="text-3xl font-black text-red-500 italic uppercase tracking-tighter">$</span>
                     <span className="text-6xl font-black text-white italic tracking-tighter leading-none">
                       {(summary?.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                   </div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     Withdrawals process securely within 24 hours
                   </p>
                 </div>

                 <div className="mt-10 pt-6 border-t border-white/5">
                   <button 
                     disabled={isLocked || (summary?.balance_usd || 0) < 1 || (limits?.remaining_withdrawal_usd || 0) <= 0}
                     onClick={() => setIsWithdrawOpen(true)}
                     className="w-full h-14 rounded-2xl bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase italic tracking-wider shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
                   >
                     <Plus className="w-5 h-5 rotate-45 transform" />
                     <span>Withdraw Funds</span>
                   </button>
                 </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Deposited" amount={summary?.total_deposited_usd || 0} color="emerald" />
              <StatCard label="Entry Fees" amount={summary?.total_entry_fees_usd || 0} color="amber" />
              <StatCard label="Prizes" amount={summary?.total_prizes_usd || 0} color="primary" />
              <StatCard label="Refunds" amount={summary?.total_refunds_usd || 0} color="sky" />
            </div>
          </div>

          {/* Right Sidebar: Recent Activity & Limits */}
          <div className="space-y-6">
            {/* Quick Limits Card */}
            <div className="card p-6 bg-surface border-border-main space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] italic">Limits & Security</h3>
                <Shield className="w-3.5 h-3.5 text-primary/50" />
              </div>
              
              <div className="space-y-4">
                <LimitMetric 
                  label="Daily Deposit" 
                  current={limits?.today_deposited_usd || 0} 
                  max={limits?.daily_deposit_limit_usd || 0} 
                />
                <LimitMetric 
                  label="Daily Withdrawal" 
                  current={limits?.today_withdrawn_usd || 0} 
                  max={limits?.daily_withdrawal_limit_usd || 0} 
                />
              </div>

              <div className="pt-2 border-t border-border-main">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <span>Risk Level</span>
                    <span className={cn(
                      "italic",
                      limits?.risk_level === 'normal' ? "text-emerald-500" : "text-amber-500"
                    )}>{limits?.risk_level}</span>
                 </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] italic">Recent Events</h3>
                <Link to="/wallet/history" className="text-[10px] font-black text-primary uppercase italic hover:underline">View All</Link>
              </div>

              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <ActivityRow key={activity.created_at + idx} activity={activity} />
                  ))
                ) : (
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-center py-8">No recent events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <WithdrawalModal 
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={refreshWallet}
        limits={limits}
        balanceUsd={summary?.balance_usd || 0}
        exchangeRate={summary?.exchange_rate || 1}
      />
    </Shell>
  );
}

function StatCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    primary: 'bg-primary/10 border-primary/20 text-primary',
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400'
  };

  return (
    <div className={cn("card p-4 border flex flex-col justify-between", colorMap[color])}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-2">{label}</p>
      <p className="text-xl font-black italic tracking-tighter tabular-nums leading-none">
        ${amount.toFixed(2)}
      </p>
    </div>
  );
}

function LimitMetric({ label, current, max }: { label: string; current: number; max: number }) {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-main">${current.toFixed(0)} / ${max.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-background rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface ActivityRowProps {
  activity: any;
  key?: React.Key;
}

function ActivityRow({ activity }: ActivityRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-main last:border-0 group cursor-default">
      <div className="flex items-center space-x-3">
        <span className="text-lg">{activity.icon}</span>
        <div>
          <p className="text-[10px] font-black text-text-main uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">
            {activity.description}
          </p>
          <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">
            {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activity.type}
          </p>
        </div>
      </div>
      <p className={cn(
        "text-xs font-black italic tracking-tighter tabular-nums",
        activity.direction === 'credit' ? "text-emerald-400" : "text-text-main/60"
      )}>
        {activity.direction === 'credit' ? '+' : '-'}${activity.amount_usd.toFixed(2)}
      </p>
    </div>
  );
}
