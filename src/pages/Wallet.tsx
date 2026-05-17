import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import DepositModal from '../components/wallet/DepositModal';
import WithdrawalModal from '../components/wallet/WithdrawalModal';

export default function Wallet() {
  const { profile } = useAuth();
  const [currency, setCurrency] = useState<SupportedCurrency>('KES'); // Default to KES for demo/preference
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const { 
    summary, limits, recentActivity, 
    loading, refreshing, refreshWallet,
    isLocked, environment 
  } = useWallet(currency);

  const isSandbox = environment === 'sandbox';

  if (loading) return (
    <Shell>
      <LoadingState message="Decrypting Ledger..." />
    </Shell>
  );

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">My Wallet</h1>
          <div className="flex items-center space-x-2">
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
              className="bg-[#1c1f3e] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white uppercase italic tracking-tighter outline-none focus:border-primary/50 transition-colors"
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
            <div className="card p-8 bg-gradient-to-br from-[#1c1f3e] to-[#0a0b1e] border-slate-800 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
               
               <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-2xl font-black text-primary italic uppercase tracking-tighter">
                        {summary?.display_symbol}
                      </span>
                      <span className="text-7xl font-black text-white italic tracking-tighter leading-none">
                        {summary?.balance_display.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-widest">≈ ${summary?.balance_usd.toFixed(2)} USD</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="text-xs font-bold uppercase tracking-widest">Rate: 1 USD = {summary?.exchange_rate} {currency}</span>
                    </div>
                  </div>
                  <div className="w-20 h-20 bg-[#252849] rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl transform rotate-3">
                    <WalletIcon className="w-10 h-10 text-primary" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-12 relative z-10 border-t border-white/5 pt-8">
                  <button 
                    disabled={isLocked || (limits?.remaining_deposit_usd || 0) <= 0}
                    onClick={() => setIsDepositOpen(true)}
                    className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all py-5 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-xl shadow-primary/20 group"
                  >
                    <div className="flex items-center space-x-2">
                       <Plus className="w-5 h-5 text-black group-hover:scale-125 transition-transform" />
                       <span className="text-black font-black uppercase italic tracking-tighter text-lg">Deposit</span>
                    </div>
                    {(limits?.remaining_deposit_usd || 0) <= 0 && (
                      <span className="text-[10px] text-black/60 font-black uppercase">Daily limit reached</span>
                    )}
                  </button>
                  <button 
                    disabled={isLocked || (summary?.balance_usd || 0) < 1 || (limits?.remaining_withdrawal_usd || 0) <= 0}
                    onClick={() => setIsWithdrawOpen(true)}
                    className="bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-all py-5 rounded-2xl flex flex-col items-center justify-center space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <ArrowUpRight className="w-5 h-5 text-white" />
                      <span className="text-white font-black uppercase italic tracking-tighter text-lg">Withdraw</span>
                    </div>
                    {(summary?.balance_usd || 0) < 1 && (
                      <span className="text-[10px] text-white/40 font-black uppercase">Min $1.00 USD</span>
                    )}
                  </button>
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
            <div className="card p-6 bg-[#14152a] border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Limits & Security</h3>
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

              <div className="pt-2 border-t border-white/5">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Recent Events</h3>
                <Link to="/wallet/history" className="text-[10px] font-black text-primary uppercase italic hover:underline">View All</Link>
              </div>

              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <ActivityRow key={activity.created_at + idx} activity={activity} />
                  ))
                ) : (
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-8">No recent events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DepositModal 
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={refreshWallet}
        environment={environment}
        exchangeRate={summary?.exchange_rate || 1}
      />

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
        <span className="text-slate-400">{label}</span>
        <span className="text-white">${current.toFixed(0)} / ${max.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
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
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group cursor-default">
      <div className="flex items-center space-x-3">
        <span className="text-lg">{activity.icon}</span>
        <div>
          <p className="text-[10px] font-black text-white uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">
            {activity.description}
          </p>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
            {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activity.type}
          </p>
        </div>
      </div>
      <p className={cn(
        "text-xs font-black italic tracking-tighter tabular-nums",
        activity.direction === 'credit' ? "text-emerald-400" : "text-white/60"
      )}>
        {activity.direction === 'credit' ? '+' : '-'}${activity.amount_usd.toFixed(2)}
      </p>
    </div>
  );
}
