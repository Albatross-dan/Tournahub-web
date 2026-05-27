import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, Coins, Calendar, ArrowUpDown, ChevronUp, ChevronDown,
  Trophy, ExternalLink, RefreshCw, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlatformRevenue {
  id: string;
  tournament_id: string;
  tournament_name: string;
  fee_percent: number;        // e.g. 10
  gross_escrow_usd: number;   // total pot before cut
  amount_usd: number;         // platform's actual earnings
  currency: string;           // 'USD'
  source: string;             // 'prize_pool_fee'
  status: string;             // 'completed' | 'reversed'
  created_at: string;
  notes: string | null;
}

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

const formatPercent = (value: number) =>
  `${value.toFixed(2).replace(/\.00$/, '')}%`;

export default function PlatformRevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [revenueRows, setRevenueRows] = useState<PlatformRevenue[]>([]);
  const [sortField, setSortField] = useState<keyof PlatformRevenue>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  async function fetchRevenueData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_revenue')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching platform revenue:', error);
      } else {
        setRevenueRows(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching platform revenue:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (field: keyof PlatformRevenue) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRows = [...revenueRows].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal as string) 
        : (bVal as string).localeCompare(aVal);
    } else {
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  // Derived summaries
  const completedRows = revenueRows.filter(r => r.status === 'completed');
  const totalRevenue = completedRows.reduce((sum, r) => sum + r.amount_usd, 0);
  const paidTournamentsCount = completedRows.length;
  const averageCut = paidTournamentsCount > 0 ? totalRevenue / paidTournamentsCount : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 animate-pulse">
          Decrypting revenue logs...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-350">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-slate-900/40 border border-emerald-500/15 relative overflow-hidden group hover:border-emerald-500/25 transition-all">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Coins className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Platform Revenue</span>
          <p className="text-3xl font-black text-emerald-400 italic tracking-tighter mt-2">{formatUSD(totalRevenue)}</p>
          <span className="text-[9px] text-emerald-500/70 font-semibold uppercase tracking-wider mt-1 block">Live held & settled cuts</span>
        </div>

        <div className="card p-6 bg-slate-900/40 border border-blue-500/15 relative overflow-hidden group hover:border-blue-500/25 transition-all">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Settled Tournaments</span>
          <p className="text-3xl font-black text-slate-100 italic tracking-tighter mt-2">{paidTournamentsCount}</p>
          <span className="text-[9px] text-blue-400/70 font-semibold uppercase tracking-wider mt-1 block">Events with completed payouts</span>
        </div>

        <div className="card p-6 bg-slate-900/40 border border-purple-500/15 relative overflow-hidden group hover:border-purple-500/25 transition-all">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Average Platform Cut</span>
          <p className="text-3xl font-black text-purple-400 italic tracking-tighter mt-2">{formatUSD(averageCut)}</p>
          <span className="text-[9px] text-purple-400/70 font-semibold uppercase tracking-wider mt-1 block">Mean revenue per paid event</span>
        </div>
      </div>

      {/* Main Revenue Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Revenue Auditing Ledger</h3>
          </div>
          <button 
            onClick={fetchRevenueData} 
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-xl transition-all"
            title="Reload revenue spreadsheet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="card overflow-hidden border-white/5 bg-slate-900/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/40 border-b border-slate-800/80">
                <tr>
                  <th className="px-6 py-4">
                    <button 
                      onClick={() => handleSort('tournament_name')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1 hover:text-white"
                    >
                      <span>Tournament</span>
                      <ArrowUpDown className="w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button 
                      onClick={() => handleSort('created_at')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1 hover:text-white"
                    >
                      <span>Payout Date</span>
                      <ArrowUpDown className="w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button 
                      onClick={() => handleSort('gross_escrow_usd')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1 hover:text-white"
                    >
                      <span>Gross Pot</span>
                      <ArrowUpDown className="w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button 
                      onClick={() => handleSort('fee_percent')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1 hover:text-white"
                    >
                      <span>Fee %</span>
                      <ArrowUpDown className="w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button 
                      onClick={() => handleSort('amount_usd')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1 hover:text-white"
                    >
                      <span>Platform Income</span>
                      <ArrowUpDown className="w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300 font-medium whitespace-nowrap">
                {sortedRows.length > 0 ? (
                  sortedRows.map((row) => (
                    <tr key={row.id} className="group hover:bg-white/5 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                            {row.tournament_name || 'Legacy Tournament'}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono">ID: {row.tournament_id?.substring(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {new Date(row.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-bold font-mono">
                        {formatUSD(row.gross_escrow_usd)}
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-slate-400">
                        {formatPercent(row.fee_percent)}
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-extrabold font-mono">
                        {formatUSD(row.amount_usd)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                          row.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/admin/tournaments/${row.tournament_id}/manage`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">
                      Zero revenue disbursements logged in the ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
