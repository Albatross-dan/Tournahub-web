import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet as WalletType, WalletTransaction } from '../types/database';
import { walletService } from '../services/walletService';
import Shell from '../components/layout/Shell';
import { 
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, 
  History, CreditCard, Plus, ArrowRight, TrendingUp,
  CheckCircle2, Shield, Trophy
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';

export default function Wallet() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState({ winnings: 0, fees: 0, rewards: 0 });

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  async function loadWalletData() {
    if (!user) return;
    try {
      setLoading(true);
      const [walletData, txs] = await Promise.allSettled([
        walletService.getBalance(user.id),
        walletService.getTransactions(user.id)
      ]);

      const walletVal = walletData.status === 'fulfilled' ? walletData.value : null;
      const transactionsVal = txs.status === 'fulfilled' ? txs.value || [] : [];

      setWallet(walletVal);
      setTransactions(transactionsVal);

      // Calculate insights
      const winnings = transactionsVal
        .filter(t => t.type === 'prize' || (t.amount > 0 && t.type === 'win'))
        .reduce((acc, t) => acc + t.amount, 0);
      
      const fees = transactionsVal
        .filter(t => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      setInsights({ winnings, fees, rewards: 0 });
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Wallet</h1>

        {loading ? (
          <LoadingState message="Decrypting Ledger..." />
        ) : (
          <div className="space-y-8">
            {/* Main Balance Card */}
            <div className="card p-8 bg-gradient-to-br from-[#1c1f3e] to-[#0a0b1e] border-slate-800 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
               
               <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Wallet Balance</p>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-xl font-black text-primary italic uppercase tracking-tighter">USD</span>
                      <span className="text-6xl font-black text-white italic tracking-tighter leading-none">
                        {(wallet?.balance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-[#252849] rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
                    <WalletIcon className="w-8 h-8 text-primary" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-8 pb-8 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status</p>
                      <p className="text-sm font-black text-emerald-500 uppercase italic tracking-tighter">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Account</p>
                      <p className="text-sm font-black text-primary uppercase italic tracking-tighter">{profile?.role || 'User'}</p>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-white/5 pt-8">
                  <button className="bg-primary hover:bg-primary-dark transition-all py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-primary/20 group">
                    <Plus className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
                    <span className="text-black font-black uppercase italic tracking-tighter">Deposit</span>
                  </button>
                  <button className="bg-transparent border border-white/20 hover:bg-white/5 transition-all py-4 rounded-2xl flex items-center justify-center space-x-2">
                    <ArrowUpRight className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-200 font-black uppercase italic tracking-tighter">Withdraw</span>
                  </button>
               </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-6 bg-[#0a2e2d] border-[#0d4d4a]">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Winnings</p>
                <p className="text-3xl font-black text-emerald-400 italic tracking-tighter leading-none">
                  {formatCurrency(insights.winnings)}
                </p>
              </div>
              <div className="card p-6 bg-[#2e1d0a] border-[#4d320d]">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                  <ArrowUpRight className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Deductions</p>
                <p className="text-3xl font-black text-amber-400 italic tracking-tighter leading-none">
                  {formatCurrency(insights.fees)}
                </p>
              </div>
            </div>

            {/* Sync Status */}
            <div className="card px-4 py-3 bg-[#0a0b12] border-white/5 flex items-center space-x-3 text-slate-500">
               <div className="flex space-x-1 animate-pulse">
                 <div className="w-1 h-3 bg-primary/20 skew-x-12" />
                 <div className="w-1 h-3 bg-primary/40 skew-x-12" />
                 <div className="w-1 h-3 bg-primary skew-x-12" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Realtime wallet sync active</span>
            </div>

            {/* Transaction History */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Transaction History</h2>
                <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg text-[10px] font-black text-primary uppercase italic tracking-widest">
                  {transactions.length} Events
                </div>
              </div>

              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.slice(0, 10).map((tx, idx) => (
                    <TransactionRow key={tx.id || idx} tx={tx} />
                  ))
                ) : (
                  <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-800">
                      <History className="w-10 h-10 text-slate-700" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No records found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction; key?: string }) {
  const isPositive = tx.amount > 0;
  return (
    <div className="card p-4 bg-surface/30 border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer">
      <div className="flex items-center space-x-4">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors",
          isPositive 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black" 
            : "bg-red-500/10 border-red-500/20 text-red-500 group-hover:bg-red-500 group-hover:text-white"
        )}>
           {isPositive ? <Plus className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
        </div>
        <div>
          <h4 className="text-lg font-black text-white italic uppercase tracking-tighter leading-tight">{isPositive ? 'Deposit' : 'Withdrawal'}</h4>
          <p className="text-sm font-bold text-sky-400 uppercase tracking-tighter">{tx.type}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
             {tx.description || 'System automation'} • {formatDate(tx.created_at || '')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          "text-2xl font-black italic tracking-tighter tabular-nums leading-none",
          isPositive ? "text-emerald-400" : "text-white"
        )}>
          {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
        </p>
        <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-[9px] font-black uppercase tracking-widest mt-2 italic shadow-lg">
          Completed
        </span>
      </div>
    </div>
  );
}
