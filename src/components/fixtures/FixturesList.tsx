import React, { useState, useEffect, useRef } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, formatFixtureTime, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { PlayerBadge } from '../ui/PlayerBadge';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { Calendar, Trophy, Share2, Grid, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface FixturesListProps {
  tournamentId: string;
}

export default function FixturesList({ tournamentId }: FixturesListProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useMatchCompletionSync(tournamentId);

  useEffect(() => {
    fetchMatchesAndTournament();

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
          fetchMatchesAndTournament();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshCount]);

  async function fetchMatchesAndTournament() {
    try {
      const [matchesData, tournamentData] = await Promise.all([
        tournamentService.getFixturesWithBadges(tournamentId),
        tournamentService.getById(tournamentId),
      ]);
      const rawMatches = matchesData || [];
      const seenIds = new Set();
      const uniqueMatches = [];
      for (const m of rawMatches) {
        if (!m) continue;
        const mId = m.match_id || m.id;
        if (mId) {
          if (!seenIds.has(mId)) {
            seenIds.add(mId);
            uniqueMatches.push(m);
          }
        } else {
          uniqueMatches.push(m);
        }
      }
      setMatches(uniqueMatches);
      setTournament(tournamentData);
    } catch (err) {
      console.error('Error fetching matches or tournament:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-12 bg-surface border-border-main text-center shadow-sm">
        <LoadingState message="Mapping Brackets..." />
      </div>
    );
  }

  const isKnockout = tournament?.type === 'knockout';

  // Group matches by stage and round
  const groupedMatches = matches.reduce((acc: any, match) => {
    const stage = match.stage || 'knockout';
    if (!acc[stage]) acc[stage] = {};
    
    let roundLabel = 'General';
    if (match.round) {
      const isPlayoffs = stage === 'playoffs' || stage === 'playoff' || stage === 'play_off';
      if (isPlayoffs) {
        const rNum = Number(match.round);
        if (rNum === 1) roundLabel = 'Quarter Final';
        else if (rNum === 2) roundLabel = 'Semi Final';
        else if (rNum === 3) roundLabel = 'Final';
        else roundLabel = `Round ${match.round}`;
      } else {
        roundLabel = `Round ${match.round}`;
      }
    }

    if (!acc[stage][roundLabel]) acc[stage][roundLabel] = [];
    acc[stage][roundLabel].push(match);
    return acc;
  }, {});

  const dataStages = Object.keys(groupedMatches);
  const stagesInOrderPredefined = ['group', 'group_stage', 'league', 'knockout', 'main', 'quarterfinal', 'semifinal', 'final'];
  
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
            <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter border-l-4 border-primary pl-4">
              {stage.replace('_', ' ')} Stage
            </h3>
            
            {Object.entries(groupedMatches[stage]).map(([roundLabel, roundMatches]: [string, any]) => (
              <div key={roundLabel} className="space-y-4">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-5 mb-2">
                  {roundLabel}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roundMatches.map((match: any, idx: number) => (
                    <motion.div
                      key={`${match.match_id || match.id || idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="card p-5 bg-surface border-border-main hover:border-primary/30 transition-all group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          match.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                        )}>
                          {match.status}
                        </span>
                        <div className="flex items-center text-text-muted space-x-2">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">
                            {match.scheduled_date && match.scheduled_time 
                              ? formatFixtureTime(match.scheduled_date, match.scheduled_time, match.timezone)
                              : (match.scheduled_at ? formatDate(match.scheduled_at) : 'Time TBD')}
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
                          <div className="text-[8px] md:text-[10px] font-black text-text-muted opacity-40 bg-background px-2 py-0.5 md:py-1 rounded-full italic">VS</div>
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
        <div className="py-20 text-center text-text-muted italic border-2 border-dashed border-border-main rounded-3xl">
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
          isWinner ? "border-primary shadow-lg shadow-primary/20" : "border-border-main"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn(
          "font-black text-[9px] md:text-xs uppercase italic tracking-tighter truncate leading-tight",
          isWinner ? "text-primary" : "text-text-muted"
        )}>
          {getPublicIdentity(username) || 'TBD'}
        </p>
        {(score !== null && score !== undefined) ? (
          <p className="text-xl md:text-3xl font-black text-text-main italic tracking-tighter leading-none mt-1">
            {score}
          </p>
        ) : (
          <div className="h-4 md:h-6" />
        )}
      </div>
    </div>
  );
}
