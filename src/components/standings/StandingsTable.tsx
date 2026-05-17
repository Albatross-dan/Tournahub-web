import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { tournamentService } from '../../services/tournamentService';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { PlayerBadge } from '../ui/PlayerBadge';

interface StandingsTableProps {
  tournamentId: string;
  groupName?: string;
  registrations?: any[];
}

export default function StandingsTable({ tournamentId, groupName, registrations }: StandingsTableProps) {
  const [standings, setStandings] = useState<any[]>([]);
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
      const data = await tournamentService.getLeaderboard(tournamentId);
      const rawStandings = Array.isArray(data) ? data : [];
      
      // Strict deduplication of backend data
      const getPlayerId = (p: any) => p.user_id || p.id;
      const seenIds = new Set<string>();
      let standingsArray = rawStandings.filter(row => {
        const id = getPlayerId(row);
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
      
      // If we have registrations, ensure everyone registered is in the leaderboard
      if (registrations && registrations.length > 0) {
        registrations.forEach(reg => {
          const userId = getPlayerId(reg);
          if (userId && !seenIds.has(userId)) {
            seenIds.add(userId); // Add to set to prevent double addition
            // Add skeleton row for registered player with no stats yet
            standingsArray.push({
              id: userId, // Ensure we have id for the key
              user_id: userId,
              username: reg.username || reg.profiles?.username || 'Anonymous',
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

  if (loading) {
    return (
      <div className="card p-12 bg-zinc-900/50 border-zinc-800">
        <LoadingState message="Aggregating Stats..." />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">{error}</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden bg-zinc-900 border-zinc-800"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-black/50 border-b border-zinc-800">
            <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <th className="px-3 md:px-6 py-4">Rank</th>
              <th className="px-3 md:px-6 py-4">Player</th>
              <th className="px-3 md:px-6 py-4 text-center">P</th>
              <th className="px-3 md:px-6 py-4 text-center">W</th>
              <th className="px-3 md:px-6 py-4 text-center hidden sm:table-cell">D</th>
              <th className="px-3 md:px-6 py-4 text-center hidden sm:table-cell">L</th>
              <th className="px-3 md:px-6 py-4 text-center hidden md:table-cell">GF</th>
              <th className="px-3 md:px-6 py-4 text-center hidden md:table-cell">GA</th>
              <th className="px-3 md:px-6 py-4 text-center">GD</th>
              <th className="px-3 md:px-6 py-4 text-center text-primary">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {standings.map((row, index) => {
              const isQualified = index < 2; // Highlight top 2
              return (
                <tr 
                  key={row.user_id || row.id || `std-idx-${index}`} 
                  className={cn(
                    "text-sm transition-colors hover:bg-zinc-800/30",
                    isQualified && "bg-emerald-500/5"
                  )}
                >
                  <td className="px-3 md:px-6 py-4">
                    <span className={cn(
                      "font-black italic px-2 py-1 rounded",
                      (row.rank || index + 1) <= 2 ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500"
                    )}>
                      #{row.rank || index + 1}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <PlayerBadge 
                          badgeId={row.badge_id} 
                          username={row.username} 
                          size="sm" 
                        />
                        <span className="font-bold text-white uppercase italic tracking-tight truncate max-w-[80px] sm:max-w-none">
                          {row.username}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-400">{row.played}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-400">{row.wins}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-400 hidden sm:table-cell">{row.draws}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-400 hidden sm:table-cell">{row.losses}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-500 hidden md:table-cell">{row.goals_for}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-zinc-500 hidden md:table-cell">{row.goals_against}</td>
                  <td className="px-3 md:px-6 py-4 text-center font-bold text-zinc-300 italic">{row.goal_difference}</td>
                  <td className="px-3 md:px-6 py-4 text-center text-white font-black italic">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {standings.length === 0 && (
          <div className="p-12 text-center text-zinc-500 italic">
            Standings will update as matches are completed.
          </div>
        )}
      </div>
    </motion.div>
  );
}
