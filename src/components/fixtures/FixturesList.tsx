import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { getStorageUrl, getPublicIdentity } from '../../lib/utils';
import { Users, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { useTournamentBadges } from '../../hooks/useTournamentBadges';

interface FixturesListProps {
  tournamentId: string;
}

export default function FixturesList({ tournamentId }: FixturesListProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { badges } = useTournamentBadges(tournamentId);

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  async function fetchMatches() {
    try {
      const data = await matchService.getByTournament(tournamentId);
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

                      <div className="flex items-center justify-between">
                        <PlayerCard 
                          profile={match.player1} 
                          isWinner={match.winner === (match.player1?.id || match.player1)} 
                          score={match.score1}
                          align="left"
                          badgeUrl={badges[match.player1?.id || match.player1]}
                        />
                        <div className="px-4">
                          <div className="text-[10px] font-black text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded">VS</div>
                        </div>
                        <PlayerCard 
                          profile={match.player2} 
                          isWinner={match.winner === (match.player2?.id || match.player2)} 
                          score={match.score2}
                          align="right"
                          badgeUrl={badges[match.player2?.id || match.player2]}
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

function PlayerCard({ profile, isWinner, score, align, badgeUrl }: { profile: any, isWinner: boolean, score: number | null, align: 'left' | 'right', badgeUrl?: string }) {
  const isLeft = align === 'left';
  const hasProfileObject = profile && typeof profile === 'object';
  const username = getPublicIdentity(profile);
  const avatarUrl = hasProfileObject ? profile.avatar_url : null;
  
  return (
    <div className={cn("flex items-center space-x-3 flex-1", !isLeft && "flex-row-reverse space-x-reverse text-right")}>
      <div className={cn(
        "w-12 h-12 rounded-xl bg-zinc-800 border-2 transition-colors flex flex-shrink-0 items-center justify-center overflow-hidden shadow-inner",
        isWinner ? "border-primary" : "border-zinc-700"
      )}>
        {badgeUrl ? (
          <img 
            src={getStorageUrl('team-badges', badgeUrl) || ''} 
            className="w-full h-full object-contain p-1.5" 
            referrerPolicy="no-referrer"
          />
        ) : avatarUrl ? (
          <img 
            src={getStorageUrl('avatars', avatarUrl) || ''} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <Users className="w-5 h-5 text-zinc-600" />
        )}
      </div>
      <div className="min-w-0">
        <p className={cn(
          "font-bold text-sm uppercase italic tracking-tight truncate pb-1",
          isWinner ? "text-primary" : "text-white"
        )}>
          {username}
        </p>
        {(score !== null && score !== undefined) && (
          <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
            {score}
          </p>
        )}
      </div>
    </div>
  );
}
