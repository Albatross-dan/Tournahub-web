import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users } from 'lucide-react';
import { motion } from 'motion/react';
import { getStorageUrl, getPublicIdentity, cn } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { useTournamentBadges } from '../../hooks/useTournamentBadges';

interface StandingsTableProps {
  tournamentId: string;
  groupName?: string;
}

export default function StandingsTable({ tournamentId, groupName }: StandingsTableProps) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { badges } = useTournamentBadges(tournamentId);

  useEffect(() => {
    fetchStandings();

    // Realtime subscription
    const channel = supabase
      .channel(`standings-${tournamentId}-${groupName || 'all'}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'standings',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, groupName]);

  async function fetchStandings() {
    try {
      // Try with direct profile join first
      const { data, error } = await (supabase as any)
        .from('standings')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('points', { ascending: false })
        .order('goal_difference', { ascending: false })
        .order('goals_for', { ascending: false });

      if (error) {
        // Fallback: fetch simple standings and then profiles
        const { data: simpleData, error: simpleError } = await (supabase as any)
          .from('standings')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('points', { ascending: false })
          .order('goal_difference', { ascending: false });
        
        if (simpleError) {
          // Try fetching from league_standings if standings table fails
          const { data: leagueData, error: leagueError } = await (supabase as any)
            .from('league_standings')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('points', { ascending: false });
          
          if (leagueError) throw leagueError;
          setStandings(leagueData || []);
        } else if (simpleData && simpleData.length > 0) {
          // If we got standings but no profiles, fetch profiles for these users
          const userIds = (simpleData as any[]).map(s => s.user_id).filter(Boolean);
          if (userIds.length > 0) {
            const { data: profileData } = await (supabase as any)
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);
            
            const profileMap = (profileData || []).reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});

            setStandings((simpleData as any[]).map(s => ({
              ...s,
              profiles: profileMap[s.user_id]
            })));
          } else {
            setStandings(simpleData);
          }
        } else {
          setStandings([]);
        }
      } else {
        setStandings(data || []);
      }
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
                  key={row.id ? `std-${row.id}` : `std-idx-${index}`} 
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
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                          {badges[row.user_id || row.profiles?.id] ? (
                            <img 
                              src={getStorageUrl('team-badges', badges[row.user_id || row.profiles?.id]) || ''} 
                              className="w-full h-full object-contain p-1" 
                              alt="badge"
                              referrerPolicy="no-referrer"
                            />
                          ) : row.profiles?.avatar_url ? (
                            <img 
                              src={getStorageUrl('avatars', row.profiles.avatar_url) || ''} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                        <span className="font-bold text-white uppercase italic tracking-tight truncate max-w-[80px] sm:max-w-none">
                          {getPublicIdentity(row.profiles)}
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
