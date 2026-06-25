import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Award, Star, Zap, Calendar, TrendingUp, Compass, 
  ChevronDown, ChevronUp, Clock, Target, Activity, ShieldAlert,
  Sparkles, Shield, AlertCircle
} from 'lucide-react';

interface PlayerLegacySummary {
  id: string;
  username: string;
  avatar_url?: string | null;
  tournaments_joined: number;
  tournaments_won: number;
  runner_up_finishes: number;
  third_place_finishes: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  clean_sheets: number;
  longest_win_streak: number;
  trophies_won: number;
  achievements_unlocked: number;
  legacy_score: number;
  trophy_points: number;
  achievement_points: number;
  stats_updated_at?: string | null;
}

interface PlayerTrophy {
  id: string;
  tournament_name: string;
  tournament_type: string;
  position: number;
  trophy_icon_type: 'gold_trophy' | 'silver_trophy' | 'bronze_trophy' | string;
  tournament_badge_snapshot?: string | null;
  season_name?: string | null;
  date_awarded: string;
}

interface PlayerAchievement {
  id: string;
  achievement_key: string;
  achievement_name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface PlayerTitle {
  id: string;
  title_key: string;
  title_name: string;
  icon: string;
  source_tournament_name?: string | null;
  awarded_at: string;
}

interface PlayerTimelineEvent {
  id: string;
  event_type: 'trophy_won' | 'runner_up' | 'third_place' | 'achievement' | 'milestone' | string;
  title: string;
  description: string;
  metadata?: any;
  event_timestamp: string;
}

interface PlayerLegacyProps {
  userId: string;
}

// Formatting helpers
const positionLabel = (pos: number) => ({
  1: 'Champion', 2: 'Runner-Up', 3: '3rd Place'
}[pos] ?? 'Finalist');

const formatTournamentType = (type: string) => ({
  world_cup:        'World Cup',
  champions_league: 'Champions League',
  league:           'League',
  knockout:         'Knockout',
  group_stage:      'Group Stage',
  playoffs:         'Playoffs',
}[type?.toLowerCase()] ?? type);

const trophyIcon = (iconType: string) => ({
  gold_trophy:   '🥇',
  silver_trophy: '🥈',
  bronze_trophy: '🥉',
}[iconType] ?? '🏆');

const formatGoalDiff = (gd: number) =>
  gd > 0 ? `+${gd}` : `${gd}`;

const formatMonthYear = (ts: string) =>
  new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

const formatFullDate = (ts: string) =>
  new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const legacyTier = (score: number) => {
  if (score >= 500) return { label: 'Hall of Fame',   bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  if (score >= 200) return { label: 'Elite',          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  if (score >= 100) return { label: 'Veteran',        bg: 'bg-slate-300/10 text-slate-300 border-slate-300/20' };
  if (score >= 50)  return { label: 'Competitor',     bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
  if (score >  0)   return { label: 'Rising Star',    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  return               { label: 'New Player',     bg: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
};

const getEventMarker = (type: string) => {
  switch (type) {
    case 'trophy_won':
      return { icon: '🏆', colorBg: 'bg-amber-500/20 border-amber-500 text-amber-400' };
    case 'runner_up':
      return { icon: '🥈', colorBg: 'bg-slate-300/20 border-slate-400 text-slate-300' };
    case 'third_place':
      return { icon: '🥉', colorBg: 'bg-orange-500/20 border-orange-500 text-orange-400' };
    case 'achievement':
      return { icon: '⭐', colorBg: 'bg-indigo-500/20 border-indigo-500 text-indigo-400' };
    case 'milestone':
      return { icon: '🎯', colorBg: 'bg-sky-500/20 border-sky-500 text-sky-400' };
    default:
      return { icon: '⚡', colorBg: 'bg-zinc-700/20 border-zinc-600 text-zinc-300' };
  }
};

export default function PlayerLegacy({ userId }: PlayerLegacyProps) {
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [trophiesLoading, setTrophiesLoading] = useState(true);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [titlesLoading, setTitlesLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const [legacy, setLegacy] = useState<PlayerLegacySummary | null>(null);
  const [trophies, setTrophies] = useState<PlayerTrophy[]>([]);
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  const [titles, setTitles] = useState<PlayerTitle[]>([]);
  const [timeline, setTimeline] = useState<PlayerTimelineEvent[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(10);

  const loadLegacySummary = async () => {
    try {
      const { data, error } = await supabase
        .from('v_player_legacy')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setLegacy(data);
    } catch (err) {
      console.warn('Error loading legacy summary:', err);
    } finally {
      setLegacyLoading(false);
    }
  };

  const loadTrophies = async () => {
    try {
      const { data, error } = await supabase
        .from('player_trophies')
        .select(`
          id,
          tournament_name,
          tournament_type,
          position,
          trophy_icon_type,
          tournament_badge_snapshot,
          season_name,
          date_awarded
        `)
        .eq('user_id', userId)
        .order('date_awarded', { ascending: false });

      if (error) throw error;
      setTrophies(data || []);
    } catch (err) {
      console.warn('Error loading trophies:', err);
    } finally {
      setTrophiesLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('player_achievements')
        .select(`
          id,
          achievement_key,
          achievement_name,
          description,
          icon,
          unlocked_at
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.warn('Error loading achievements:', err);
    } finally {
      setAchievementsLoading(false);
    }
  };

  const loadTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('player_titles')
        .select(`
          id,
          title_key,
          title_name,
          icon,
          source_tournament_name,
          awarded_at
        `)
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      setTitles(data || []);
    } catch (err) {
      console.warn('Error loading titles:', err);
    } finally {
      setTitlesLoading(false);
    }
  };

  const loadTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('player_career_timeline')
        .select(`
          id,
          event_type,
          title,
          description,
          metadata,
          event_timestamp
        `)
        .eq('user_id', userId)
        .order('event_timestamp', { ascending: false });

      if (error) throw error;
      setTimeline(data || []);
    } catch (err) {
      console.warn('Error loading timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Load in parallel
    Promise.all([
      loadLegacySummary(),
      loadTrophies(),
      loadAchievements(),
      loadTitles(),
      loadTimeline()
    ]);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Real-Time Subscription 1: player_statistics
    const statsChannel = supabase
      .channel('player-legacy-' + userId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_statistics',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Real-time] player_statistics updated, refetching v_player_legacy silently...');
        loadLegacySummary();
      })
      .subscribe();

    // Real-Time Subscription 2: player_trophies
    const trophiesChannel = supabase
      .channel('player-trophies-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'player_trophies',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Real-time] new player_trophy inserted, refetching trophies silently...');
        loadTrophies();
        loadLegacySummary(); // refetch summary too to align points
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(trophiesChannel);
    };
  }, [userId]);

  const hasStats = legacy && (
    legacy.tournaments_joined > 0 ||
    legacy.tournaments_won > 0 ||
    legacy.runner_up_finishes > 0 ||
    legacy.third_place_finishes > 0 ||
    legacy.matches_played > 0 ||
    legacy.wins > 0 ||
    legacy.draws > 0 ||
    legacy.losses > 0 ||
    legacy.goals_scored > 0 ||
    legacy.goals_conceded > 0 ||
    legacy.clean_sheets > 0 ||
    legacy.longest_win_streak > 0 ||
    legacy.trophies_won > 0 ||
    legacy.achievements_unlocked > 0
  );

  const tier = legacyTier(legacy?.legacy_score || 0);

  // Group Career Timeline by Calendar Year
  const visibleTimeline = timeline.slice(0, visibleLimit);
  const groupedTimeline: { year: string; events: PlayerTimelineEvent[] }[] = [];
  visibleTimeline.forEach(event => {
    const year = new Date(event.event_timestamp).getFullYear().toString();
    let group = groupedTimeline.find(g => g.year === year);
    if (!group) {
      group = { year, events: [] };
      groupedTimeline.push(group);
    }
    group.events.push(event);
  });

  return (
    <div className="space-y-10" id="player-legacy-root">
      
      {/* SECTION A — Legacy Score Banner */}
      <div id="section-legacy-banner">
        {legacyLoading ? (
          <div className="animate-pulse bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 h-32 flex flex-col justify-center space-y-2" />
        ) : (
          <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-[#0c0d12] to-black border-2 border-primary/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Visual background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8" />
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2.5">
                  <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.25em] leading-none">Arena Scorecard</span>
                  <span className={`px-2.5 py-0.5 border text-[9px] font-black rounded-md uppercase tracking-wider ${tier.bg}`}>
                    {tier.label}
                  </span>
                </div>
                <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Player Legacy Status
                </h3>
                
                {legacy?.legacy_score === 0 ? (
                  <p className="text-xs text-text-muted italic">Start competing to build your legacy</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                    <span className="flex items-center gap-1 font-semibold">
                      🏆 Trophy Points: <strong className="text-text-main font-bold">{legacy?.trophy_points || 0}</strong>
                    </span>
                    <span className="text-zinc-700 select-none">|</span>
                    <span className="flex items-center gap-1 font-semibold">
                      ⭐ Achievement Points: <strong className="text-text-main font-bold">{legacy?.achievement_points || 0}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start sm:items-end justify-center shrink-0">
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Legacy Score</span>
                <span className="text-5xl sm:text-6xl font-black text-primary tracking-tighter italic leading-none select-none">
                  {legacy?.legacy_score || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B — Lifetime Statistics Grid */}
      <div id="section-legacy-stats" className="space-y-4">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Lifetime Statistics
        </h3>

        {legacyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-6 h-48" />
            ))}
          </div>
        ) : !hasStats ? (
          <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider">No stats yet — join a tournament to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CAREER BLOCK */}
            <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/50">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Career Hub</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Tournaments Joined</span>
                  <span className="text-text-main font-black">{legacy?.tournaments_joined || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Tournaments Won</span>
                  <span className="text-amber-400 font-black">{legacy?.tournaments_won || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Runner-Up Finishes</span>
                  <span className="text-slate-300 font-black">{legacy?.runner_up_finishes || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">3rd Place Finishes</span>
                  <span className="text-orange-400 font-black">{legacy?.third_place_finishes || 0}</span>
                </div>
              </div>
            </div>

            {/* MATCHES BLOCK */}
            <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/50">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Match Records</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Matches Played</span>
                  <span className="text-text-main font-black">{legacy?.matches_played || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-bold">Wins</span>
                  <span className="text-emerald-400 font-black">{legacy?.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Draws</span>
                  <span className="text-text-main font-black">{legacy?.draws || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-400 font-bold">Losses</span>
                  <span className="text-red-400 font-black">{legacy?.losses || 0}</span>
                </div>
              </div>
            </div>

            {/* GOALS BLOCK */}
            <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/50">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Goal Dynamics</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Goals Scored</span>
                  <span className="text-text-main font-black">{legacy?.goals_scored || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Goals Conceded</span>
                  <span className="text-text-main font-black">{legacy?.goals_conceded || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Goal Difference</span>
                  <span className={`font-black ${legacy && legacy.goal_difference > 0 ? 'text-emerald-400' : legacy && legacy.goal_difference < 0 ? 'text-red-400' : 'text-text-main'}`}>
                    {legacy ? formatGoalDiff(legacy.goal_difference) : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Clean Sheets</span>
                  <span className="text-text-main font-black">{legacy?.clean_sheets || 0}</span>
                </div>
              </div>
            </div>

            {/* RECORDS BLOCK */}
            <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/50">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Achievements</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Longest Win Streak</span>
                  <span className="text-text-main font-black">{legacy?.longest_win_streak || 0} games</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Trophies Won</span>
                  <span className="text-amber-400 font-black">{legacy?.trophies_won || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Unlocked Feats</span>
                  <span className="text-indigo-400 font-black">{legacy?.achievements_unlocked || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-bold">Statistics Updated</span>
                  <span className="text-zinc-500 text-[10px] font-semibold font-mono">
                    {legacy?.stats_updated_at ? formatMonthYear(legacy.stats_updated_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* SECTION C — Trophy Cabinet */}
      <div id="section-legacy-trophies" className="space-y-4">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
          🏆 Trophy Cabinet
        </h3>

        {trophiesLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5 h-44 shrink-0 w-64 md:w-auto" />
            ))}
          </div>
        ) : trophies.length === 0 ? (
          <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
            <Trophy className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider">No trophies yet — win a tournament to start your cabinet</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-none md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
            {trophies.map((trophy) => (
              <div 
                key={trophy.id} 
                className="flex-shrink-0 w-64 md:w-auto bg-[#111218]/60 border border-zinc-800/60 hover:border-zinc-700/80 transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 max-w-[70%]">
                    <h4 className="font-extrabold text-xs text-text-main truncate uppercase leading-tight" title={trophy.tournament_name}>
                      {trophy.tournament_name}
                    </h4>
                    <span className="text-[10px] text-text-muted block font-semibold leading-none">
                      {formatTournamentType(trophy.tournament_type)}
                    </span>
                  </div>
                  
                  <span className="text-3xl select-none" role="img" aria-label="Trophy">
                    {trophyIcon(trophy.trophy_icon_type)}
                  </span>
                </div>

                <div className="flex items-end justify-between border-t border-zinc-800/50 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Awarded {formatMonthYear(trophy.date_awarded)}
                    </span>
                    {trophy.season_name && (
                      <span className="inline-block bg-zinc-800/80 text-zinc-400 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider">
                        {trophy.season_name}
                      </span>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 border text-[9px] font-black rounded-md uppercase tracking-wider ${
                    trophy.position === 1 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : trophy.position === 2 
                        ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' 
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  }`}>
                    {positionLabel(trophy.position)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION E — Titles */}
      <div id="section-legacy-titles" className="space-y-4">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
          🌍 Titles
        </h3>

        {titlesLoading ? (
          <div className="flex flex-wrap gap-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-36 bg-zinc-900/40 border border-zinc-800/40 rounded-full" />
            ))}
          </div>
        ) : titles.length === 0 ? (
          <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
            <Award className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider">No titles yet — titles are earned through major victories</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {titles.map((title) => (
              <div 
                key={title.id} 
                className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 hover:border-amber-400/40 transition-all px-4 py-2.5 rounded-2xl flex items-center space-x-3 shadow-md"
              >
                <span className="text-xl shrink-0 select-none">{title.icon || '👑'}</span>
                <div className="flex flex-col text-left">
                  <span className="font-black text-xs text-amber-400 uppercase tracking-wider leading-tight">
                    {title.title_name}
                  </span>
                  {title.source_tournament_name && (
                    <span className="text-[9px] text-amber-300/60 font-semibold truncate max-w-[180px] leading-tight mt-0.5" title={title.source_tournament_name}>
                      {title.source_tournament_name}
                    </span>
                  )}
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    Earned {formatMonthYear(title.awarded_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION D — Achievements */}
      <div id="section-legacy-achievements" className="space-y-4">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
          ⭐ Achievements
        </h3>

        {achievementsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-zinc-900/40 border border-zinc-800/40 rounded-2xl h-24" />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
            <Zap className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider">No achievements yet — keep playing to unlock them</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className="bg-gradient-to-br from-[#12131a] to-background border border-indigo-500/20 hover:border-indigo-400/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.08)] transition-all rounded-2xl p-4 flex flex-col items-center text-center space-y-2 relative overflow-hidden"
              >
                <span className="text-3xl select-none" role="img" aria-label="achievement">
                  {achievement.icon || '⭐'}
                </span>
                <div className="space-y-0.5 flex-1 flex flex-col justify-between w-full">
                  <h4 className="font-extrabold text-xs text-text-main uppercase leading-tight truncate">
                    {achievement.achievement_name}
                  </h4>
                  <p className="text-[10px] text-text-muted line-clamp-2 leading-tight">
                    {achievement.description}
                  </p>
                  <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest block pt-1 border-t border-zinc-800/50 mt-1">
                    Unlocked {formatMonthYear(achievement.unlocked_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION F — Career Timeline */}
      <div id="section-legacy-timeline" className="space-y-4">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-2">
          📜 Career History
        </h3>

        {timelineLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-900/40 border border-zinc-800/40 rounded-xl" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
            <Clock className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider">No career events yet — your journey starts with your first tournament</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTimeline.map((group) => (
              <div key={group.year} className="space-y-4">
                {/* Year Heading */}
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-black text-white italic tracking-wider">
                    {group.year}
                  </span>
                  <div className="flex-1 h-[1px] bg-zinc-800" />
                </div>
                
                {/* Events under this year */}
                <div className="relative pl-5 space-y-4 border-l border-zinc-800 ml-4">
                  {group.events.map((event) => {
                    const marker = getEventMarker(event.event_type);
                    return (
                      <div key={event.id} className="relative flex items-start group">
                        
                        {/* Circle marker centered exactly on the border-l line */}
                        <div className={`absolute -left-[23px] top-1.5 w-6 h-6 rounded-full border-2 ${marker.colorBg} flex items-center justify-center bg-background shrink-0 z-10`}>
                          <span className="text-xs select-none">{marker.icon}</span>
                        </div>
                        
                        {/* Event Content */}
                        <div className="flex-1 bg-surface/30 border border-border-main hover:border-zinc-800 transition-colors p-4 rounded-xl">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <h4 className="font-extrabold text-xs text-text-main uppercase tracking-wider">
                              {event.title}
                            </h4>
                            <span className="text-[9px] text-text-muted font-mono whitespace-nowrap">
                              {formatFullDate(event.event_timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            {event.description}
                          </p>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Show More Button */}
            {timeline.length > visibleLimit && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleLimit(prev => prev + 10)}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-text-main rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95"
                >
                  <ChevronDown className="w-4 h-4 text-primary" />
                  Show More History
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
