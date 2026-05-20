
import React, { useState, useEffect } from 'react';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { walletService } from '../services/walletService';
import Shell from '../components/layout/Shell';
import { 
  History, Search, Filter, ArrowUpRight, 
  Plus, ArrowLeft, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, Trophy, RefreshCcw
} from 'lucide-react';
import { formatCurrencyDynamic, formatDate, cn } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import { Transaction, SupportedCurrency, TransactionType } from '../types/finance';
import { Link } from 'react-router-dom';

export default function WalletHistory() {
  const { user } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(loadHistory);
  const [currency, setCurrency] = useState<SupportedCurrency>('KES');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  const limit = 20;

  useEffect(() => {
    isInitialLoad.current = true;
    if (user) {
      loadHistory();
    }
  }, [user, page, filter, currency]);

  async function loadHistory() {
    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const data = await walletService.getTransactionHistory({
        limit,
        offset: page * limit,
        type: filter === 'all' ? null : filter,
        displayCurrency: currency
      });
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link to="/wallet" className="p-2 hover:bg-white/5 rounded-full transition-colors group">
              <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-primary" />
            </Link>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Transaction Ledger</h1>
          </div>
          
          <div className="flex items-center space-x-2">
             <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value as any);
                    setPage(0);
                  }}
                  className="bg-[#1c1f3e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white uppercase italic tracking-tighter outline-none focus:border-primary/50 transition-colors appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="entry_fee">Entry Fees</option>
                  <option value="prize">Prizes</option>
                  <option value="refund">Refunds</option>
                </select>
             </div>
             
             <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="bg-[#1c1f3e] border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white uppercase italic tracking-tighter outline-none focus:border-primary/50 transition-colors"
              >
                <option value="USD">USD</option>
                <option value="KES">KES</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="UGX">UGX</option>
                <option value="ZAR">ZAR</option>
              </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <LoadingState message="Scanning Blockchain..." />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card bg-[#0a0b1e] border-white/5 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-white/5 bg-white/5">
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Event</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Reference</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Date</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Amount</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {transactions.map((tx) => (
                       <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="px-6 py-4">
                           <div className="flex items-center space-x-3">
                              <TransactionIcon type={tx.type} direction={tx.direction} />
                              <div>
                                <p className="text-xs font-black text-white uppercase italic tracking-tighter">{tx.type.replace('_', ' ')}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tx.description}</p>
                              </div>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-[10px] font-mono text-slate-400 group-hover:text-primary transition-colors">
                              {tx.tournament_name || tx.id.split('-')[0].toUpperCase()}
                            </p>
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {formatDate(tx.created_at)}
                            </p>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="space-y-0.5">
                              <p className={cn(
                                "text-sm font-black italic tracking-tighter tabular-nums",
                                tx.direction === 'credit' ? "text-emerald-400" : "text-white"
                              )}>
                                {tx.direction === 'credit' ? '+' : '-'}{tx.amount_display.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.display_symbol}
                              </p>
                              {tx.original_currency !== 'USD' && (
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                  ≈ ${tx.amount_usd.toFixed(2)} USD
                                </p>
                              )}
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <StatusBadge status={tx.status} />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {transactions.length === 0 && (
                 <div className="py-20 text-center">
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No transaction records found</p>
                 </div>
               )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">
                   Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                 </p>
                 
                 <div className="flex items-center space-x-2">
                   <button 
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 transition-all hover:bg-white/10"
                   >
                     <ChevronLeft className="w-5 h-5 text-white" />
                   </button>
                   <button 
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 transition-all hover:bg-white/10"
                   >
                     <ChevronRight className="w-5 h-5 text-white" />
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function TransactionIcon({ type, direction }: { type: TransactionType; direction: 'credit' | 'debit' }) {
  if (type === 'prize') return <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"><Trophy className="w-4 h-4" /></div>;
  if (type === 'entry_fee') return <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500"><TrendingDown className="w-4 h-4" /></div>;
  if (type === 'refund') return <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-500"><RefreshCcw className="w-4 h-4" /></div>;
  
  if (direction === 'credit') return <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Plus className="w-4 h-4" /></div>;
  return <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center text-slate-400"><ArrowUpRight className="w-4 h-4" /></div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    refunded: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[9px] font-black uppercase italic tracking-widest border",
      styles[status] || styles.pending
    )}>
      {status}
    </span>
  );
}
