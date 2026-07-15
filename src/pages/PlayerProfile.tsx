import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Award, Calendar, TrendingUp, Loader2,
  Shield, CheckCircle2, Star, Target, Zap, Clock,
  ArrowLeft, Settings, User, Compass, Info, ShieldCheck, 
  Activity, Sparkles, HelpCircle, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Shell from '../components/layout/Shell';
import { cn } from '../lib/utils';

// Position helper
const getPositionInfo = (position: number) => {
  switch (position) {
    case 1:
      return {
        label: 'Champion',
        icon: '🥇',
        glow: 'shadow-[0_0_20px_rgba(250,204,21,0.15)]',
        border: 'border-yellow-500/30',
        bg: 'from-yellow-500/5 via-slate-900/40 to-slate-950/20',
        text: 'text-yellow-500'
      };
    case 2:
      return {
        label: 'Runner-Up',
        icon: '🥈',
        glow: 'shadow-[0_0_20px_rgba(156,163,175,0.1)]',
        border: 'border-slate-400/30',
        bg: 'from-slate-400/5 via-slate-900/40 to-slate-950/20',
        text: 'text-slate-300'
      };
    case 3:
      return {
        label: '3rd Place',
        icon: '🥉',
        glow: 'shadow-[0_0_20px_rgba(217,119,6,0.1)]',
        border: 'border-amber-600/30',
        bg: 'from-amber-600/5 via-slate-900/40 to-slate-950/20',
        text: 'text-amber-600'
      };
    default:
      return {
        label: 'Finalist',
        icon: '🏆',
        glow: '',
        border: 'border-zinc-800/60',
        bg: 'from-zinc-900/10 via-slate-900/40 to-slate-950/20',
        text: 'text-slate-400'
      };
  }
};

