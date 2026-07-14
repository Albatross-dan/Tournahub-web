import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { tournamentService } from '../../services/tournamentService';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { PlayerBadge } from '../ui/PlayerBadge';
import KnockoutTree from '../fixtures/KnockoutTree';
import DownloadShareAction, { DownloadHeader, DownloadFooter } from '../common/DownloadShareAction';
import { Trophy } from 'lucide-react';

interface StandingsTableProps {
  tournamentId: string;
  groupName?: string;
  registrations?: any[];
  tournamentType?: string;
}

export default function StandingsTable({ tournamentId, groupName, registrations, tournamentType }: StandingsTableProps) {
  const [standings, setStandings] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshCount } = useMatchCompletionSync(tournamentId);

  useEffect(() => {
    fetchStandings();

    // Realtime subscription for badges
    const badgeChannel = supabase
      .channel(`badges-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(badgeChannel);
    };
  }, [tournamentId, groupName, refreshCount, registrations]);

  async function fetchStandings() {
    try {
      setLoading(true);
      const [data, tournamentData] = await Promise.all([
        tournamentService.getLeaderboard(tournamentId),
        tournamentService.getById(tournamentId).catch(() => null)
      ]);
      setTournament(tournamentData);
      const rawStandings = Array.isArray(data) ? data : [];
      
      // Strict deduplication of backend data
      const seenUsernames = new Set<string>();
      let standingsArray = rawStandings.filter(row => {
        const username = row.username;
        if (!username || seenUsernames.has(username)) return false;
        seenUsernames.add(username);
        return true;
      });
      
      // If we have registrations, ensure everyone registered is in the leaderboard
      if (registrations && registrations.length > 0) {
        registrations.forEach(reg => {
          const username = reg.username || reg.profiles?.username || 'Anonymous';
          if (!seenUsernames.has(username)) {
            seenUsernames.add(username); // Add to set to prevent double addition
            // Add skeleton row for registered player with no stats yet
            standingsArray.push({
              id: username, // Use username as ID/key
              username: username,
              badge_id: reg.badge_id,
              played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goals_for: 0,
              goals_against: 0,
              goal_difference: 0,
              points: 0,
              rank: null
            });
          }
        });
      }

      // Re-sort standings by points then GD if we added new players
      standingsArray.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goal_difference - a.goal_difference;
      });

      // Update ranks
      standingsArray = standingsArray.map((row, idx) => ({
        ...row,
        rank: idx + 1
      }));

      // If groupName is provided, filter the results
      const filteredData = groupName 
        ? standingsArray.filter((row: any) => row.group_name === groupName)
        : standingsArray;

      setStandings(filteredData);
    } catch (err: any) {
      console.error('Error fetching standings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (tournamentType === 'knockout') {
    return <KnockoutTree tournamentId={tournamentId} />;
  }

  if (loading) {
    return (
      <div className="card p-12 bg-surface/50 border-border-main">
        <LoadingState message="Aggregating Stats..." />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {standings.length > 0 && (
        <div className="flex justify-end">
          <DownloadShareAction
            elementId="standings-capture-container"
            tournamentName={tournament?.name || "Tournament"}
            fileName={`${tournament?.name || 'tournament'}_standings`}
            title="Tournament Leaderboard Standings"
          />
        </div>
      )}

      <motion.div 
        id="standings-capture-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden bg-surface border-border-main shadow-sm animate-fade-in"
      >
        <DownloadHeader tournamentName={tournament?.name || "Tournament"} title="Tournament Leaderboard Standings" />
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-background border-b border-border-main">
              <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-3 md:px-6 py-4">Rank</th>
                <th className="px-3 md:px-6 py-4">Player</th>
                <th className="px-3 md:px-6 py-4 text-center">P</th>
                <th className="px-3 md:px-6 py-4 text-center">W</th>
                <th className="px-3 md:px-6 py-4 text-center">D</th>
                <th className="px-3 md:px-6 py-4 text-center">L</th>
                <th className="px-3 md:px-6 py-4 text-center">GF</th>
                <th className="px-3 md:px-6 py-4 text-center">GA</th>
                <th className="px-3 md:px-6 py-4 text-center">GD</th>
                <th className="px-3 md:px-6 py-4 text-center text-primary">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {standings.map((row, index) => {
                const settings = Array.isArray((tournament as any)?.tournament_settings) 
                  ? (tournament as any)?.tournament_settings[0] 
                  : (tournament as any)?.tournament_settings;
                const clDirect = settings?.cl_direct_qualify_count || 8;
                const clPlayoff = settings?.cl_playoff_zone_count || 16;

                const isClDirect = tournamentType === 'champions_league' && index < clDirect;
                const isClPlayoff = tournamentType === 'champions_league' && index >= clDirect && index < clDirect + clPlayoff;
                const isQualified = tournamentType !== 'champions_league' ? index < 2 : false;

                return (
                  <tr 
                    key={row.username || row.id || `std-idx-${index}`} 
                    className={cn(
                      "text-sm transition-colors hover:bg-surface-hover",
                      isQualified && "bg-emerald-500/5",
                      isClDirect && "bg-emerald-500/10 border-l-4 border-emerald-500",
                      isClPlayoff && "bg-purple-500/10 border-l-4 border-purple-500"
                    )}
                  >
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "font-black italic px-2 py-1 rounded",
                          isClDirect ? "text-emerald-400 bg-emerald-500/20" :
                          isClPlayoff ? "text-purple-400 bg-purple-500/20" :
                          (row.rank || index + 1) <= 2 ? "text-emerald-500 bg-emerald-500/10" : "text-text-muted"
                        )}>
                          #{row.rank || index + 1}
                        </span>
                        {isClDirect && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 tracking-tighter">R16</span>
                        )}
                        {isClPlayoff && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500 text-slate-950 tracking-tighter">Playoff</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <PlayerBadge 
                            badgeId={row.badge_id} 
                            username={row.username} 
                            size="sm" 
                          />
                          <span className="font-bold text-text-main uppercase italic tracking-tight truncate max-w-[120px] sm:max-w-none">
                            {row.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted">{row.played}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted">{row.wins}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted">{row.draws}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted">{row.losses}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted/60">{row.goals_for}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-muted/60">{row.goals_against}</td>
                    <td className="px-3 md:px-6 py-4 text-center font-bold text-text-main italic">{row.goal_difference}</td>
                    <td className="px-3 md:px-6 py-4 text-center text-text-main font-black italic">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {standings.length === 0 && (
            <div className="p-12 text-center text-text-muted italic">
              Standings will update as matches are completed.
            </div>
          )}
        </div>
        <DownloadFooter />
      </motion.div>

      {tournamentType === 'champions_league' && (
        <div className="mt-8 pt-8 border-t border-border-main space-y-4">
          <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Champions League Playoff & Knockout Stage
          </h3>
          <KnockoutTree tournamentId={tournamentId} hideIfEmpty={true} />
        </div>
      )}
    </div>
  );
}
