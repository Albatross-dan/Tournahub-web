import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Check, Clock, RefreshCw, Layers, Award, ShieldAlert, AlertTriangle, Users
} from 'lucide-react';
import { getStorageUrl } from '../../lib/utils';

interface Tournament {
  id: string;
  name: string;
  payout_status: 'none' | 'processing' | 'completed' | 'failed';
  entry_fee: number;
}

interface TournamentLeaderboardProps {
  tournament: Tournament;
}

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

export default function TournamentLeaderboardComponent({ tournament }: TournamentLeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [leaderboardRes, setLeaderboardRes] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [tournament.id, tournament.payout_status]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_tournament_leaderboard_with_prizes', {
        p_tournament_id: tournament.id
      });
      if (error) {
        console.error('Leaderboard fetch RPC error:', error);
      } else {
        setLeaderboardRes(data);
      }
    } catch (err) {
      console.error('Unexpected leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  const isPaid = (tournament.entry_fee || 0) > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest animate-pulse">
          Decrypting leaderboard matrix...
        </span>
      </div>
    );
  }

  const leaderboardList = leaderboardRes?.leaderboard || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Table Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Leaderboard Ledger</h3>
        </div>
        <button 
          onClick={fetchLeaderboard}
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white rounded-xl transition-all"
          title="Recalculate leaderboard positions"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="card overflow-hidden border-white/5 bg-slate-900/20 rounded-[2rem]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/40 border-b border-white/[0.03]">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">Rank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Overall Record (P/W/D/L)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Goal Diff</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Points</th>
                {isPaid && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Prize Ledger</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300 font-medium whitespace-nowrap">
              {leaderboardList.length > 0 ? (
                leaderboardList.map((row: any, index: number) => {
                  const hasPaidOut = tournament.payout_status === 'completed';
                  const prizeAmount = hasPaidOut ? row.prize_amount_usd : row.projected_prize_usd;
                  const isPrizeActive = prizeAmount !== null && prizeAmount > 0;

                  return (
                    <tr key={index} className="group hover:bg-white/5 transition-all">
                      {/* Rank Column */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black italic shadow-md ${
                          row.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
                          row.rank === 2 ? 'bg-slate-300/10 border border-slate-305/30 text-slate-300' :
                          row.rank === 3 ? 'bg-amber-700/15 border border-amber-705/30 text-amber-600' :
                          'bg-slate-950 border border-slate-800 text-slate-500'
                        }`}>
                          {row.rank}
                        </span>
                      </td>

                      {/* Player Profile with Badges */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3.5">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                              {row.avatar_url ? (
                                <img src={row.avatar_url} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-extrabold text-primary text-md">{(row.username || 'P')[0].toUpperCase()}</span>
                              )}
                            </div>
                            {row.badge_id && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded bg-slate-950 border border-slate-800 p-0.5 flex items-center justify-center">
                                <img 
                                  src={getStorageUrl('team-badges', row.badge_id)} 
                                  className="w-full h-full object-contain" 
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white uppercase italic tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {row.username}
                              {row.group_name && (
                                <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-850">
                                  {row.group_name}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stats Record */}
                      <td className="px-6 py-4 font-mono text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-white">{row.played ?? 0}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-emerald-400 font-bold">{row.wins ?? 0}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-500">{row.draws ?? 0}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-red-400 font-bold">{row.losses ?? 0}</span>
                        </div>
                      </td>

                      {/* Goal Difference */}
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-450">
                        <span className={row.goal_difference > 0 ? 'text-emerald-400' : row.goal_difference < 0 ? 'text-red-400' : 'text-slate-500'}>
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-md font-black text-white italic tracking-tighter font-mono">{row.points ?? 0}</span>
                      </td>

                      {/* Paid/Projected dynamic column */}
                      {isPaid && (
                        <td className="px-6 py-4 text-right">
                          {isPrizeActive ? (
                            <div className="flex flex-col items-end">
                              <span className={`font-black font-mono flex items-center space-x-1 ${
                                hasPaidOut ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {hasPaidOut ? (
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                )}
                                {formatUSD(prizeAmount)}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">
                                {hasPaidOut ? 'Distributed' : 'Projected Allocation'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isPaid ? 6 : 5} className="py-20 text-center text-slate-600 font-black uppercase tracking-widest italic text-xs">
                    Tournament fixtures need resolution to manifest results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