// Formatting helpers
const formatMonthYear = (ts?: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatFullDate = (ts?: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

function getFlagEmoji(countryCode?: string | null) {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '';
  }
}

function getCountryName(countryCode?: string | null) {
  if (!countryCode) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any).rpc('fn_get_public_player_profile', {
          p_username: username
        });
        if (error) {
          console.error('[PlayerProfile] Error calling RPC:', error);
        }
        setProfileData(data);
      } catch (err) {
        console.error('[PlayerProfile] Exception loading public profile:', err);
      } finally {
        setLoading(false);
      }
    }
    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <Shell>
        <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Fetching Player Records...
          </span>
        </div>
      </Shell>
    );
  }

  if (!profileData || !profileData.profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-lg shadow-red-500/5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Player Not Found</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              The player "{username}" does not exist, or their account is currently inactive. Please check the spelling or search again.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-border-main text-xs font-black uppercase tracking-wider text-white hover:border-primary/50 hover:bg-surface-hover transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </Shell>
    );
  }

  const { profile, statistics, legacy, trophies, achievements, titles, career_timeline, champion_history } = profileData;
  const isOwnProfile = currentUserProfile?.username?.toLowerCase() === profile.username?.toLowerCase();

  // Sorting trophies: Gold (1) first, Silver (2), Bronze (3)
  const sortedTrophies = trophies ? [...trophies].sort((a: any, b: any) => (a.position || 3) - (b.position || 3)) : [];

  // Win rate calculation
  const matchesPlayed = statistics?.matches_played || 0;
  const wins = statistics?.wins || 0;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6 space-y-8" id="public-player-profile-root">
        
        {/* Navigation & Hint Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {isOwnProfile && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-wider text-primary">
              <Info className="w-4 h-4 shrink-0 text-primary" />
              <span>This is your public profile view</span>
              <Link to="/profile" className="underline hover:text-white ml-1.5 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Account Settings
              </Link>
            </div>
          )}
        </div>

        {/* SECTION 1: HEADER BANNER */}
        <div className="card bg-surface border-border-main rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden" id="profile-header-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            {/* Avatar block */}
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-primary/40 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/15 relative group">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`${profile.username}'s avatar`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-12 h-12 text-slate-500" />
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter truncate">
                    {profile.username}
                  </h1>
                  {legacy?.legacy_score > 100 && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider text-yellow-500">
                      <Sparkles className="w-3 h-3" />
                      <span>Legend</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-slate-400">
                  {profile.country_code && (
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="text-base leading-none" title={getCountryName(profile.country_code)}>
                        {getFlagEmoji(profile.country_code)}
                      </span>
                      <span>{getCountryName(profile.country_code)}</span>
                    </span>
                  )}
                  {profile.country_code && <span className="text-zinc-800 select-none hidden sm:inline">|</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Member since {formatMonthYear(profile.member_since)}</span>
                  </span>
                </div>
              </div>

              {/* Legacy score display */}
              {legacy && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 pt-1">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Legacy Score</span>
                    <span className="text-sm font-black text-primary italic">{legacy.legacy_score || 0}</span>
                  </div>
                  {legacy.trophy_points > 0 && (
                    <span className="text-[10px] font-bold text-slate-500">
                      🏆 Trophy Points: <strong className="text-slate-300">{legacy.trophy_points}</strong>
                    </span>
                  )}
                  {legacy.achievement_points > 0 && (
                    <span className="text-[10px] font-bold text-slate-500">
                      ⭐ Achievement Points: <strong className="text-slate-300">{legacy.achievement_points}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: STAT HIGHLIGHTS */}
        <div id="profile-stats-section" className="space-y-4">
          <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Competitive Overview
          </h3>

          {!statistics ? (
            <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No competitive record logged yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all text-center sm:text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tournaments Won</span>
                <span className="text-3xl font-black text-yellow-500 italic leading-none block">
                  {statistics.tournaments_won || 0}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  From {statistics.tournaments_joined || 0} joined
                </span>
              </div>

              <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all text-center sm:text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Matches Played</span>
                <span className="text-3xl font-black text-white italic leading-none block">
                  {statistics.matches_played || 0}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Wins: {statistics.wins || 0} | Draws: {statistics.draws || 0}
                </span>
              </div>

              <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all text-center sm:text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Win Rate</span>
                <span className="text-3xl font-black text-emerald-400 italic leading-none block">
                  {winRate}%
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Losses: {statistics.losses || 0}
                </span>
              </div>

              <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all text-center sm:text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Current Streak</span>
                <span className="text-3xl font-black text-primary italic leading-none block">
                  {statistics.current_win_streak || 0}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">Active win streak</span>
              </div>

              <div className="bg-[#111218]/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/80 transition-all text-center sm:text-left col-span-2 md:col-span-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Longest Streak</span>
                <span className="text-3xl font-black text-indigo-400 italic leading-none block">
                  {statistics.longest_win_streak || 0}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">Personal record</span>
              </div>
            </div>
          )}
        </div>

        {/* TWO COLUMN GRID FOR CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: Trophy Case, Titles, Achievements */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* TROPHY CASE */}
            <div id="profile-trophy-case-section" className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Trophy Case ({sortedTrophies.length})
              </h3>

              {sortedTrophies.length === 0 ? (
                <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Trophy className="w-8 h-8 text-slate-700" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No trophies in the display cabinet yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedTrophies.map((trophy: any, index: number) => {
                    const posInfo = getPositionInfo(trophy.position);
                    return (
                      <motion.div
                        key={`trophy-${index}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "card p-5 bg-gradient-to-br rounded-2xl border flex items-start gap-4 hover:scale-[1.01] transition-all duration-200",
                          posInfo.border,
                          posInfo.bg,
                          posInfo.glow
                        )}
                      >
                        <span className="text-3xl select-none" role="img" aria-label="trophy">
                          {posInfo.icon}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-black text-white uppercase italic tracking-tight text-sm truncate">
                            {trophy.tournament_name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400 uppercase">
                            <span className={cn("font-black", posInfo.text)}>{posInfo.label}</span>
                            {trophy.season_name && (
                              <>
                                <span className="text-zinc-700">•</span>
                                <span>{trophy.season_name}</span>
                              </>
                            )}
                            <span className="text-zinc-700">•</span>
                            <span className="text-slate-500 font-mono">{formatFullDate(trophy.date_awarded)}</span>
                          </div>
                          <span className="inline-block px-1.5 py-0.5 bg-slate-900/60 rounded border border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            {trophy.tournament_type?.replace('_', ' ') || 'Tournament'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACHIEVEMENTS */}
            <div id="profile-achievements-section" className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Unlocked Achievements ({achievements?.length || 0})
              </h3>

              {!achievements || achievements.length === 0 ? (
                <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Zap className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No achievements unlocked yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {achievements.map((ach: any, index: number) => {
                    const isSelected = selectedAchievement === ach.achievement_name;
                    return (
                      <div
                        key={`ach-${index}`}
                        onClick={() => setSelectedAchievement(isSelected ? null : ach.achievement_name)}
                        className={cn(
                          "card p-4 bg-slate-900/40 border rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all hover:bg-slate-800/40 relative overflow-hidden select-none",
                          isSelected ? "border-primary/60 bg-slate-800/50 shadow-md shadow-primary/5" : "border-zinc-800/60"
                        )}
                      >
                        <span className="text-3xl mb-2 filter drop-shadow-md">
                          {ach.icon || '⭐'}
                        </span>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">
                          {ach.achievement_name}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase">
                          {formatFullDate(ach.unlocked_at)}
                        </span>

                        {/* Interactive Expand / Dropdown description */}
                        <AnimatePresence>
                          {isSelected && ach.description && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2.5 pt-2.5 border-t border-zinc-800/80 w-full text-left"
                            >
                              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                {ach.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Expand hint arrow */}
                        {ach.description && (
                          <div className="absolute bottom-1 right-2 opacity-40 text-[9px] font-black text-slate-600">
                            {isSelected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TITLES */}
            <div id="profile-titles-section" className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Earned Titles ({titles?.length || 0})
              </h3>

              {!titles || titles.length === 0 ? (
                <div className="card p-6 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Award className="w-8 h-8 text-slate-700" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No custom titles earned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {titles.map((title: any, index: number) => (
                    <div
                      key={`title-${index}`}
                      className="card p-4 bg-slate-900/40 border border-zinc-800/60 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{title.icon || '🏅'}</span>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            {title.title_name}
                          </h4>
                          {title.source_tournament_name && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Source: <span className="font-bold text-slate-300">{title.source_tournament_name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">
                        {formatFullDate(title.awarded_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: Champion History, Career Timeline */}
          <div className="space-y-8">
            
            {/* CHAMPION HISTORY */}
            <div id="profile-champ-history-section" className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Champion History ({champion_history?.length || 0})
              </h3>

              {!champion_history || champion_history.length === 0 ? (
                <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Star className="w-8 h-8 text-slate-700" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No final podiums logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {champion_history.map((hist: any, index: number) => {
                    const isChamp = hist.result === 'champion';
                    return (
                      <div
                        key={`champ-hist-${index}`}
                        className={cn(
                          "card p-4 border rounded-2xl relative overflow-hidden transition-all",
                          isChamp 
                            ? "bg-yellow-500/5 border-yellow-500/25 shadow-sm shadow-yellow-500/5" 
                            : "bg-slate-900/40 border-zinc-800/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div>
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-2",
                              isChamp ? "bg-yellow-500/10 text-yellow-500" : "bg-slate-800 text-slate-400"
                            )}>
                              {isChamp ? '🏆 CHAMPION' : '🥈 RUNNER-UP'}
                            </span>
                            <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">
                              {hist.tournament_name}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono mt-1 uppercase">
                              {formatFullDate(hist.completed_at)} • {hist.tournament_type?.replace('_', ' ')}
                            </p>
                          </div>
                          
                          {hist.champion_title && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary shrink-0 italic">
                              {hist.champion_title}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CAREER TIMELINE */}
            <div id="profile-career-timeline-section" className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Career Timeline ({career_timeline?.length || 0})
              </h3>

              {!career_timeline || career_timeline.length === 0 ? (
                <div className="card p-8 text-center bg-surface/30 border border-border-main rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Timeline is empty</p>
                </div>
              ) : (
                <div className="space-y-4 relative pl-4 border-l border-zinc-800/80">
                  {career_timeline.map((event: any, index: number) => (
                    <div key={`timeline-${index}`} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background shadow-sm" />
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                          {event.event_type?.replace('_', ' ') || 'Milestone'}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 uppercase shrink-0">
                          {formatFullDate(event.event_timestamp)}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-black text-white uppercase tracking-tight">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Capped Feed Notice */}
                  {career_timeline.length === 20 && (
                    <div className="text-center pt-3 border-t border-zinc-900/60 mt-4">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide italic">
                        Showing recent activity — older events archived
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </Shell>
  );
}
