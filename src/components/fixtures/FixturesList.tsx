import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { motion } from 'motion/react';
import { cn, formatDate } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { PlayerBadge } from '../ui/PlayerBadge';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FixturesListProps {
  tournamentId: string;
}

export default function FixturesList({ tournamentId }: FixturesListProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useMatchCompletionSync(tournamentId);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`fixtures-badges-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshCount]);

  async function fetchMatches() {
    try {
      const data = await tournamentService.getFixturesWithBadges(tournamentId);
      setMatches(data || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-12 bg-zinc-900/50 border-zinc-800 text-center">
        <LoadingState message="Mapping Brackets..." />
      </div>
    );
  }

  // Group by stage and round
  const groupedMatches = matches.reduce((acc: any, match) => {
    const stage = match.stage || 'knockout';
    if (!acc[stage]) acc[stage] = {};
    const roundLabel = match.round ? `Round ${match.round}` : 'General';
    if (!acc[stage][roundLabel]) acc[stage][roundLabel] = [];
    acc[stage][roundLabel].push(match);
    return acc;
  }, {});

  // Get all unique stages from the data to ensure we show everything
  const dataStages = Object.keys(groupedMatches);
  const stagesInOrderPredefined = ['league', 'knockout', 'main', 'quarterfinal', 'semifinal', 'final'];
  
  // Combine predefined order with any other stages found in data
  const stagesInOrder = [
    ...stagesInOrderPredefined.filter(s => dataStages.includes(s)),
    ...dataStages.filter(s => !stagesInOrderPredefined.includes(s))
  ];

  return (
    <div className="space-y-12">
      {stagesInOrder.map(stage => {
        if (!groupedMatches[stage]) return null;
        return (
          <div key={stage} className="space-y-6">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter border-l-4 border-primary pl-4">
              {stage.replace('_', ' ')} Stage
            </h3>
            
            {Object.entries(groupedMatches[stage]).map(([roundLabel, roundMatches]: [string, any]) => (
              <div key={roundLabel} className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-5 mb-2">
                  {roundLabel}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roundMatches.map((match: any, idx: number) => (
                    <motion.div
                      key={`${match.id}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="card p-5 bg-zinc-900 border-zinc-800 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          match.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                        )}>
                          {match.status}
                        </span>
                        <div className="flex items-center text-zinc-500 space-x-2">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">
                            {match.scheduled_at ? formatDate(match.scheduled_at) : 'TBD'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4 overflow-hidden">
                        <PlayerCard 
                          username={match.player1_username} 
                          badgeId={match.player1_badge_id}
                          score={match.score1}
                          align="left"
                          isWinner={match.status === 'completed' && match.score1 > match.score2}
                        />
                        <div className="shrink-0 flex flex-col items-center justify-center px-1">
                          <div className="text-[8px] md:text-[10px] font-black text-zinc-600 bg-zinc-800/50 px-2 py-0.5 md:py-1 rounded-full italic">VS</div>
                        </div>
                        <PlayerCard 
                          username={match.player2_username} 
                          badgeId={match.player2_badge_id} 
                          score={match.score2}
                          align="right"
                          isWinner={match.status === 'completed' && match.score2 > match.score1}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {matches.length === 0 && (
        <div className="py-20 text-center text-zinc-600 italic border-2 border-dashed border-zinc-800 rounded-3xl">
          No fixtures scheduled yet for this tournament.
        </div>
      )}
    </div>
  );
}

function PlayerCard({ 
  username, 
  badgeId, 
  score, 
  align, 
  isWinner 
}: { 
  username: string | null; 
  badgeId: string | null; 
  score: number | null; 
  align: 'left' | 'right'; 
  isWinner?: boolean;
}) {
  const isLeft = align === 'left';
  
  return (
    <div className={cn(
      "flex items-center gap-2 md:gap-3 min-w-0", 
      !isLeft && "flex-row-reverse text-right"
    )}>
      <PlayerBadge 
        badgeId={badgeId} 
        username={username || 'TBD'} 
        size="md"
        className={cn(
          "w-10 h-10 md:w-14 md:h-14 rounded-xl border-2 transition-all",
          isWinner ? "border-primary shadow-lg shadow-primary/20" : "border-zinc-800"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn(
          "font-black text-[9px] md:text-xs uppercase italic tracking-tighter truncate leading-tight",
          isWinner ? "text-primary" : "text-zinc-400"
        )}>
          {username || 'TBD'}
        </p>
        {(score !== null && score !== undefined) ? (
          <p className="text-xl md:text-3xl font-black text-white italic tracking-tighter leading-none mt-1">
            {score}
          </p>
        ) : (
          <div className="h-4 md:h-6" />
        )}
      </div>
    </div>
  );
}
