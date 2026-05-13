import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Wallet, Search, ArrowUpRight, ArrowDownLeft,
  CreditCard, DollarSign, Calendar, FilterIcon,
  RefreshCcw, CheckCircle2, AlertCircle, TrendingUp
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';

export default function AdminWallet() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, profiles:user_id(username)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = transactions.filter(t => 
    t.profiles?.username?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Financial <span className="text-primary italic">Ops</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Global Transaction Log & Audit Trail</p>
          </div>

          <div className="flex items-center space-x-4">
            <button className="px-8 py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20">
              Trigger Global Payouts
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <WalletSummaryCard 
            title="Escrowed Capital" 
            value={formatCurrency(transactions.reduce((acc, t) => acc + (t.amount > 0 ? t.amount : 0), 0))} 
            icon={<DollarSign />} 
            color="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
           />
           <WalletSummaryCard 
            title="Total Outflow" 
            value={formatCurrency(Math.abs(transactions.reduce((acc, t) => acc + (t.amount < 0 ? t.amount : 0), 0)))} 
            icon={<ArrowUpRight />} 
            color="bg-red-500/10 text-red-500 border-red-500/20"
           />
           <WalletSummaryCard 
            title="Verified Settlements" 
            value={transactions.length.toString()} 
            icon={<CheckCircle2 />} 
            color="bg-primary/10 text-primary border-primary/20"
           />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Query financial records by reference, operative, or tag..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold placeholder:text-slate-700 outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden border-white/5 bg-surface/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Reference</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Operative</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Category</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-right">Amount</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24">
                      <LoadingState message="Decrypting Financial Ledger..." />
                    </td>
                  </tr>
                ) : filtered.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-white/5 transition-all duration-300">
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-600 font-mono italic">#{tx.id.slice(0, 16)}</span>
                        <span className="text-xs font-bold text-slate-300 mt-1">{tx.description || 'System Transaction'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                        <span className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{tx.profiles?.username || 'Anonymous'}</span>
                    </td>
                    <td className="px-6 py-6">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">{tx.type}</span>
                    </td>
                    <td className="px-6 py-6 text-right font-mono">
                      <span className={cn(
                        "text-sm font-black italic tracking-tighter",
                        tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                        <div className="flex items-center justify-center text-emerald-500 space-x-1.5">
                           <CheckCircle2 size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest italic">Settled</span>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function WalletSummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactElement; color: string }) {
  return (
    <div className="card p-8 border-white/5 bg-surface/30 relative overflow-hidden group hover:border-white/10 transition-all">
       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border mb-6 group-hover:scale-110 transition-transform", color)}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
      <div className="space-y-1 relative z-10">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
