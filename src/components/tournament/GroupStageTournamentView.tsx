import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, Calendar, Users, Award, 
  ArrowRight, Shield, Check, AlignLeft, RefreshCw, Info, Lock
} from 'lucide-react';
import { PlayerBadge } from '../ui/PlayerBadge';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface GroupStageTournamentViewProps {
  tournamentId: string;
}

interface Group {
  id: string;
  group_name: string;
}

interface Standing {
  player_id: string;
  group_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  group_rank: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
  tournament_badge_selections?: {
    badge_id: string;
  }[] | {
    badge_id: string;
  } | null;
}

interface GroupMatch {
  id: string;
  group_name: string;
  round: number;
  match_order: number;
  player1: string;
  player2: string;
  score1: number | null;
  score2: number | null;
  winner: string | null;
  status: string;
  scheduled_at: string | null;
  locked: boolean;
  p1: {
    username: string;
    avatar_url: string | null;
  } | null;
  p2: {
    username: string;
    avatar_url: string | null;
  } | null;
  fixtures: {
    scheduled_date: string | null;
    scheduled_time: string | null;
    timezone: string | null;
    location: string | null;
    notes: string | null;
  } | null;
}

export default function GroupStageTournamentView({ tournamentId }: GroupStageTournamentViewProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [bracketMatches, setBracketMatches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroupTab, setActiveGroupTab] = useState<string>('');
  const [flashedMatches, setFlashedMatches] = useState<Record<string, boolean>>({});

  const matchesRef = useRef<GroupMatch[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();

    // 5. Supabase Realtime Subscriptions
    const standingsChannel = supabase
      .channel(`group-standings-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'standings',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchStandings();
      })
      .subscribe();

    const matchesChannel = supabase
      .channel(`group-matches-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`
      }, (payload) => {
        if (payload.new.stage === 'group_stage') {
          fetchGroupMatches();
        } else {
          fetchBracketMatches();
        }
      })
      .subscribe();

    const tournamentChannel = supabase
      .channel(`group-tournaments-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`
      }, (payload) => {
        if (payload?.new) {
          setTournament(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(standingsChannel);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(tournamentChannel);
    };
  }, [tournamentId]);

  // Flash rows when score updates
  useEffect(() => {
    if (matchesRef.current.length > 0 && groupMatches.length > 0) {
      const newFlashes: Record<string, boolean> = {};
      groupMatches.forEach(m => {
        const prevM = matchesRef.current.find(pm => pm.id === m.id);
        if (prevM) {
          const scoreUpdated = prevM.score1 !== m.score1 || prevM.score2 !== m.score2;
          const statusUpdated = prevM.status !== m.status;
          if (scoreUpdated || statusUpdated) {
            newFlashes[m.id] = true;
            setTimeout(() => {
              setFlashedMatches(prev => ({ ...prev, [m.id]: false }));
            }, 3000);
          }
        }
      });
      if (Object.keys(newFlashes).length > 0) {
        setFlashedMatches(prev => ({ ...prev, ...newFlashes }));
      }
    }
    matchesRef.current = groupMatches;
  }, [groupMatches]);

  // Handle celebratory confetti when completed
  useEffect(() => {
    if (tournament?.status === 'completed' || tournament?.current_stage === 'completed') {
      const duration = 2.5 * 1000;
      const end = Date.now() + duration;

      const interval: any = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [tournament?.status, tournament?.current_stage]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // Load base tournament
      const { data: tData, error: tErr } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tErr) throw tErr;
      setTournament(tData);

      // 3.1 Fetch all groups for a tournament
      const { data: gData, error: gErr } = await supabase
        .from('tournament_groups')
        .select('id, group_name')
        .eq('tournament_id', tournamentId)
        .order('group_name');

      if (gErr) throw gErr;
      const fetchedGroups = (gData as Group[]) || [];
      setGroups(fetchedGroups);

      if (fetchedGroups.length > 0) {
        setActiveGroupTab(fetchedGroups[0].group_name);
      }

      // 3.4 Fetch tournament settings (scoring rules + qualify count)
      const { data: setTData, error: setTErr } = await supabase
        .from('tournament_settings')
        .select(
          'points_win, points_draw, points_loss, ' +
          'qualify_count, group_stage_mode, double_round_robin, tie_breaker_rules'
        )
        .eq('tournament_id', tournamentId)
        .single();

      setSettings(setTData || { qualify_count: 2, points_win: 3, points_draw: 1, points_loss: 0 });

      await Promise.all([
        fetchStandings(),
        fetchGroupMatches(),
        fetchBracketMatches()
      ]);

    } catch (err: any) {
      console.error('Error fetching GS Tournament view data:', err);
      setError(err.message || 'Failed to initialize tournament data dashboard.');
    } finally {
      setLoading(false);
    }
  }

  // 3.2 Fetch standings for ALL groups (join profile + badge selections)
  async function fetchStandings() {
    try {
      const { data: stData, error: stErr } = await supabase
        .from('standings')
        .select(`
          player_id, group_name,
          played, wins, draws, losses,
          goals_for, goals_against, goal_difference,
          points, group_rank,
          profiles:player_id ( username, avatar_url ),
          tournament_badge_selections (
            badge_id
          )
        `)
        .eq('tournament_id', tournamentId)
        .not('group_name', 'is', null)
        .order('group_name', { ascending: true })
        .order('group_rank', { ascending: true, nullsFirst: false });

      if (stErr) throw stErr;

      // Deduplicate standings to prevent RLS duplication issues
      const seenStandingKeys = new Set();
      const uniqueStandings: Standing[] = [];
      for (const st of ((stData as any[]) || [])) {
        if (!st) continue;
        const key = `${st.group_name}-${st.player_id}`;
        if (!seenStandingKeys.has(key)) {
          seenStandingKeys.add(key);
          uniqueStandings.push(st);
        }
      }
      setStandings(uniqueStandings);
    } catch (err) {
      console.error('Error loading standings for GS View:', err);
    }
  }

  // 3.3 Fetch group stage fixtures (all matchdays)
  async function fetchGroupMatches() {
    try {
      const { data: mData, error: mErr } = await supabase
        .from('matches')
        .select(`
          id, group_name, round, match_order,
          player1, player2, score1, score2,
          winner, status, scheduled_at, locked,
          p1:profiles!matches_player1_fkey ( username, avatar_url ),
          p2:profiles!matches_player2_fkey ( username, avatar_url ),
          fixtures ( scheduled_date, scheduled_time, timezone, location, notes )
        `)
        .eq('tournament_id', tournamentId)
        .eq('stage', 'group_stage')
        .order('group_name')
        .order('round')
        .order('match_order');

      if (mErr) throw mErr;

      const seenMatchKeys = new Set();
      const uniqueMatches: GroupMatch[] = [];
      for (const m of ((mData as any[]) || [])) {
        if (!m) continue;
        
        const p1Id = m.player1 || '';
        const p2Id = m.player2 || '';
        const sortedPlayers = [p1Id, p2Id].sort().join('-');
        const matchKey = `${m.stage || 'group_stage'}-${m.round || 1}-${m.group_name || ''}-${sortedPlayers}`;

        if (!seenMatchKeys.has(matchKey)) {
          seenMatchKeys.add(matchKey);
          uniqueMatches.push(m);
        }
      }
      setGroupMatches(uniqueMatches);
    } catch (err) {
      console.error('Error loading group matches for GS View:', err);
    }
  }

  // Fetch bracket matches if playsoffs are active or completed
  async function fetchBracketMatches() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, group_name, round, match_order, stage, bracket_slot,
          player1, player2, score1, score2,
          winner, status, scheduled_at, locked,
          player1_profile:profiles!matches_player1_fkey ( id, username, avatar_url ),
          player2_profile:profiles!matches_player2_fkey ( id, username, avatar_url ),
          winner_profile:profiles!matches_winner_fkey ( id, username, avatar_url )
        `)
        .eq('tournament_id', tournamentId)
        .neq('stage', 'group_stage')
        .order('stage')
        .order('round')
        .order('match_order');

      if (error) throw error;
      setBracketMatches(data || []);
    } catch (err) {
       console.warn('Could not load bracket matches: ', err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-900 rounded-2xl max-w-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-zinc-900 rounded-[2rem]" />
          <div className="lg:col-span-5 h-96 bg-zinc-900 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl text-center space-y-4">
        <Shield className="w-12 h-12 mx-auto animate-bounce text-red-500" />
        <h3 className="font-black italic uppercase tracking-tighter text-lg animate-pulse">System Conflict</h3>
        <p className="text-sm font-semibold max-w-md mx-auto">{error || 'Tournament profile could not be retrieved.'}</p>
        <button onClick={fetchData} className="px-6 py-2.5 bg-red-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-400 transition-colors">
          Retry Aggregation
        </button>
      </div>
    );
  }

  const isCompleted = tournament.status === 'completed' || tournament.current_stage === 'completed';
  const qualifyCount = settings?.qualify_count || 2;
  const showKnockoutBracket = tournament.current_stage === 'playoffs' || tournament.current_stage === 'knockout' || isCompleted || bracketMatches.length > 0;

  // Render a lovely warning if groups have not been generated yet
  if (groups.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-border-main rounded-[2.5rem] bg-surface/30 space-y-4 max-w-xl mx-auto px-6">
        <Users className="w-12 h-12 mx-auto text-primary animate-pulse" />
        <h2 className="text-xl font-black text-text-main italic tracking-tighter uppercase">Waiting For Arena Seeding</h2>
        <p className="text-xs font-semibold text-text-muted leading-relaxed uppercase tracking-wider">
          The tournament groups have not been seeded yet. Once matches are configured by the tournament organizer, fixtures and live group tables will populate here automatically.
        </p>
      </div>
    );
  }

  // Filter current active group context
  const activeGroupStandings = standings
    .filter(s => s.group_name === activeGroupTab)
    .sort((a, b) => {
      const rA = a.group_rank ?? 999;
      const rB = b.group_rank ?? 999;
      if (rA !== rB) return rA - rB;
      // Secondary sort by points if rank is equal or null
      return (b.points ?? 0) - (a.points ?? 0);
    });
  const activeGroupMatches = groupMatches.filter(m => m.group_name === activeGroupTab);

  // Group active group matches by round
  const matchesByRound = activeGroupMatches.reduce<Record<number, GroupMatch[]>>((acc, match) => {
    const r = match.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {});

  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className={cn("space-y-12", isCompleted && "opacity-95")}>
      
      {/* 4.3 Group Selector Tabs */}
      <div className="space-y-6">
        <div className="flex bg-surface/50 p-1.5 rounded-2xl border border-white/5 space-x-1 overflow-x-auto scrollbar-hide">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupTab(g.group_name)}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all relative shrink-0",
                activeGroupTab === g.group_name 
                  ? "bg-primary text-black font-extrabold shadow-lg shadow-primary/20" 
                  : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
            >
              Group {g.group_name}
            </button>
          ))}
        </div>

        {/* ── main Group Stage Side-by-Side Presentation ───────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Block: Standings Table */}
          <div className="xl:col-span-7 space-y-6">
            <div className="flex items-center space-x-2.5">
              <AlignLeft className="w-5 h-5 text-zinc-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                Group {activeGroupTab} Standings Table
              </h3>
            </div>

            <div className="card rounded-[1.8rem] bg-surface border-border-main p-4 sm:p-6 space-y-4 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-white/5 pb-2">
                      <th className="py-2.5 pl-2 select-none">Pos</th>
                      <th className="py-2.5">Player</th>
                      <th className="py-2.5 text-center">P</th>
                      <th className="py-2.5 text-center">W</th>
                      <th className="py-2.5 text-center">D</th>
                      <th className="py-2.5 text-center">L</th>
                      <th className="py-2.5 text-center text-zinc-600">GF:GA</th>
                      <th className="py-2.5 text-center">GD</th>
                      <th className="py-2.5 text-center text-primary pr-2">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroupStandings.map((row) => {
                      const pos = row.group_rank;
                      // Highlight top qualify_count rows with a beautiful visual indicator
                      const isQualified = pos <= qualifyCount;
                      const profileInfo = row.profiles || { username: 'Anonymous', avatar_url: null };

                      // Extract badge selection safely
                      const badgeSelections = row.tournament_badge_selections;
                      const badgeId = Array.isArray(badgeSelections) 
                        ? badgeSelections[0]?.badge_id 
                        : (badgeSelections as any)?.badge_id;

                      return (
                        <tr 
                          key={row.player_id}
                          className={cn(
                            "text-xs transition-colors hover:bg-white/5 border-l-4",
                            isQualified 
                              ? "border-l-emerald-500/80 bg-emerald-500/5 hover:bg-emerald-500/10" 
                              : "border-l-zinc-800 bg-transparent"
                          )}
                        >
                          {/* Pos */}
                          <td className="py-3 px-2">
                            <span className={cn(
                              "font-black italic px-2 py-0.5 rounded text-[10px] select-none",
                              isQualified ? "text-emerald-400 bg-emerald-500/20" : "text-zinc-500 bg-zinc-800/50"
                            )}>
                              {pos}
                            </span>
                          </td>

                          {/* Player info (avatar + username + badge) */}
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              {/* Player Selected Badge */}
                              <PlayerBadge 
                                badgeId={badgeId} 
                                username={profileInfo.username} 
                                size="sm" 
                              />
                              
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center text-[9px] font-black uppercase text-zinc-500 shrink-0 border border-white/5">
                                {profileInfo.avatar_url ? (
                                  <img src={profileInfo.avatar_url} alt={profileInfo.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  profileInfo.username?.substring(0, 2)
                                )}
                              </div>
                              <span className="font-extrabold uppercase italic truncate tracking-tight text-text-main max-w-[150px]">
                                {profileInfo.username}
                              </span>
                            </div>
                          </td>

                          {/* P */}
                          <td className="py-3 text-center font-bold text-text-muted">{row.played}</td>
                          
                          {/* W */}
                          <td className="py-3 text-center font-bold text-zinc-400">{row.wins}</td>
                          
                          {/* D */}
                          <td className="py-3 text-center font-bold text-zinc-400">{row.draws}</td>
                          
                          {/* L */}
                          <td className="py-3 text-center font-bold text-zinc-400">{row.losses}</td>
                          
                          {/* GF:GA */}
                          <td className="py-3 text-center font-bold text-zinc-600 select-none">
                            {row.goals_for}:{row.goals_against}
                          </td>
                          
                          {/* GD */}
                          <td className={cn(
                            "py-3 text-center font-bold italic font-mono select-none", 
                            row.goal_difference > 0 ? "text-emerald-400" : row.goal_difference < 0 ? "text-red-400" : "text-zinc-500"
                          )}>
                            {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                          </td>

                          {/* Pts */}
                          <td className="py-3 text-center font-black text-text-main text-sm italic pr-2 select-none">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend Summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-widest border-t border-white/5 pt-4 gap-2">
                <span>Legend: W={settings?.points_win || 3}pts · D={settings?.points_draw || 1}pts · L={settings?.points_loss || 0}pts</span>
                <span className="text-emerald-400 italic">Top {qualifyCount} Advance to Playoffs</span>
              </div>
            </div>

            {/* Tiebreaker information panel */}
            {settings?.tie_breaker_rules && settings.tie_breaker_rules.length > 0 && (
              <div className="bg-surface/30 border border-white/5 rounded-2xl p-4 flex gap-3 text-xs">
                <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-text-main font-bold uppercase tracking-tight">Group Tie-breaker Rules Priority Order</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                    {settings.tie_breaker_rules.map((rule: string, rIdx: number) => (
                      <React.Fragment key={rule}>
                        {rIdx > 0 && <span>➔</span>}
                        <span className="text-primary">{formatRuleName(rule)}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Block: Fixtures list */}
          <div className="xl:col-span-5 space-y-6">
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                Group {activeGroupTab} Match Fixtures
              </h3>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedRounds.map((round) => {
                const roundMatches = matchesByRound[round] || [];
                return (
                  <div key={round} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1 sm:pb-2">
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                        Matchday {round}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {roundMatches.length} Engagements
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {roundMatches.map((m) => (
                        <GroupMatchCard key={m.id} match={m} flashed={!!flashedMatches[m.id]} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {sortedRounds.length === 0 && (
                <div className="py-12 text-center text-text-muted italic border border-dashed border-white/5 rounded-2xl bg-surface/10">
                  No matches have been generated or played for this group yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Knockout Championship Bracket ────────────────────────────────────────── */}
      {showKnockoutBracket && (
        <div className="space-y-8 pt-8 border-t border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Trophy className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-text-main italic uppercase tracking-tight">CHAMPIONSHIP BRACKET</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Knockout Stage brackets formulated from group advancements</p>
            </div>
          </div>

          <div className="overflow-x-auto pb-8 select-none border border-border-main rounded-[2.5rem] bg-zinc-950 p-6 md:p-10 custom-scrollbar">
            <div className="min-w-[1000px] flex items-center justify-center gap-8 py-5">
              <BracketTree matches={bracketMatches} tournament={tournament} settings={settings} />
            </div>
          </div>

          <ChampionCardSection matches={bracketMatches} />
        </div>
      )}

    </div>
  );
}

// Helper formatting function for rule names
function formatRuleName(rule: string) {
  switch (rule) {
    case 'goal_difference': return 'Goal Difference';
    case 'goals_for': return 'Goals For';
    case 'wins': return 'Wins';
    case 'head_to_head': return 'Head-to-Head';
    case 'goals_against': return 'Goals Against';
    default: return rule.replace('_', ' ');
  }
}

// Human readable status badges with corresponding colors
const GroupMatchCard: React.FC<{ match: GroupMatch, flashed: boolean, navigate: any }> = ({ match, flashed, navigate }) => {
  const isCompleted = match.status === 'completed';
  const score1 = match.score1;
  const score2 = match.score2;
  const p1 = match.p1 || { username: 'TBD', avatar_url: null };
  const p2 = match.p2 || { username: 'TBD', avatar_url: null };

  const isWinner1 = isCompleted && score1 !== null && score2 !== null && score1 > score2;
  const isWinner2 = isCompleted && score1 !== null && score2 !== null && score2 > score1;
  const isDraw = isCompleted && score1 !== null && score2 !== null && score1 === score2;

  // Retrieve status text and background styles
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-zinc-800/60 text-zinc-400 border-zinc-700/30';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'lobby_open':
      case 'match_in_progress':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse';
      case 'awaiting_result':
      case 'under_review':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'disputed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'cancelled':
        return 'bg-zinc-900 text-zinc-600 border-zinc-850 line-through';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  return (
    <motion.div
      animate={flashed ? {
        backgroundColor: ["rgba(16, 185, 129, 0)", "rgba(16, 185, 129, 0.15)", "rgba(16, 185, 129, 0)"],
        borderColor: ["rgba(255, 255, 255, 0.05)", "rgba(16, 185, 129, 0.4)", "rgba(255, 255, 255, 0.05)"],
        scale: [1, 1.01, 1]
      } : {}}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      onClick={() => navigate(`/matches/${match.id}`)}
      className={cn(
        "p-4 rounded-2xl bg-surface border border-white/5 hover:border-white/10 transition-all cursor-pointer select-none space-y-3.5",
        isCompleted ? "opacity-75" : "hover:scale-[1.01] hover:border-primary/20",
        match.locked && "border-zinc-850 hover:border-zinc-800"
      )}
    >
      {/* Competitors Score block */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* P1 */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center text-[9px] font-black uppercase text-zinc-500 shrink-0 border border-white/5">
            {p1.avatar_url ? (
              <img src={p1.avatar_url} alt={p1.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              p1.username?.substring(0, 2)
            )}
          </div>
          <span className={cn(
            "font-bold text-xs truncate uppercase italic tracking-tight",
            isWinner1 ? "text-primary font-black" : "text-text-main"
          )}>
            {p1.username}
          </span>
        </div>

        {/* Center Score box / VS display */}
        <div className="flex items-center justify-center shrink-0">
          {isCompleted && score1 !== null && score2 !== null ? (
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5 font-mono select-none">
              <span className={cn("text-xs font-black", isWinner1 ? "text-primary font-extrabold" : "text-text-muted")}>
                {score1}
              </span>
              <span className="text-zinc-600 text-[9px]">-</span>
              <span className={cn("text-xs font-black", isWinner2 ? "text-primary font-extrabold" : "text-text-muted")}>
                {score2}
              </span>
            </div>
          ) : match.status === 'match_in_progress' ? (
            <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25 animate-pulse">
              LIVE
            </div>
          ) : (
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5 select-none">
              vs
            </div>
          )}
        </div>

        {/* P2 */}
        <div className="flex items-center gap-2.5 min-w-0 justify-end text-right">
          <span className={cn(
            "font-bold text-xs truncate uppercase italic tracking-tight",
            isWinner2 ? "text-primary font-black" : "text-text-main"
          )}>
            {p2.username}
          </span>
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center text-[9px] font-black uppercase text-zinc-500 shrink-0 border border-white/5">
            {p2.avatar_url ? (
              <img src={p2.avatar_url} alt={p2.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              p2.username?.substring(0, 2)
            )}
          </div>
        </div>
      </div>

      {/* Details Row: Venue Scheduled Time Status */}
      <div className="flex items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-widest border-t border-white/5 pt-2.5">
        <div className="flex items-center gap-1.5 select-none">
          {match.locked && <Lock className="w-3.5 h-3.5 text-zinc-500" title="Locked result" />}
          {match.fixtures?.location ? (
            <span className="truncate max-w-[120px]">📍 {match.fixtures.location}</span>
          ) : (
            <span>📅 {match.fixtures?.scheduled_date ? match.fixtures.scheduled_date : 'No Schedule'}</span>
          )}
          {match.fixtures?.scheduled_time && (
            <span>⏰ {match.fixtures.scheduled_time} {match.fixtures.timezone || 'UTC'}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 select-none">
          {isDraw && (
            <span className="bg-zinc-800 text-zinc-400 border border-white/5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
              Draw
            </span>
          )}
          <span className={cn("px-2 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase", getStatusStyle(match.status))}>
            {match.status.replace('_', ' ')}
          </span>
        </div>
      </div>

    </motion.div>
  );
}

// ── BRACKET GRAPH PATHWAY SUB-COMPONENTS ───────────────────────────────────────

function BracketTree({ matches, tournament, settings }: { matches: any[], tournament: any, settings: any }) {
  const navigate = useNavigate();
  const height = 480;

  const roundsInfo = [
    { key: 'round_of_16', label: 'Round of 16', count: 8 },
    { key: 'quarter_final', label: 'Quarter-Finals', count: 4 },
    { key: 'semi_final', label: 'Semi-Finals', count: 2 },
    { key: 'final', label: 'Final', count: 1 }
  ];

  const totalQualifiers = (tournament?.group_count || 0) * (settings?.qualify_count || 2) || 8;
  let roundsToShow = [];
  if (totalQualifiers >= 16) {
    roundsToShow = roundsInfo;
  } else if (totalQualifiers >= 8) {
    roundsToShow = roundsInfo.slice(1);
  } else {
    roundsToShow = roundsInfo.slice(2);
  }

  const columnsData = roundsToShow.map(round => {
    const actualMatches = matches.filter(m => m.stage === round.key);
    
    const slots = Array.from({ length: round.count }, (_, idx) => {
      const slotNum = idx + 1;
      const matched = actualMatches.find(m => m.bracket_slot === slotNum) || actualMatches[idx];

      if (matched) {
        return {
          id: matched.id,
          actual: matched,
          placeholder: false,
          slotLabel: `Match ${slotNum}`
        };
      } else {
        let tbdPlayer1 = 'TBD';
        let tbdPlayer2 = 'TBD';
        if (round.key === 'quarter_final') {
          tbdPlayer1 = `Winner QF Slot ${idx * 2 + 1}`;
          tbdPlayer2 = `Winner QF Slot ${idx * 2 + 2}`;
        } else if (round.key === 'semi_final') {
          tbdPlayer1 = `Winner SF Slot ${idx * 2 + 1}`;
          tbdPlayer2 = `Winner SF Slot ${idx * 2 + 2}`;
        } else if (round.key === 'final') {
          tbdPlayer1 = `Winner SF Match 1`;
          tbdPlayer2 = `Winner SF Match 2`;
        } else if (round.key === 'round_of_16') {
          tbdPlayer1 = `Winner Group ${String.fromCharCode(65 + idx)}`;
          tbdPlayer2 = `Runner-up Group ${String.fromCharCode(66 + idx)}`;
        }

        return {
          id: `placeholder-${round.key}-${slotNum}`,
          actual: null,
          placeholder: true,
          tbdPlayer1,
          tbdPlayer2,
          slotLabel: `Match ${slotNum}`
        };
      }
    });

    return {
      roundKey: round.key,
      label: round.label,
      slots
    };
  });

  return (
    <div className="flex gap-16 xl:gap-24 relative select-none">
      {columnsData.map((col, colIdx) => (
        <div key={col.roundKey} className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-6 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            {col.label}
          </span>

          <div 
            style={{ height: `${height}px` }}
            className="flex flex-col justify-around relative w-[220px]"
          >
            {col.slots.map((slot, matchIdx) => (
              <div key={slot.id} className="relative flex items-center py-1">
                <BracketNode slot={slot} navigate={navigate} />
                
                {/* Connection lines to next column */}
                {colIdx < columnsData.length - 1 && (
                  <BracketConnector 
                    isTop={matchIdx % 2 === 0} 
                    matchesCount={col.slots.length} 
                    height={height} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketNode({ slot, navigate }: { slot: any, navigate: any }) {
  if (slot.placeholder) {
    return (
      <div className="w-[220px] bg-zinc-950/40 rounded-2xl border-2 border-dashed border-white/5 p-4 flex flex-col justify-between space-y-3 shadow-inner">
        <div className="flex justify-between items-center text-[8px] text-zinc-650 font-extrabold tracking-widest uppercase">
          <span>{slot.slotLabel}</span>
          <span>TBD</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 select-none">
            <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/5 shrink-0 flex items-center justify-center text-[9px] font-medium text-zinc-500">🏆</div>
            <span className="text-[11px] font-bold text-zinc-600 truncate italic">{slot.tbdPlayer1}</span>
          </div>
          <div className="h-[1px] bg-white/5" />
          <div className="flex items-center gap-2 select-none">
            <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/5 shrink-0 flex items-center justify-center text-[9px] font-medium text-zinc-500">🏆</div>
            <span className="text-[11px] font-bold text-zinc-600 truncate italic">{slot.tbdPlayer2}</span>
          </div>
        </div>
      </div>
    );
  }

  const match = slot.actual;
  const isCompleted = match.status === 'completed';
  const score1 = match.score1;
  const score2 = match.score2;
  const isWinner1 = isCompleted && score1 !== null && score2 !== null && score1 > score2;
  const isWinner2 = isCompleted && score1 !== null && score2 !== null && score2 > score1;

  const p1 = match.player1_profile || {};
  const p2 = match.player2_profile || {};

  return (
    <div 
      onClick={() => navigate(`/matches/${match.id}`)}
      className={cn(
        "w-[220px] bg-surface/95 border rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 relative z-10 cursor-pointer overflow-hidden",
        isCompleted ? "border-white/5 hover:border-primary/40" : "border-primary/20 hover:border-primary"
      )}
    >
      <div className="px-3 py-1 bg-background/50 border-b border-white/5 flex justify-between items-center text-[9px] font-black tracking-wider text-text-muted">
        <span className="uppercase italic">{slot.slotLabel}</span>
        <span className={cn(
          "uppercase tracking-widest px-1.5 py-0.5 rounded text-[8px] font-black",
          match.status === 'completed' ? "text-emerald-500" : "text-primary animate-pulse"
         )}>
          {match.status}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* Player 1 Row */}
        <div className={cn(
          "flex items-center justify-between transition-opacity",
          isWinner2 && "opacity-45"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 bg-zinc-900 flex items-center justify-center text-[8px] font-bold uppercase text-zinc-400">
              {p1.avatar_url ? <img src={p1.avatar_url} alt={p1.username} /> : (p1.username || 'P').slice(0, 2)}
            </div>
            <span className={cn(
              "font-black text-[11px] truncate uppercase tracking-tight",
              isWinner1 ? "text-primary italic" : "text-text-main"
            )}>
              {p1.username || 'TBD'}
            </span>
          </div>
          {isCompleted && score1 !== null ? (
            <span className={cn(
              "font-black text-xs px-1.5 py-0.5 rounded bg-background/60 min-w-[20px] text-center",
              isWinner1 ? "text-primary border border-primary/20" : "text-text-muted"
            )}>
              {score1}
            </span>
          ) : (
            <span className="text-text-muted opacity-30 text-[10px] font-bold italic">-</span>
          )}
        </div>

        <div className="h-[1px] bg-white/5 w-full" />

        {/* Player 2 Row */}
        <div className={cn(
          "flex items-center justify-between transition-opacity",
          isWinner1 && "opacity-45"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 bg-zinc-900 flex items-center justify-center text-[8px] font-bold uppercase text-zinc-400">
              {p2.avatar_url ? <img src={p2.avatar_url} alt={p2.username} /> : (p2.username || 'P').slice(0, 2)}
            </div>
            <span className={cn(
              "font-black text-[11px] truncate uppercase tracking-tight",
              isWinner2 ? "text-primary italic" : "text-text-main"
            )}>
              {p2.username || 'TBD'}
            </span>
          </div>
          {isCompleted && score2 !== null ? (
            <span className={cn(
              "font-black text-xs px-1.5 py-0.5 rounded bg-background/60 min-w-[20px] text-center",
              isWinner2 ? "text-primary border border-primary/20" : "text-text-muted"
            )}>
              {score2}
            </span>
          ) : (
            <span className="text-text-muted opacity-30 text-[10px] font-bold italic">-</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketConnector({ isTop, matchesCount, height }: { isTop: boolean; matchesCount: number; height: number; }) {
  const vertHeight = height / (matchesCount * 2);
  const sideWidth = 24;

  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-full z-0 pointer-events-none flex items-center h-[2px]"
      style={{ width: `${sideWidth}px` }}
    >
      <div className="w-full h-full bg-primary/20 relative">
        <div 
          style={{ height: `${vertHeight}px` }}
          className={cn(
            "absolute w-[2px] bg-primary/20 right-0",
            isTop ? "top-0" : "bottom-0"
          )}
        />
        <div 
          className="absolute h-[2px] bg-primary/20"
          style={{ 
            width: `${sideWidth}px`, 
            right: `-${sideWidth}px`,
            top: isTop ? `${vertHeight}px` : `-${vertHeight}px`
          }}
        />
      </div>
    </div>
  );
}

function ChampionCardSection({ matches }: { matches: any[] }) {
  const finalMatch = matches.find(m => m.stage === 'final');
  const isFinalCompleted = finalMatch && finalMatch.status === 'completed';
  const championProfile = isFinalCompleted 
    ? (finalMatch.winner_profile || (finalMatch.winner === finalMatch.player1 ? finalMatch.player1_profile : finalMatch.player2_profile)) 
    : null;

  if (!isFinalCompleted || !championProfile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-md mx-auto p-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-[2.5rem] mt-12 shadow-[0_0_50px_rgba(234,179,8,0.25)]"
    >
      <div className="bg-zinc-950 rounded-[2.4rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative ambiance */}
        <div className="absolute top-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <Trophy className="w-8 h-8 text-slate-950 font-black" />
          </div>

          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-tighter italic leading-none">
            GRAND CHAMPION
          </h3>
          
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-400/50 p-1 bg-zinc-900">
            {championProfile.avatar_url ? (
              <img src={championProfile.avatar_url} alt={championProfile.username} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-850 flex items-center justify-center text-xl font-black text-zinc-500">
                {championProfile.username?.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <p className="text-xl font-black text-white uppercase italic tracking-tight">{championProfile.username}</p>
          <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest">TOURNAMENT WINNER • GLORY SECURED</p>
        </div>
      </div>
    </motion.div>
  );
}
