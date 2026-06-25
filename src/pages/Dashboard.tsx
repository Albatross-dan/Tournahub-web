import React, { useState, useEffect } from 'react';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { 
  Trophy, Users, Wallet, 
  ArrowUpRight, Gamepad2, Timer,
  Loader2, Tv, Shield, HelpCircle,
  ChevronDown, ChevronUp, Calendar, Play, CheckCircle2, Download,
  MessageSquare, Swords
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn, getPublicIdentity, formatFixtureTime } from '../lib/utils';
import { Tournament, Match, Wallet as WalletType } from '../types/database';
import { Link, useNavigate } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { matchService } from '../services/matchService';
import { walletService } from '../services/walletService';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';
import StatusBadge from '../components/ui/StatusBadge';
import { TournamentStatus } from '../constants';

import { useQuery } from '@tanstack/react-query';
import { useRealtimeTournaments } from '../hooks/useRealtimeTournaments';
import { usePWAInstall } from '../hooks/usePWAInstall';

import VerificationStatusBadge from '../components/match/VerificationStatusBadge';
import VerificationStatusBanner from '../components/match/VerificationStatusBanner';
import { VerificationStatus } from '../types/verification.types';
import RecentChampions from '../components/home/RecentChampions';

export default function Dashboard() {
  const { user, profile, isAdmin, refetchSignal } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const { isInstallable, installApp } = usePWAInstall();

  const handleAdminPress = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (checking) return;

    if ((window as any).__isAdminConfirmed === true) {
      navigate('/admin');
      return;
    }

    setChecking(true);
    try {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!data || (data as any).role !== 'admin') {
        return; // silently block non-admins
      }

      (window as any).__isAdminConfirmed = true;
      navigate('/admin');
    } catch (err) {
      console.error('[Dashboard] Admin check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const [isSchedulesExpanded, setIsSchedulesExpanded] = useState(false);
  const isInitialLoad = React.useRef(true);

  // Unread community chat messages tracking
  const [unreadCommunityMessages, setUnreadCommunityMessages] = useState<number>(0);

  const refreshUnreadCommunityCount = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const lastReadStr = localStorage.getItem('community_chat_last_read_at') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await (supabase as any)
        .from('community_chat_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastReadStr)
        .neq('sender_id', user.id);

      if (!error) {
        setUnreadCommunityMessages(count || 0);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching unread community chat count:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    
    refreshUnreadCommunityCount();

    // Subscribe to new community messages
    const channel = supabase
      .channel('dashboard-community-chat-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_chat_messages'
        },
        (payload) => {
          const newMessage = payload.new;
          const lastReadStr = localStorage.getItem('community_chat_last_read_at') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          if (newMessage.sender_id !== user.id && newMessage.created_at > lastReadStr) {
            setUnreadCommunityMessages(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshUnreadCommunityCount]);

  // Open 1v1 challenges tracking
  const [openChallengesCount, setOpenChallengesCount] = useState<number>(0);

  const refreshOpenChallengesCount = React.useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      if (!error) {
        setOpenChallengesCount(count || 0);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching open challenges:', err);
    }
  }, []);

  useEffect(() => {
    refreshOpenChallengesCount();
    const sub = supabase
      .channel('dashboard-challenges-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges',
      }, () => {
        refreshOpenChallengesCount();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [refreshOpenChallengesCount]);

  useRefetchOnFocus(loadDashboardData);
  
  const activeStatus = React.useMemo(() => Object.values(TournamentStatus), []);
  const completedStatus = TournamentStatus.COMPLETED;

  // Fetch all tournaments for the main slider (including completed, ready, cancelled, etc.)
  const { tournaments: activeTournaments, loading: activeLoading } = useRealtimeTournaments(activeStatus, 30);
  // Separate fetch for completed tournaments for the hall of fame
  const { tournaments: completedTournaments, loading: completedLoading } = useRealtimeTournaments(completedStatus, 6);
  
  // Query scheduled matches
  const { data: userMatches = [], status: matchesStatus, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: ['user_scheduled_matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await matchService.getUserMatches(user.id);
      return res || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 20, // 20 seconds
    gcTime: 1000 * 60 * 60 * 24, // 24 hours persistent garbage collection
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  // Query active user's submitted match IDs
  const { data: userSubmittedMatchIds = [], refetch: refetchSubmittedMatchIds } = useQuery<string[]>({
    queryKey: ['user_submitted_match_ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('match_results')
        .select('match_id')
        .eq('submitted_by', user.id)
        .eq('is_active', true)
        .in('status', ['submitted', 'pending_confirmation', 'disputed', 'verified']);
      if (error) {
        console.error('[Dashboard] Error loading active submissions:', error);
        return [];
      }
      return (data || []).map((r: any) => r.match_id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 20,
  });

  // Query user stats
  const { data: userStats = { totalMatches: 0, wins: 0, winRate: 0 }, status: statsStatus, refetch: refetchStats } = useQuery({
    queryKey: ['user_stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalMatches: 0, wins: 0, winRate: 0 };
      const res = await matchService.getUserStats(user.id);
      return res || { totalMatches: 0, wins: 0, winRate: 0 };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  const scheduledMatches = React.useMemo(() => {
    return userMatches.filter((m: any) => 
      ['pending', 'scheduled', 'waiting_for_players'].includes(m.status)
    ).slice(0, 20);
  }, [userMatches]);

  const isDashboardLoading = false;

  useEffect(() => {
    if (refetchSignal > 0) {
      refetchMatches();
      refetchStats();
      refetchSubmittedMatchIds();
      refreshUnreadCommunityCount();
      refreshOpenChallengesCount();
    }
  }, [refetchSignal, refetchMatches, refetchStats, refetchSubmittedMatchIds, refreshUnreadCommunityCount, refreshOpenChallengesCount]);

  // Compatibility callback for refetchOnFocus hook
  async function loadDashboardData() {
    if (user?.id) {
      refetchMatches();
      refetchStats();
      refetchSubmittedMatchIds();
      refreshUnreadCommunityCount();
      refreshOpenChallengesCount();
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Duplicate tournaments for the infinite slider effect
  const sliderItems = activeTournaments.length > 0 
    ? [...activeTournaments, ...activeTournaments, ...activeTournaments] 
    : [];

  const winnersSliderItems = completedTournaments.length > 0
    ? [...completedTournaments, ...completedTournaments, ...completedTournaments]
    : [];

  if (isDashboardLoading && scheduledMatches.length === 0 && activeTournaments.length === 0) {
    return (
      <Shell>
        <LoadingState message="Synchronizing Arena..." />
      </Shell>
    );
  }

  return (
    <Shell>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-primary/20 rounded-xl text-primary block">
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-black text-white uppercase italic tracking-wider">Admin Control Active</h4>
                <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mt-0.5">Full administrative privilege mode enabled.</p>
              </div>
            </div>
            <button 
              disabled={checking}
              onClick={handleAdminPress}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-white text-black font-black text-xs uppercase italic tracking-widest rounded-xl text-center transition-all shadow-md active:scale-95 duration-250 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                  <span>Verifying Operations...</span>
                </>
              ) : (
                <span>Enter Admin Panel</span>
              )}
            </button>
          </motion.div>
        )}

        {/* Tournament Auto-Slider (Available Tournaments) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-text-main uppercase italic tracking-tighter">Live Tournaments</h2>
            <p className="text-xs text-text-muted font-bold uppercase tracking-widest leading-none mt-1">Tap a card to open the details view.</p>
          </div>
          
          <div className="relative overflow-hidden py-4 -mx-4 sm:mx-0">
            <div className="flex px-4 sm:px-0">
              {activeLoading ? (
                <div className="w-full flex gap-6 overflow-hidden">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-[300px] sm:w-[500px] aspect-[16/9] sm:aspect-[2.5/1] rounded-3xl bg-surface border border-border-main animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                <motion.div 
                  animate={activeTournaments.length > 0 ? { 
                    x: ["0%", "-33.33%"]
                  } : {}}
                  transition={activeTournaments.length > 0 ? { 
                    duration: 55, 
                    repeat: Infinity, 
                    ease: "linear" 
                  } : {}}
                  className="flex gap-6 w-max"
                >
                  {sliderItems.map((tournament, idx) => (
                    <div key={`${tournament.id}-${idx}`} className="w-[300px] sm:w-[500px] shrink-0">
                       <TournamentHeroCard tournament={tournament} />
                    </div>
                  ))}
                  {activeTournaments.length === 0 && (
                    <div className="w-[calc(100vw-2rem)] sm:w-full card p-16 text-center space-y-4 rounded-3xl border-2 border-dashed border-border-main bg-surface/20">
                      <div className="w-16 h-16 bg-surface border border-border-main rounded-full flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8 text-text-muted" />
                      </div>
                      {isAdmin ? (
                        <>
                          <div>
                            <p className="text-xl font-black text-text-main italic uppercase tracking-tighter">No active arena battles</p>
                            <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1">Start by creating a tournament in the admin panel.</p>
                          </div>
                          <Link to="/admin/tournaments" className="btn-secondary inline-block px-10 py-3 text-xs uppercase italic font-black">
                            Create Tournament
                          </Link>
                        </>
                      ) : (
                        <div>
                          <p className="text-xl font-black text-text-main italic uppercase tracking-tighter">No active arena battles</p>
                          <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1">Check back soon for upcoming tournaments and challenges.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-4">
          {/* Main Feed: Scheduled Matches */}
          <motion.div variants={item} className="lg:col-span-2 space-y-8">
            {/* Community Chat + 1v1 Challenge Side-by-Side Row */}
            <motion.div variants={item} className="flex flex-row items-stretch gap-2 w-full duration-300">
              {/* Left Card: Community Chat */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => navigate('/community-chat')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/community-chat'); } }}
                className="flex-1 bg-[#064e3b] hover:bg-[#047857] text-[#34d399] border border-[#047857]/50 rounded-3xl p-4 flex flex-col justify-between min-h-[150px] transition-all duration-300 group cursor-pointer shadow-md hover:shadow-xl shadow-[#064e3b]/20 hover:scale-[1.01] select-none outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/50"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-[#047857]/30 flex items-center justify-center shrink-0 border border-[#047857]/30 text-[#34d399]">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    {unreadCommunityMessages > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 rounded-full bg-[#10b981] text-black text-[9px] font-bold flex items-center justify-center border-2 border-[#064e3b] shadow">
                        {unreadCommunityMessages}
                      </span>
                    )}
                  </div>

                  {unreadCommunityMessages > 0 ? (
                    <span className="bg-[#10b981] text-[#052e16] px-1.5 py-0.5 rounded text-[8px] font-black tracking-normal uppercase leading-none">
                      {unreadCommunityMessages} unread
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#10b981] relative mt-1 mr-1">
                      <span className="absolute w-2 h-2 rounded-full bg-[#10b981] animate-ping opacity-75" />
                    </span>
                  )}
                </div>

                <div className="text-left w-full mt-2">
                  <h4 className="font-black text-white uppercase italic tracking-tighter text-sm leading-tight group-hover:text-[#34d399] transition-colors">
                    Community Chat
                  </h4>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5 line-clamp-1">Connect & Banter</p>
                </div>

                <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-[#047857]/20">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Open Chat</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#34d399] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Right Card: 1v1 Challenge */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => navigate('/challenge-lobby')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/challenge-lobby'); } }}
                className="flex-1 bg-[#1e1b4b] hover:bg-[#312e81] text-[#818cf8] border border-[#3730a3]/50 rounded-3xl p-4 flex flex-col justify-between min-h-[150px] transition-all duration-300 group cursor-pointer shadow-md hover:shadow-xl shadow-[#1e1b4b]/20 hover:scale-[1.01] select-none outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/50"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-[#312e81]/30 flex items-center justify-center shrink-0 border border-[#3730a3]/30 text-[#818cf8]">
                      <Swords className="w-5 h-5" />
                    </div>
                  </div>

                  {openChallengesCount > 0 ? (
                    <span className="bg-[#818cf8] text-black px-1.5 py-0.5 rounded text-[8px] font-black tracking-normal uppercase leading-none">
                      {openChallengesCount} active
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mt-1 mr-1">
                      0 open
                    </span>
                  )}
                </div>

                <div className="text-left w-full mt-2">
                  <h4 className="font-black text-white uppercase italic tracking-tighter text-sm leading-tight group-hover:text-[#818cf8] transition-colors">
                    1v1 Challenge
                  </h4>
                  <p className="text-[9px] text-[#a5b4fc] font-bold uppercase tracking-wider mt-0.5 line-clamp-1">Battle & Win Prizes</p>
                </div>

                <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-[#3730a3]/20">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#a5b4fc]">Play Now</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#818cf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>

            <div>
              <SectionHeader title="Next Scheduled Battles" link="/matches" />
              <div className="space-y-4 mt-4">
                {scheduledMatches.length > 0 ? (
                  <div className="space-y-4">
                     <AnimatePresence mode="popLayout" initial={false}>
                      {/* Show first 2 matches always */}
                      {scheduledMatches.slice(0, 2).map((match) => (
                        <motion.div key={match.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                          <MatchCard match={match} userSubmittedMatchIds={userSubmittedMatchIds} />
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Remaining matches container with AnimatePresence */}
                    <AnimatePresence initial={false}>
                      {isSchedulesExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-4"
                        >
                          {scheduledMatches.slice(2).map((match) => (
                            <motion.div key={match.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                              <MatchCard match={match} userSubmittedMatchIds={userSubmittedMatchIds} />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Expansion trigger card/button */}
                    {scheduledMatches.length > 2 && (
                      <button
                        onClick={() => setIsSchedulesExpanded(!isSchedulesExpanded)}
                        className={cn(
                          "w-full py-3 px-4 bg-surface hover:bg-surface/80 border border-border-main hover:border-primary/20 rounded-2xl flex items-center justify-between transition-all duration-300 group cursor-pointer text-text-muted hover:text-text-main",
                          isSchedulesExpanded && "border-primary/20 bg-primary/5 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider italic">
                            {isSchedulesExpanded ? `COLLAPSE MATCH LIST` : `EXPAND UPCOMING SCHEDULES (+${scheduledMatches.length - 2} MORE)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black tracking-wider uppercase text-text-muted">
                            {isSchedulesExpanded ? 'HIDE' : 'SHOW ALL'}
                          </span>
                          <div className={cn(
                            "w-6 h-6 rounded-lg bg-surface border border-border-main flex items-center justify-center transition-transform duration-300",
                            isSchedulesExpanded && "rotate-180"
                          )}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="card p-12 text-center text-text-muted italic rounded-3xl border-dashed border-2 border-border-main">
                    No matches found. Go join a tournament!
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Hall of Fame Square Card */}
          <motion.div variants={item} className="lg:col-span-1">
            <RecentChampions />
          </motion.div>

          {/* Sidebar Feed */}
          <div className="lg:col-span-1 space-y-8">
            <motion.div variants={item} className="card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Gamepad2 className="text-primary w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-text-main uppercase italic tracking-tighter">Your stats</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none">Season Performance</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface p-3 rounded-2xl border border-border-main">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Matches</p>
                  <p className="text-xl font-black text-text-main italic tracking-tighter">{userStats.totalMatches}</p>
                </div>
                <div className="bg-surface p-3 rounded-2xl border border-border-main">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Win Rate</p>
                  <p className="text-xl font-black text-emerald-500 italic tracking-tighter">{userStats.winRate}%</p>
                </div>
              </div>
            </motion.div>



            <motion.div variants={item} className="card p-6 bg-surface border-border-main rounded-3xl shadow-sm">
              <h3 className="text-xs font-black text-text-main uppercase italic tracking-widest mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/tournaments" className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span>Browse Arena</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link to="/matches" className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span>Your matches</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link to="/wallet" className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span>Financials</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Professional Footer Section */}
        <div className="mt-16 pt-12 pb-8 border-t border-border-main w-full flex flex-col items-center">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-text-main">
                Connect With Tournahub
              </h4>
              <p className="text-[11px] text-text-muted tracking-wide">
                Join our active community and follow matches, brackets, & announcements.
              </p>
            </div>

            {/* Social Icons grid/flex */}
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61590368578569"
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                className="w-10 h-10 rounded-xl bg-[#1877F2]/5 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/15 hover:border-[#1877F2]/60 hover:shadow-[0_0_15px_rgba(24,119,242,0.35)] flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1"
                id="social-fb"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>

              <a
                href="https://tiktok.com/@tournahub"
                target="_blank"
                rel="noopener noreferrer"
                title="TikTok"
                className="w-10 h-10 rounded-xl bg-black border border-[#fe2c55]/30 text-white hover:border-[#00f2fe]/60 hover:shadow-[0_0_15px_rgba(0,242,254,0.35)] flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1"
                id="social-tt"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.14 2.37 1.84 3.84 2.05v3.66c-1.89-.08-3.74-.82-5.13-2.11v6.97c-.01 2.28-1.24 4.41-3.26 5.48-2.02 1.07-4.52.88-6.38-.49-1.86-1.37-2.68-3.73-2.08-5.99.6-2.26 2.65-3.82 5.01-3.82.47 0 .94.05 1.4.15v3.83c-.87-.31-1.84-.18-2.6.35-.76.53-1.18 1.44-1.07 2.38.11.94.75 1.72 1.63 1.99.88.27 1.85-.04 2.4-.78.36-.48.55-1.06.54-1.66V0h.01a.34.34 0 0 0-.25.02z" />
                </svg>
              </a>

              <a
                href="https://www.instagram.com/tournahub.me?igsh=MWVpNWU3cGI2YjQzdQ=="
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                className="w-10 h-10 rounded-xl bg-[#E1306C]/5 border border-[#E1306C]/30 hover:bg-[#E1306C]/15 hover:border-[#E1306C]/60 hover:shadow-[0_0_15px_rgba(225,48,108,0.35)] flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1"
                id="social-ig"
              >
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f9ce34" />
                      <stop offset="50%" stopColor="#ee2a7b" />
                      <stop offset="100%" stopColor="#6228d7" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#instagram-gradient)" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="url(#instagram-gradient)" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="url(#instagram-gradient)" />
                </svg>
              </a>

              <a
                href="https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                className="w-10 h-10 rounded-xl bg-[#25D366]/5 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/15 hover:border-[#25D366]/60 hover:shadow-[0_0_15px_rgba(37,211,102,0.35)] flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1"
                id="social-wa"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.263 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-4.846c1.657.983 3.287 1.498 4.965 1.499 5.485 0 9.943-4.456 9.946-9.942.001-2.657-1.026-5.152-2.895-7.022C16.793 1.799 14.3 .772 11.649.771 6.161.771 1.7 5.227 1.697 10.716c-.001 1.77.464 3.498 1.348 5.024L2.016 21.9l6.324-1.66c-1.5-.916-2.583-2.316-2.593-3.086zm11.446-4.524c-.3-.15-1.773-.875-2.048-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.794-1.49-1.775-1.665-2.075-.175-.3-.018-.462.13-.61.134-.133.3-.349.45-.524.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.492-.51-.675-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8 1.025-.275.95-1.05 3.1-1.05 3.325s.2 1.025.775 1.825c.55.775 1.95 3.483 4.3 4.4a12.871 12.871 0 0 0 2.225.688c.85.12 1.625.08 2.238.01 1.15-.175 2.508-.95 2.733-1.85s.225-1.675.15-1.85c-.075-.175-.275-.275-.575-.425z" />
                </svg>
              </a>
            </div>

            {/* Support section */}
            <div className="pt-2 border-t border-border-main/40 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted block">Support Helpdesk</span>
              <a
                href="mailto:support@tournahub.me"
                className="text-xs font-bold text-text-main hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
                id="support-email"
              >
                support@tournahub.me
              </a>
            </div>

            {/* Terms and Privacy links */}
            <div className="pt-4 flex items-center justify-center space-x-4">
              <Link
                to="/terms"
                className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
              >
                Terms & Conditions
              </Link>
              <span className="text-border-main text-xs font-black">•</span>
              <Link
                to="/privacy-policy"
                className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
              >
                Privacy Policy
              </Link>
            </div>

            {/* Help Center CTA */}
            <div className="pt-4 pb-2">
              <Link
                to="/help"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary/15 hover:bg-primary/25 border border-primary/25 hover:border-primary/50 rounded-full text-[11px] font-black uppercase tracking-widest text-primary transition-all duration-300 shadow-lg shadow-primary/5 hover:scale-[1.02]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                <span>Help Center & FAQs</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </Shell>

  );
}

function TournamentHeroCard({ tournament }: { tournament: Tournament }) {
  const isOngoing = tournament.status === TournamentStatus.ONGOING;

  const regCount = typeof (tournament as any).registrations_count === 'object' 
    ? (tournament as any).registrations_count?.count ?? 0 
    : (tournament as any).registrations_count ?? 0;

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block group relative aspect-[1.4/1] rounded-[2.5rem] overflow-hidden border border-border-main hover:border-primary/50 transition-all duration-500 shadow-2xl">
      <img src={tournament.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800'} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent" />
      
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10" />

      <div className="absolute inset-0 p-8 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-4 py-1.5 bg-[#d4e157] text-black text-[10px] font-black rounded-full uppercase tracking-widest">
              {tournament.type.toUpperCase()}
            </span>
            <StatusBadge status={tournament.status} />
          </div>
          <div className="w-14 h-14 bg-amber-500/80 backdrop-blur-md rounded-full flex items-center justify-center border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <span className="text-white font-black text-sm italic">${tournament.entry_fee || '0'}</span>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none group-hover:text-primary transition-colors">
            {tournament.name}
          </h2>
          <p className="text-slate-300 text-sm font-medium mt-2 line-clamp-1">{tournament.description || 'Competitive tournament arena.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex flex-col justify-center relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contenders</p>
                <p className="text-lg font-black text-white italic">{String(regCount)}/{tournament.max_players}</p>
              </div>
              <Users className="w-5 h-5 text-slate-500" />
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full" />
            <div 
              className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-1000" 
              style={{ width: `${Math.min(100, (Number(regCount) / (tournament.max_players || 1)) * 100)}%` }} 
            />
          </div>
          <div className="bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Start time</p>
                <p className="text-lg font-black text-white italic">
                  {tournament.start_date ? new Date(tournament.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 AM'}
                </p>
              </div>
              <Timer className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function WinnerCard({ tournament }: { tournament: any }) {
  return (
    <Link to={`/tournaments/${tournament.id}`} className="card p-5 hover:border-amber-500/50 transition-all group rounded-3xl relative overflow-hidden bg-gradient-to-br from-surface to-background border-amber-500/10 block h-full">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity rotate-12">
        <Trophy className="w-16 h-16 text-amber-500" />
      </div>
      <div className="flex items-center space-x-4 h-full">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-lg shadow-amber-500/5">
          <Trophy className="text-amber-500 w-8 h-8" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">HALL OF FAME</span>
          </div>
          <h4 className="text-base font-black text-text-main italic uppercase tracking-tighter truncate mt-2 group-hover:text-amber-500 transition-colors leading-none tracking-tight">
            {tournament.name}
          </h4>
          <div className="flex items-center mt-3 bg-background/50 border border-border-main rounded-xl px-3 py-1.5 w-fit">
             <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mr-2">
                <Users className="w-3 h-3 text-amber-500" />
             </div>
             <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
               {tournament.type} Victory
             </p>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-0.5">Arena Prize Pool</span>
          <span className="text-base font-black text-emerald-500 italic uppercase leading-none tracking-tighter">
            {formatCurrency(tournament.prize_pool || 0)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface border border-border-main flex items-center justify-center text-text-muted group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
          <ArrowUpRight className="w-5 h-5" />
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black text-text-main italic tracking-tighter uppercase border-l-4 border-primary pl-4">{title}</h2>
      <Link to={link} className="text-primary text-[10px] font-black uppercase italic tracking-widest hover:underline flex items-center bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
        Browse All <ArrowUpRight className="w-3 h-3 ml-1" />
      </Link>
    </div>
  );
}

function MatchCard({ match, userSubmittedMatchIds = [] }: { match: any; userSubmittedMatchIds?: string[] }) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const opponent = match.player1?.id === user?.id ? match.player2 : match.player1;
  const opponentName = getPublicIdentity(opponent);
  
  const verificationStatus = match.result_verification_status as VerificationStatus || 'none';
  const hasUserAlreadySubmitted = userSubmittedMatchIds.includes(match.id);

  const toggleExpand = (e: React.MouseEvent) => {
    // Prevent toggling when clicking buttons or links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const getActionButton = () => {
    if (['lobby_open', 'match_in_progress'].includes(match.status)) {
      return (
        <Link 
          to={`/matches/${match.id}`} 
          className="btn-primary py-2 px-4 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl bg-emerald-600 border-emerald-500 text-center inline-block"
        >
          ENTER MATCH
        </Link>
      );
    }
    if (match.status === 'awaiting_result') {
      if (hasUserAlreadySubmitted) {
        return (
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest italic leading-none">Verification Pending</span>
          </div>
        );
      } else {
        return (
          <Link 
            to={`/matches/${match.id}`} 
            className="btn-primary py-2 px-4 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl text-center inline-block"
          >
            SUBMIT RESULT
          </Link>
        );
      }
    }
    if (match.status === 'under_review' || (verificationStatus === 'single_submission' && hasUserAlreadySubmitted)) {
      return (
        <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest italic leading-none">Verification Pending</span>
        </div>
      );
    }
    if (verificationStatus === 'single_submission' && !hasUserAlreadySubmitted) {
      return (
        <Link 
          to={`/matches/${match.id}`} 
          className="btn-primary py-2 px-4 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl text-center inline-block"
        >
          SUBMIT RESULT
        </Link>
      );
    }
    return (
      <Link 
        to={`/matches/${match.id}`} 
        className="btn-primary py-2 px-4 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl text-center inline-block"
      >
        DEPLOY
      </Link>
    );
  };

  const getInstructionsText = () => {
    switch (match.status) {
      case 'lobby_open':
      case 'match_in_progress':
        return 'Lobby is open! Join your opponent inside the game lobby, carry out your match, ensure you capture screenshots, and then submit the final results.';
      case 'awaiting_result':
        if (verificationStatus === 'disputed') {
          return 'Discrepancy detected! You and your opponent submitted conflicting scores. Please submit clear screenshots for review by our moderation team.';
        }
        return 'Match finished! Both players need to upload screenshots and specify the scores to verify the win securely.';
      case 'under_review':
        return 'This match is currently flagged and under manual review by the Tournahub admin team. Results will be verified and resolved shortly.';
      default:
        return 'Make sure to be online and available at the scheduled time. Failure to show up within the grace period results in auto-forfeiture.';
    }
  };

  return (
    <div className="relative">
      <div 
        onClick={toggleExpand}
        className={cn(
          "card p-0 transition-all duration-300 group rounded-2xl relative z-10 flex flex-col overflow-hidden bg-gradient-to-br from-surface to-background border-border-main hover:border-primary/30",
          isExpanded && "border-primary/50 shadow-xl shadow-primary/5",
          verificationStatus === 'disputed' && "border-red-500/50 hover:border-red-500"
        )}
      >
        {/* Main Brief Row */}
        <div className="p-4 md:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 cursor-pointer select-none">
          <div className="flex items-center space-x-4 md:space-x-6 w-full sm:w-auto">
            <div className="text-center shrink-0 min-w-[3.5rem] bg-surface p-2 rounded-xl border border-border-main">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Round</p>
              <p className="text-xl font-black text-primary italic leading-none">{match.round || '1'}</p>
            </div>
            <div className="h-10 w-px bg-border-main hidden sm:block" />
            <div className="min-w-0 flex-1 sm:flex-initial">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-xs md:text-sm text-amber-500 font-black uppercase italic tracking-widest truncate max-w-[150px] sm:max-w-none">
                  {match.tournaments?.name || 'Tournament Event'}
                </p>
                <VerificationStatusBadge status={verificationStatus} size="sm" />
              </div>
              <p className="text-base md:text-lg font-black text-text-main italic tracking-tighter uppercase truncate">
                {opponentName} <span className="text-text-muted px-2 italic font-medium tracking-normal text-sm">vs</span> YOU
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border-main">
            <div className="text-left sm:text-right">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 sm:text-right">Schedule</p>
              <p className="text-xs sm:text-sm font-black text-text-main flex items-center sm:justify-end italic uppercase tracking-tighter col-span-1">
                <Timer className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
                {((match as any).scheduled_date && (match as any).scheduled_time) 
                  ? formatFixtureTime((match as any).scheduled_date, (match as any).scheduled_time, (match as any).timezone)
                  : (match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Time TBD')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {getActionButton()}
              <div className="w-8 h-8 rounded-xl bg-surface border border-border-main flex items-center justify-center text-text-muted hover:text-primary transition-colors">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        {/* Dropping Down Detailed Section */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-border-main/50"
            >
              <div className="p-5 space-y-4 bg-background/30">
                {/* Visual Header / Card info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface/50 border border-border-main rounded-xl p-3">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">STATION STAGE</p>
                    <p className="text-xs font-black text-text-main uppercase italic truncate">
                      {match.stage === 'group_stage' ? 'Group Stage' : 'Playoffs'}
                    </p>
                  </div>
                  <div className="bg-surface/50 border border-border-main rounded-xl p-3">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">TOURNAMENT PRIZE</p>
                    <p className="text-xs font-black text-emerald-500 uppercase italic truncate">
                      {formatCurrency(match.tournaments?.prize_pool || 0)}
                    </p>
                  </div>
                  <div className="bg-surface/50 border border-border-main rounded-xl p-3 col-span-1 sm:col-span-2">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">MAPS / MATCH TYPE</p>
                    <p className="text-xs font-black text-text-main uppercase italic truncate">
                      {match.tournaments?.type || 'Double Elimination'} • Best of 3
                    </p>
                  </div>
                </div>

                {/* Instructions Drawer */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Tv className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">PREPARATION PROTOCOL</p>
                    <p className="text-xs font-bold text-text-muted leading-relaxed">
                      {getInstructionsText()}
                    </p>
                  </div>
                </div>

                {/* Quick Opponent comparison card */}
                {opponent && (
                  <div className="flex items-center justify-between p-3 bg-surface/40 border border-border-main rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-border-main overflow-hidden flex items-center justify-center font-black text-xs text-primary">
                        {opponent.avatar_url ? (
                          <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          opponentName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-text-main leading-none uppercase italic">{opponentName}</p>
                        <p className="text-[9px] text-text-muted font-bold tracking-widest uppercase mt-1">Opponent Contender</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="px-2.5 py-1 bg-surface border border-border-main rounded-lg text-[9px] font-black uppercase text-text-muted">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                )}

                {/* Direct redirectional CTA link */}
                <Link 
                  to={`/matches/${match.id}`}
                  className="w-full py-3 px-4 bg-primary text-black font-black uppercase italic tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-all duration-200 active:scale-98 shadow-lg shadow-primary/10 mt-1"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>OPEN MATCH ACTION CENTER</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {verificationStatus !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2"
          >
            <VerificationStatusBanner 
              status={verificationStatus} 
              score1={match.score1} 
              score2={match.score2} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TournamentSmallCard({ tournament }: { tournament: Tournament; key?: string }) {
  return (
    <Link to={`/tournaments/${tournament.id}`} className="card p-3 hover:bg-surface-hover transition-all duration-300 flex items-center space-x-4 group rounded-2xl border border-border-main">
      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
        <img src={tournament.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-text-main italic tracking-tighter uppercase truncate">{tournament.name}</p>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{tournament.type}</p>
      </div>
      <StatusBadge status={tournament.status} />
    </Link>
  );
}
