import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, Users, Wallet, 
  ArrowUpRight, Gamepad2, Timer,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn, getPublicIdentity } from '../lib/utils';
import { Tournament, Match, Wallet as WalletType } from '../types/database';
import { Link } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { matchService } from '../services/matchService';
import { walletService } from '../services/walletService';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';
import StatusBadge from '../components/ui/StatusBadge';
import { TournamentStatus } from '../constants';

import { useRealtimeTournaments } from '../hooks/useRealtimeTournaments';

import VerificationStatusBadge from '../components/match/VerificationStatusBadge';
import VerificationStatusBanner from '../components/match/VerificationStatusBanner';
import { VerificationStatus } from '../types/verification.types';
import RecentChampions from '../components/home/RecentChampions';

export default function Dashboard() {
  const { user, profile } = useAuth();
  
  const activeStatus = React.useMemo(() => [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.REGISTRATION_CLOSED,
    TournamentStatus.SEEDING,
    TournamentStatus.FIXTURE_GENERATION,
    TournamentStatus.READY,
    TournamentStatus.ONGOING
  ], []);
  const completedStatus = TournamentStatus.COMPLETED;

  // Only fetch upcoming/ongoing tournaments for the main slider
  const { tournaments: activeTournaments, loading: activeLoading } = useRealtimeTournaments(activeStatus, 10);
  // Separate fetch for completed tournaments for the hall of fame
  const { tournaments: completedTournaments, loading: completedLoading } = useRealtimeTournaments(completedStatus, 6);
  
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [userStats, setUserStats] = useState({ totalMatches: 0, wins: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);

  const isDashboardLoading = loading || activeLoading || completedLoading;

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    if (!user) return;
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
       setLoading(false);
       console.warn('[Dashboard] Data loading timed out after 10s');
    }, 10000);

    try {
      const [matchesRes, statsRes] = await Promise.allSettled([
        matchService.getUserMatches(user.id),
        matchService.getUserStats(user.id)
      ]);

      if (matchesRes.status === 'fulfilled') {
        const matches = (matchesRes.value as any) || [];
        // Show matches that are pending, ongoing, or awaiting results/review
        const filteredMatches = matches.filter((m: any) => 
          ['pending', 'ongoing', 'awaiting_result', 'match_in_progress', 'lobby_open', 'under_review'].includes(m.status)
        ).slice(0, 5);
        setScheduledMatches(filteredMatches);
      }

      if (statsRes.status === 'fulfilled') {
        setUserStats(statsRes.value as any);
      }
      
      clearTimeout(timeoutId);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      clearTimeout(timeoutId);
    } finally {
      setLoading(false);
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
                    duration: 35, 
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
                      <div>
                        <p className="text-xl font-black text-text-main italic uppercase tracking-tighter">No active arena battles</p>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1">Start by creating a tournament in the admin panel.</p>
                      </div>
                      <Link to="/admin/tournaments" className="btn-secondary inline-block px-10 py-3 text-xs uppercase italic font-black">
                        Create Tournament
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Prize Winners Slider (Hall of Fame) */}
        <RecentChampions />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          {/* Main Feed: Scheduled Matches */}
            <motion.div variants={item} className="lg:col-span-2 space-y-6">
            <SectionHeader title="Next Scheduled Battles" link="/matches" />
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {scheduledMatches.length > 0 ? (
                  scheduledMatches.map((match) => (
                    <motion.div key={match.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <MatchCard match={match} />
                    </motion.div>
                  ))
                ) : (
                  <div className="card p-12 text-center text-text-muted italic rounded-3xl border-dashed border-2 border-border-main">
                    No matches found. Go join a tournament!
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sidebar Feed */}
          <div className="space-y-8">
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

function MatchCard({ match }: { match: any }) {
  const { user } = useAuth();
  const opponent = match.player1?.id === user?.id ? match.player2 : match.player1;
  const opponentName = getPublicIdentity(opponent);
  
  const verificationStatus = match.result_verification_status as VerificationStatus || 'none';

  const getActionButton = () => {
    if (['lobby_open', 'match_in_progress'].includes(match.status)) {
      return <button className="btn-primary py-2 px-6 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl bg-emerald-600 border-emerald-500">ENTER MATCH</button>;
    }
    if (match.status === 'awaiting_result' && ['none', 'disputed'].includes(verificationStatus)) {
      return <button className="btn-primary py-2 px-6 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl">SUBMIT RESULT</button>;
    }
    if (match.status === 'under_review' || verificationStatus === 'single_submission') {
      return (
        <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest italic">Verification Pending</span>
        </div>
      );
    }
    return <button className="btn-primary py-2 px-6 text-[10px] shadow-none group-hover:shadow-lg group-hover:shadow-primary/20 rounded-xl">DEPLOY</button>;
  };

  return (
    <div className="relative">
      <Link to={`/matches/${match.id}`} className={cn(
        "card p-4 md:p-5 hover:border-primary/50 transition-all duration-300 group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl relative z-10",
        verificationStatus === 'disputed' && "border-red-500/50 hover:border-red-500"
      )}>
        <div className="flex items-center space-x-4 md:space-x-6 w-full sm:w-auto">
          <div className="text-center shrink-0 min-w-[3.5rem] bg-surface p-2 rounded-xl border border-border-main">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Round</p>
            <p className="text-xl font-black text-primary italic leading-none">{match.round || '1'}</p>
          </div>
          <div className="h-10 w-px bg-border-main hidden sm:block" />
          <div className="min-w-0">
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
        <div className="flex items-center justify-between sm:justify-end space-x-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-border-main">
          <div className="text-left sm:text-right">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 sm:text-right">Schedule</p>
            <p className="text-xs sm:text-sm font-black text-text-main flex items-center sm:justify-end italic uppercase tracking-tighter">
              <Timer className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
            </p>
          </div>
          {getActionButton()}
        </div>
      </Link>
      
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
