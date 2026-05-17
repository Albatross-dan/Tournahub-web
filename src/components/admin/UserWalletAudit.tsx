
import React, { useState, useEffect } from 'react';
import { walletService } from '../../services/walletService';
import { WalletSummary, WalletLimits, WalletActivity } from '../../types/finance';
import { 
  Search, Shield, AlertTriangle, ShieldAlert,
  ArrowUpRight, ArrowDownLeft, Lock, Unlock,
  Plus, Minus, RefreshCw, Eye
} from 'lucide-react';
import { formatCurrencyDynamic, formatDate, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function UserWalletAudit() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<{
    summary: WalletSummary;
    limits: WalletLimits;
    activity: WalletActivity[];
  } | null>(null);

  const [adjustment, setAdjustment] = useState({
    amount_usd: '',
    type: 'deposit' as 'deposit' | 'withdrawal' | 'correction',
    note: ''
  });

  async function handleSearch() {
    if (!userId) return toast.error('Enter User ID');
    try {
      setLoading(true);
      const data = await walletService.getUserWalletAudit(userId);
      setWallet(data);
    } catch (err: any) {
      toast.error(err.message || 'User not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleLockToggle() {
    if (!wallet) return;
    const action = wallet.limits.is_locked ? 'unlock' : 'lock';
    const reason = action === 'lock' ? prompt('Reason for locking:') : null;
    if (action === 'lock' && !reason) return;

    try {
      setLoading(true);
      const res = await walletService.toggleWalletLock(userId, action === 'lock', reason || undefined);
      if (res.success) {
        toast.success(`Wallet ${action}ed`);
        handleSearch();
      }
    } catch (err) {
      toast.error('Failed to toggle lock');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustment() {
    if (!adjustment.amount_usd || parseFloat(adjustment.amount_usd) <= 0) return toast.error('Enter amount');
    if (!adjustment.note) return toast.error('Enter a reason for adjustment');

    try {
      setLoading(true);
      const res = await walletService.adjustWalletBalance(
        userId,
        parseFloat(adjustment.amount_usd),
        adjustment.type,
        adjustment.note
      );
      if (res.success) {
        toast.success('Adjustment applied');
        setAdjustment({ amount_usd: '', type: 'correction', note: '' });
        handleSearch();
      }
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Treasury Audit</h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Investigate and adjust user accounts</p>
      </div>

      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
          <input 
            type="text"
            placeholder="Search by User ID..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-black italic tracking-tighter outline-none focus:border-primary/50"
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={loading || !userId}
          className="px-8 bg-primary text-black rounded-2xl font-black uppercase italic tracking-tighter hover:bg-primary-dark transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Audit'}
        </button>
      </div>

      {wallet && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <AuditStat label="Cash Balance" value={`$${wallet.summary.balance_usd.toFixed(2)}`} color="primary" />
               <AuditStat label="Life Deposits" value={`$${wallet.summary.total_deposited_usd.toFixed(2)}`} color="emerald" />
               <AuditStat label="Risk Level" value={wallet.limits.risk_level.toUpperCase()} color={wallet.limits.risk_level === 'normal' ? 'emerald' : 'amber'} />
            </div>

            {/* Lock Control Banner */}
            <div className={cn(
              "px-8 py-6 rounded-3xl border flex items-center justify-between",
              wallet.limits.is_locked 
                ? "bg-red-500/10 border-red-500/20" 
                : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              <div className="flex items-center space-x-4">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center",
                   wallet.limits.is_locked ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                 )}>
                    {wallet.limits.is_locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                 </div>
                 <div>
                    <h4 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
                      {wallet.limits.is_locked ? 'Wallet Restricted' : 'Account in Good Standing'}
                    </h4>
                    {wallet.limits.is_locked && (
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Reason: {wallet.limits.locked_reason || 'Manual Review'}</p>
                    )}
                 </div>
              </div>
              <button 
                onClick={handleLockToggle}
                className={cn(
                  "px-6 py-3 rounded-xl font-black uppercase italic tracking-tighter text-xs transition-all",
                  wallet.limits.is_locked 
                    ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                    : "bg-red-500 text-white hover:bg-red-600"
                )}
              >
                {wallet.limits.is_locked ? 'Restore Access' : 'Suspend Wallet'}
              </button>
            </div>

            {/* Manual Adjustment Form */}
            <div className="card p-8 bg-[#0a0b1e] border-white/5 space-y-6">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] italic">Manual Balance Adjustment</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Amount (USD)</p>
                     <input 
                       type="number"
                       value={adjustment.amount_usd}
                       onChange={(e) => setAdjustment({ ...adjustment, amount_usd: e.target.value })}
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black italic outline-none focus:border-primary/50"
                       placeholder="0.00"
                     />
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Type</p>
                     <select 
                       value={adjustment.type}
                       onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value as any })}
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black italic outline-none focus:border-primary/50"
                     >
                       <option value="deposit">Deposit Credit</option>
                       <option value="withdrawal">Withdrawal Debit</option>
                       <option value="correction">Admin Correction</option>
                     </select>
                  </div>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Reason / Internal Note</p>
                  <textarea 
                    value={adjustment.note}
                    onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black italic outline-none focus:border-primary/50 min-h-[80px]"
                    placeholder="Provide context for this change..."
                  />
               </div>
               <button 
                 disabled={loading || !adjustment.amount_usd || !adjustment.note}
                 onClick={handleAdjustment}
                 className="w-full py-4 bg-white hover:bg-slate-200 text-black rounded-2xl font-black uppercase italic tracking-tighter transition-all disabled:opacity-50"
               >
                 Execute Adjustment
               </button>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] italic">Full Transaction Log</h3>
                <Eye className="w-4 h-4 text-slate-700" />
             </div>
             <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {wallet.activity.map((act, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                     <div className="flex items-center justify-between">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                          act.type === 'deposit' || act.type === 'prize' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {act.type}
                        </span>
                        <span className="text-[9px] text-slate-600 font-bold">{formatDate(act.created_at)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-lg font-black italic tracking-tighter leading-none",
                          act.type === 'deposit' || act.type === 'prize' ? "text-emerald-500" : "text-white"
                        )}>
                          {act.type === 'deposit' || act.type === 'prize' ? '+' : '-'}${Math.abs(act.amount_usd).toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{act.status}</span>
                     </div>
                     <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate">{act.note}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-6 bg-[#0a0b1e] border-white/5">
       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</p>
       <p className={cn(
         "text-2xl font-black italic tracking-tighter",
         color === 'primary' ? 'text-primary' : color === 'emerald' ? 'text-emerald-500' : 'text-amber-500'
       )}>{value}</p>
    </div>
  );
}
