import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowUpRight, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RecentChampionFeedItem } from '../../types/champion';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

export default function RecentChampions() {
  const [champions, setChampions] = useState<RecentChampionFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const { data, error } = await (supabase as any).rpc('get_recent_champions_feed', { p_limit: 10 });
        if (error) throw error;
        setChampions(data || []);
      } catch (err) {
        console.error('Error fetching recent champions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  if (loading || champions.length === 0) return null;

  return (
    <div className="w-full py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-display uppercase tracking-tight">Hall of Fame</h2>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em]">Latest Winner Activity</p>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto pb-8 px-6 no-scrollbar scroll-smooth">
          {champions.map((champion, index) => (
            <motion.div
              key={champion.tournament_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0"
            >
              <Link 
                to={`/tournaments/${champion.tournament_id}/champion`}
                className="block relative w-72 p-6 rounded-[2rem] bg-slate-900/40 border border-slate-800 backdrop-blur-sm group/card hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-800 bg-slate-900 group-hover/card:border-primary/50 transition-colors">
                      {champion.winner_avatar_url ? (
                        <img src={champion.winner_avatar_url} alt={champion.winner_username || 'Winner'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-display text-slate-500">
                          {(champion.winner_username || 'W').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-display text-lg uppercase tracking-tight text-slate-100">{champion.winner_username}</div>
                      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-tighter">New Champion</div>
                    </div>
                  </div>
                  <Trophy className={cn(
                    "w-5 h-5",
                    champion.champion_title === 'Legendary Champion' ? 'text-yellow-500' :
                    champion.champion_title === 'Pro Champion' ? 'text-blue-500' :
                    'text-emerald-500'
                  )} />
                </div>

                <div className="space-y-1">
                   <div className="font-display text-xl uppercase tracking-tight line-clamp-1 group-hover/card:text-primary transition-colors">
                    {champion.tournament_name}
                  </div>
                  <div className={cn(
                    "font-mono text-[10px] uppercase tracking-widest",
                    champion.champion_title === 'Legendary Champion' ? 'text-yellow-500' :
                    champion.champion_title === 'Pro Champion' ? 'text-blue-500' :
                    'text-emerald-500'
                  )}>
                    {champion.champion_title}
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        {/* Shadow Overlays for smooth scroll feel */}
        <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
