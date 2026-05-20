import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Calendar, ExternalLink, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserChampionHistory } from '../../types/champion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface TrophyWallProps {
  userId: string;
}

const currencySymbols: Record<string, string> = {
  USD: '$', KES: 'KSh', NGN: '₦', GHS: '₵', UGX: 'USh', ZAR: 'R'
};

export default function TrophyWall({ userId }: TrophyWallProps) {
  const [history, setHistory] = useState<UserChampionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await (supabase as any).rpc('get_user_champion_history', { p_user_id: userId });
        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error('Error fetching trophy wall:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [userId]);

  const totalEarnings = history.reduce((sum, item) => sum + (item.winner_prize_amount || 0), 0);
  const currency = history[0]?.prize_currency || 'USD';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
        <Trophy className="w-12 h-12 text-slate-700 mb-4" />
        <h3 className="text-xl font-display uppercase text-slate-500">No trophies yet</h3>
        <p className="text-slate-600 font-mono text-xs mt-2">Win your first tournament to start your wall</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Total Championships</div>
            <div className="text-3xl font-display text-slate-100">{history.length}</div>
          </div>
        </div>

        {totalEarnings > 0 && (
          <div className="flex items-center gap-4 border-l border-slate-800 sm:pl-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Career Winnings</div>
              <div className="text-3xl font-display text-emerald-400">
                {currencySymbols[currency]}{totalEarnings.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trophy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((trophy, index) => (
          <motion.div
            key={trophy.tournament_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative flex flex-col p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 hover:border-primary/50 transition-all hover:bg-slate-800/40"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
                trophy.champion_title === 'Legendary Champion' ? 'bg-yellow-500/10 text-yellow-500' :
                trophy.champion_title === 'Pro Champion' ? 'bg-blue-500/10 text-blue-500' :
                'bg-emerald-500/10 text-emerald-500'
              )}>
                {trophy.winner_badge_id ? (
                   <span className="text-xl">{trophy.winner_badge_id === 'gold' ? '🏆' : '⭐'}</span>
                ) : <Award className="w-5 h-5" />}
              </div>
              <Link 
                to={`/tournaments/${trophy.tournament_id}/champion`}
                className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-primary transition-colors"
                title="View Champion Page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-display uppercase tracking-tight text-slate-200 line-clamp-1 mb-1">
                {trophy.tournament_name}
              </h4>
              <p className={cn(
                "font-mono text-[10px] uppercase tracking-wider mb-3",
                trophy.champion_title === 'Legendary Champion' ? 'text-yellow-500' :
                trophy.champion_title === 'Pro Champion' ? 'text-blue-500' :
                'text-emerald-500'
              )}>
                {trophy.champion_title}
              </p>
              
              <div className="flex items-center gap-4 text-slate-500 font-mono text-[9px] uppercase">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(trophy.completed_at), 'MMM d, yyyy')}
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {trophy.tournament_type}
                </div>
              </div>
            </div>

            {trophy.is_paid && trophy.winner_prize_amount > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Prize Earned</span>
                <span className="text-emerald-400 font-display text-lg">
                  {currencySymbols[trophy.prize_currency]}{trophy.winner_prize_amount.toLocaleString()}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
