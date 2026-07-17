import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Tournament } from '../types/database';
import { tournamentService } from '../services/tournamentService';
import { useRealtimeTournament } from '../hooks/useRealtimeTournaments';
import Shell from '../components/layout/Shell';
import { 
  Trophy, Users, Calendar, Info, 
  ChevronRight, ArrowLeft, CheckCircle2, Shield, Loader2,
  Clock, Wifi, Ban, Scale, X, ExternalLink, ShieldAlert,
  Share2
} from 'lucide-react';
import { formatCurrency, formatDate, cn, getStorageUrl } from '../lib/utils';
import { shareContent } from '../utils/share';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';
import StandingsTable from '../components/standings/StandingsTable';
import FixturesList from '../components/fixtures/FixturesList';
import GroupStageTournamentView from '../components/tournament/GroupStageTournamentView';
import StatusBadge from '../components/ui/StatusBadge';
import { TournamentStatus } from '../constants';
import BadgeSelector from '../components/badges/BadgeSelector';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { useWallet } from '../hooks/useWallet';
import toast from 'react-hot-toast';
import StorageImage from '../components/common/StorageImage';
import SEO from '../components/common/SEO';

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  
  const fetchTournamentData = () => {
    loadRegistrations();
    loadRegistrationStatus();
    refreshWallet();
  };

  useRefetchOnFocus(fetchTournamentData);

  const navigate = useNavigate();
  const location = useLocation();
  const { summary, limits, refreshWallet } = useWallet('USD');
  
  const { tournament, loading: tournamentLoading } = useRealtimeTournament(id);
  const [regStatus, setRegStatus] = useState<{
    registered: boolean;
    user_status: string | null;
    registration_id: string | null;
    players_registered: number;
    max_players: number;
    spots_left: number;
    tournament_status: string;
  } | null>(null);

  const [isRegStatusLoading, setIsRegStatusLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'fixtures' | 'standings' | 'players'>('info');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Registration Flow State
  const [showRegFlow, setShowRegFlow] = useState(false);
  const [regStep, setRegStep] = useState<'picker' | 'confirm'>('picker');
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  // Pre-registration Rules Overlay state
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const [acceptedRulesCheck, setAcceptedRulesCheck] = useState(false);

  // Profile completion warning modal state
  const [showProfileCompleteModal, setShowProfileCompleteModal] = useState(false);

  const isProfileIncomplete = !profile?.username || !profile.username.trim() || !profile?.whatsapp_number || !profile.whatsapp_number.trim();

  useEffect(() => {
    isInitialLoad.current = true;
    if (!id) return;
    
    loadRegistrations();
    loadRegistrationStatus();
    
    // Realtime subscription for registrations and badges
    const channel = supabase
      .channel(`tournament-activity-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `tournament_id=eq.${id}`,
        },
        () => {
          loadRegistrations();
          loadRegistrationStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${id}`,
        },
        () => {
          loadRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, refetchSignal]);

  useEffect(() => {
    if (tournamentLoading === false && !tournament) {
      // Tournament was deleted or not found
      navigate('/tournaments');
    }
  }, [tournament, tournamentLoading, navigate]);

  async function loadRegistrationStatus() {
    if (!id || !user) {
      setIsRegStatusLoading(false);
      return;
    }
    try {
      if (isInitialLoad.current) {
        setIsRegStatusLoading(true);
      }
      const status = await tournamentService.getRegistrationStatus(id, user.id);
      if (status) {
        setRegStatus(status);
        setMessage(null); // Clear any stale errors
      }
    } catch (err: any) {
      console.warn('Error loading registration status:', err);
      // If it's a lock error, it might recover on the next refresh/subscription event
      if (err.message?.includes('Lock')) {
        console.info('Retrying registration status load due to lock...');
        setTimeout(loadRegistrationStatus, 1000);
      }
    } finally {
      setIsRegStatusLoading(false);
      isInitialLoad.current = false;
    }
  }

  async function loadRegistrations() {
    if (!id) return;
    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const players = await tournamentService.getRegisteredPlayers(id);
      // Deduplicate to prevent double entries in standings and players list
      const uniquePlayers = Array.isArray(players) ? players.reduce((acc: any[], current: any) => {
        const currentId = current.user_id || current.id;
        if (!acc.some(p => (p.user_id || p.id) === currentId)) {
          acc.push(current);
        }
        return acc;
      }, []) : [];
      setRegistrations(uniquePlayers);
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }

  const handleRegisterWithBadge = async (badgeId: string) => {
    if (!user || !tournament || !id) return;

    if (isProfileIncomplete) {
      setShowProfileCompleteModal(true);
      return;
    }

    // 1. Pre-check wallet if tournament has entry fee
    if (tournament.entry_fee > 0) {
      if (limits?.is_locked) {
        toast.error(`Your wallet is locked: ${limits.locked_reason}`);
        return;
      }
      if ((summary?.balance_usd || 0) < tournament.entry_fee) {
        toast.error(`Insufficient balance. You need $${tournament.entry_fee.toFixed(2)} USD. Top up your wallet.`);
        return;
      }
    }

    setRegistering(true);
    setMessage(null);
    try {
      const result = await tournamentService.register(id, badgeId);
      
      if (result.success) {
        setShowRegFlow(false);
        const successMsg = (result as any).already_registered 
          ? 'You are already registered for this tournament!'
          : `Registered! ${tournament.entry_fee > 0 ? `$${tournament.entry_fee} entry fee deducted.` : ''}`;
        
        setMessage({ type: 'success', text: successMsg });
        
        // Refresh wallet and status
        await Promise.all([
          refreshWallet(),
          loadRegistrations(),
          loadRegistrationStatus()
        ]);
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('already registered')) {
        setMessage({ type: 'success', text: 'You are already registered for this tournament!' });
        setShowRegFlow(false);
        loadRegistrationStatus();
        return;
      }
      console.error('[TournamentDetails] Registration failed:', err);
      const code = err.code || (err.message?.includes('BADGE_TAKEN') ? 'BADGE_TAKEN' : null);
      
      switch (code) {
        case 'BADGE_TAKEN':
          setMessage({ type: 'error', text: 'That badge was just taken. Please choose another.' });
          setRegStep('picker');
          break;
        case 'BADGE_REQUIRED':
          setMessage({ type: 'error', text: 'Please select a badge before registering.' });
          setRegStep('picker');
          break;
        case 'TOURNAMENT_FULL':
          setMessage({ type: 'error', text: 'This tournament is full. Registration is closed.' });
          setShowRegFlow(false);
          break;
        case 'insufficient_balance':
          setMessage({ type: 'error', text: 'Insufficient wallet balance for this entry fee.' });
          setShowRegFlow(false);
          break;
        default:
          setMessage({ type: 'error', text: err.message || 'Registration failed.' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterClick = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/tournaments/${id}` } });
      return;
    }

    if (isProfileIncomplete) {
      setShowProfileCompleteModal(true);
      return;
    }

    setAcceptedRulesCheck(false);
    setShowRulesPopup(true);
  };

  const handleConfirmRulesAndProceed = async () => {
    if (isProfileIncomplete) {
      setShowProfileCompleteModal(true);
      return;
    }

    setShowRulesPopup(false);

    try {
      await refreshWallet();
    } catch (err) {
      console.warn('[handleConfirmRulesAndProceed] refreshWallet error:', err);
    }

    if (tournament.entry_fee > 0) {
      const walletIsLocked = summary?.is_locked === true || limits?.is_locked === true;
      if (walletIsLocked) {
        const reason = summary?.locked_reason || limits?.locked_reason;
        toast.error(`Your wallet is locked. Please contact support.${reason ? ` Reason: ${reason}` : ''}`);
        return;
      }
    }

    setShowRegFlow(true);
    setRegStep('picker');
  };

  // Auto-trigger join tournament flow if redirected back after completing profile
  useEffect(() => {
    if (location.state?.autoJoin && !tournamentLoading && regStatus && !regStatus.registered && !isProfileIncomplete) {
      // Clear state so it doesn't run on reload/re-render
      navigate(location.pathname, { replace: true, state: null });
      handleRegisterClick();
    }
  }, [location.state, tournamentLoading, regStatus, isProfileIncomplete, id]);

  const handleCancel = async () => {
    if (!user || !id) return;
    if (!confirm('Are you sure you want to cancel your registration?')) return;
    
    setRegistering(true);
    setMessage(null);
    try {
      const result = await tournamentService.cancelRegistration(id);
      if (result.success) {
        let msg = 'Registration cancelled successfully.';
        if (result.refund_issued) msg += ' Refund has been issued to your wallet.';
        
        setMessage({ type: 'success', text: msg });
        setTimeout(() => setMessage(null), 5000);
        
        // Refresh wallet and status
        await Promise.all([
          refreshWallet(),
          loadRegistrations(),
          loadRegistrationStatus()
        ]);
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Cancellation failed';
      if (errorMsg.includes('Cannot cancel after tournament has started')) {
        errorMsg = 'Cancellations are only allowed before fixtures are generated';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setRegistering(false);
    }
  };

  if (tournamentLoading || (loading && !registrations.length)) {
    return (
      <Shell>
        <LoadingState message="Accessing Tournament Crypt..." />
      </Shell>
    );
  }

  if (!tournament) return null;

  const isPaidTournament = (tournament.entry_fee ?? 0) > 0;
  const currentPrizePool = isPaidTournament 
    ? ((tournament as any).escrow_balance_usd || 0) 
    : (tournament.prize_pool || 0);

  const isRegistered = !!(
    (regStatus && regStatus.registered) || 
    (registrations || []).some(r => (r.user_id === user?.id || r.id === user?.id) && ['registered', 'approved', 'checked_in'].includes(r.status || ''))
  );
  
  const activeRegistrations = (registrations || []).filter(r => 
    !['cancelled', 'withdrawn', 'rejected', 'refunded'].includes(r.status || '')
  );

  const playersCount = registrations.length;

  const spotsLeft = Math.max(0, (tournament.max_players || 0) - registrations.length);

  const currentStatus = regStatus?.tournament_status || tournament.status;
  const isClosed = currentStatus !== TournamentStatus.REGISTRATION_OPEN;
  
  const canRegister = !isRegistered && currentStatus === TournamentStatus.REGISTRATION_OPEN && spotsLeft > 0;
  const isActuallyFull = spotsLeft <= 0 && !isRegistered;
  const isActionDisabled = registering || isRegStatusLoading || !user || isRegistered;

  const pageTitle = tournament ? `${tournament.name} Tournament Details` : "Tournament Bracket & Standings";
  const pageDescription = tournament 
    ? `Register and compete in ${tournament.name} on Tournahub. Format: ${(tournament as any).format || tournament.type}, Mode: ${(tournament as any).game_mode || 'eFootball'}, Prize Pool: ${formatCurrency(tournament.prize_pool || 0)}. View updated fixtures, standings, and results.`
    : "Track active tournament brackets, live status updates, match rankings, and standings on Tournahub.";

  const dynamicSchema = tournament ? {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": tournament.name,
    "startDate": tournament.start_date || new Date().toISOString(),
    "description": `Football/eFootball tournament ${tournament.name} on Tournahub. Format: ${(tournament as any).format || tournament.type}. Game Mode: ${(tournament as any).game_mode || 'eFootball'}. Status: ${tournament.status}.`,
    "sport": "Soccer / eFootball",
    "organizer": {
      "@type": "SportsOrganization",
      "name": "Tournahub",
      "url": "https://tournahub.me"
    }
  } : undefined;

  return (
    <Shell>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        path={`/tournaments/${id}`}
        schemaData={dynamicSchema}
      />
      <div className="space-y-8">
        <button 
          onClick={() => navigate('/tournaments')}
          className="flex items-center text-text-muted hover:text-text-main transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Tournaments
        </button>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "px-6 py-4 rounded-2xl font-bold uppercase italic tracking-tighter shadow-xl flex items-center gap-3",
                message.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              )}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}

          {isRegistered && regStatus && !(regStatus as any).has_badge && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-amber-500 animate-pulse" />
                <div>
                  <p className="text-amber-500 font-black uppercase italic tracking-tight">Identity Missing</p>
                  <p className="text-amber-500/70 text-[10px] font-bold uppercase tracking-widest">You registered but have not selected a badge yet. Fix this now to avoid disqualification.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const el = document.getElementById('badge-picker-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shrink-0"
              >
                Select Badge
              </button>
            </motion.div>
          )}

        {/* Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-64 sm:h-80 md:h-96 rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-border-main shadow-2xl"
        >
          <StorageImage 
            bucket="tournament-banners" 
            path={tournament.banner_url} 
            className="w-full h-full object-cover" 
            alt={tournament.name}
            fallbackUrl="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200"
          />

          <div className="absolute top-6 right-6 z-10">
            <button 
              type="button"
              title="Share Tournament"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const shortDesc = tournament.description 
                  ? (tournament.description.length > 120 
                      ? tournament.description.slice(0, 117) + '...' 
                      : tournament.description)
                  : 'Join this exciting tournament on TournaHub!';
                const currentPlayers = regStatus?.players_registered ?? registrations.length ?? 0;
                const maxPlayers = regStatus?.max_players ?? tournament.max_players ?? 16;
                await shareContent({
                  title: `🏆 ${tournament.name}`,
                  text: `${shortDesc}\n\nJoin this ${(tournament as any).format || tournament.type || 'eFootball'} event on TournaHub.\n🎮 Slots: ${currentPlayers}/${maxPlayers}\n💰 Prize Pool: ${tournament.prize_pool ? formatCurrency(tournament.prize_pool) : 'N/A'}\n🎟️ Entry Fee: ${tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}`,
                  url: `${window.location.origin}/tournaments?q=${encodeURIComponent(tournament.name)}`,
                  imageUrl: tournament.banner_url ? getStorageUrl('tournament-banners', tournament.banner_url) : null
                });
              }}
              className="w-10 h-10 rounded-full border border-border-main bg-background/80 hover:bg-primary hover:text-black hover:border-transparent text-text-main flex items-center justify-center shadow-lg transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-110 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/20 text-primary border border-primary/20 text-[10px] sm:text-xs font-black uppercase rounded-full tracking-widest shadow-lg shadow-primary/10">
                  {tournament.type}
                </span>
                <StatusBadge status={regStatus?.tournament_status || tournament.status} />
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-yellow-400 italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                {tournament.name}
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="bg-background/80 backdrop-blur-md border border-border-main px-6 sm:px-8 py-3 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Contenders</span>
                <span className="text-xl font-black text-text-main italic">
                  {String(playersCount)} / {tournament.max_players}
                </span>
                {currentStatus === TournamentStatus.REGISTRATION_OPEN && (
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter mt-1",
                    spotsLeft > 0 ? "text-primary" : "text-red-500"
                  )}>
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                  </span>
                )}
              </div>
              
              {isRegistered ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <button 
                    disabled
                    className="w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center shadow-xl shadow-emerald-500/5 cursor-not-allowed opacity-90"
                  >
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    Registered
                  </button>
                  {(regStatus?.user_status === 'registered' || regStatus?.user_status === 'approved' || regStatus?.user_status === 'checked_in') && (
                    <button 
                      onClick={handleCancel}
                      disabled={registering}
                      className="text-zinc-500 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-colors p-2"
                    >
                      Leave Arena
                    </button>
                  )}
                </div>
              ) : isActuallyFull ? (
                <div className="bg-slate-800 border-2 border-slate-700 text-slate-400 px-10 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center w-full md:w-auto opacity-75">
                  Tournament Full
                </div>
              ) : isClosed ? (
                <div className="bg-slate-800 border-2 border-slate-700 text-slate-400 px-10 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center w-full md:w-auto opacity-75">
                  Registration Closed
                </div>
              ) : (
                <button 
                  onClick={handleRegisterClick}
                  disabled={isActionDisabled || !canRegister || isRegistered}
                  className="btn-primary w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 shadow-2xl shadow-primary/30 text-lg sm:text-xl font-black uppercase italic tracking-tighter rounded-xl sm:rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                >
                  {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Claim Spot'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showProfileCompleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfileCompleteModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              
              {/* Modal Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#090b16] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col z-50 text-left"
              >
                {/* Header panel */}
                <div className="p-6 pb-4 shrink-0 flex items-start justify-between border-b border-white/5 bg-[#0b0e1e]/60">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-450/10 border border-rose-400/20 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> Setup Required
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2 mt-1">
                      ⚠️ Profile Incomplete
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowProfileCompleteModal(false)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <p className="text-sm text-zinc-300 leading-relaxed font-semibold">
                    To maintain high integrity, fair-play coordination, and seamless matchmaking inside TournaHub, all contenders are required to complete their profile setup before claiming tournament slots.
                  </p>
                  
                  <div className="space-y-3 bg-[#0b0d19]/80 border border-zinc-800/40 rounded-2xl p-4">
                    <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Required Checklist:</h4>
                    
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        profile?.username ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {profile?.username ? "✓" : "1"}
                      </div>
                      <span className={cn("text-xs font-bold", profile?.username ? "text-zinc-400" : "text-white")}>
                        Tournament Username
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        profile?.whatsapp_number ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 animate-pulse"
                      )}>
                        {profile?.whatsapp_number ? "✓" : "2"}
                      </div>
                      <span className={cn("text-xs font-bold", profile?.whatsapp_number ? "text-zinc-400" : "text-white")}>
                        WhatsApp Number <span className="text-rose-400 font-extrabold text-[10px] uppercase ml-1">(Required)</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 italic">
                    Why WhatsApp? TournaHub shares your WhatsApp details exclusively with your matched opponents during the tournament to coordinate lobby setup, results verification, and direct play support.
                  </p>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-white/5 bg-[#0b0e1e]/60 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setShowProfileCompleteModal(false);
                      navigate('/complete-profile', { state: { redirectTo: `/tournaments/${id}`, forwardedState: { autoJoin: true } } });
                    }}
                    className="w-full relative group overflow-hidden rounded-xl h-12 flex items-center justify-center cursor-pointer transition-all duration-200"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-[#d4af37] transition-transform group-hover:scale-105" />
                    <span className="relative z-10 text-xs text-black font-black uppercase italic tracking-wider">
                      Complete Profile
                    </span>
                  </button>
                  <button
                    onClick={() => setShowProfileCompleteModal(false)}
                    className="w-full py-3 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all text-center"
                  >
                    Decide Later
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showRulesPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRulesPopup(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              
              {/* Modal Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#090b16] border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] z-10"
              >
                {/* Header panel */}
                <div className="p-6 pb-4 shrink-0 flex items-start justify-between border-b border-white/5 bg-[#0b0e1e]/60">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      <Shield className="w-3 h-3" /> Mandatory
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                      🏆 Before You Join
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Please review these important tournament rules.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowRulesPopup(false)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rules List Container */}
                <div className="p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
                  
                  {/* 1. Match Availability */}
                  <div className="flex gap-3 p-3 bg-white/2 hover:bg-white/4 border border-white/5 rounded-xl transition-all">
                    <div className="p-2 h-fit bg-amber-400/10 border border-amber-400/20 rounded-lg text-amber-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">⏰ Match Availability</h4>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        Be available at the scheduled match time. Failure to play may result in automatic loss.
                      </p>
                    </div>
                  </div>

                  {/* 2. Result Submission */}
                  <div className="flex gap-3 p-3 bg-white/2 hover:bg-white/4 border border-white/5 rounded-xl transition-all">
                    <div className="p-2 h-fit bg-sky-400/10 border border-sky-400/20 rounded-lg text-sky-400 shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">📤 Result Submission</h4>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        Submit your results before the deadline. Fake results lead to permanent account banning.
                      </p>
                    </div>
                  </div>

                  {/* 3. Stable Internet Required */}
                  <div className="flex gap-3 p-3 bg-[#090b16] border border-white/5 rounded-xl transition-all">
                    <div className="p-2 h-fit bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 shrink-0">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">🌐 Stable Internet Required</h4>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        Poor connection or intentional disconnection may lead to match loss.
                      </p>
                    </div>
                  </div>

                  {/* 4. No Match Cancellation */}
                  <div className="flex gap-3 p-3 bg-white/2 hover:bg-white/4 border border-white/5 rounded-xl transition-all">
                    <div className="p-2 h-fit bg-rose-400/10 border border-rose-400/20 rounded-lg text-rose-400 shrink-0">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">🚫 No Match Cancellation</h4>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        Once you join a tournament, cancellation is not allowed.
                      </p>
                    </div>
                  </div>

                  {/* 5. Fair Play */}
                  <div className="flex gap-3 p-3 bg-[#090b16] border border-white/5 rounded-xl transition-all">
                    <div className="p-2 h-fit bg-purple-400/10 border border-purple-400/20 rounded-lg text-purple-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">⚖️ Fair Play</h4>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        Respect opponents and follow tournament guidelines.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Footer Agreement & Actions */}
                <div className="p-6 border-t border-white/5 bg-[#0b0e1e]/60 space-y-4 shrink-0">
                  {/* Agreement checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center h-5 mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={acceptedRulesCheck}
                        onChange={(e) => setAcceptedRulesCheck(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded-md border border-white/20 bg-white/5 group-hover:border-[#d4af37]/50 peer-checked:border-[#d4af37] peer-checked:bg-[#d4af37] transition-all flex items-center justify-center text-black">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3] hidden peer-checked:block text-[#040511]" />
                      </div>
                    </div>
                    <span className="text-[11.5px] font-semibold text-zinc-300 leading-normal select-none group-hover:text-white transition-colors">
                      I have read and agree to the <span className="text-[#d4af37] font-bold">Tournament Rules & Guidelines</span>.
                    </span>
                  </label>

                  {/* Buttons group */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRulesPopup(false);
                        navigate('/rules');
                      }}
                      className="flex items-center justify-center gap-1.5 p-3.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#d4af37]" /> View Full Rules
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRulesAndProceed}
                      disabled={!acceptedRulesCheck}
                      className="relative overflow-hidden p-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                    >
                      {acceptedRulesCheck ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-[#d4af37] hover:brightness-110 active:brightness-90 transition-all" />
                          <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] transition-opacity" />
                          <span className="relative text-black flex items-center justify-center gap-1">
                            Join Tournament
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-white/5 border border-white/10" />
                          <span className="relative text-zinc-500">Join Tournament</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}

          {showRegFlow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRegFlow(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              >
                {regStep === 'picker' ? (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-text-main uppercase italic tracking-tighter">Choose Your <span className="text-primary">Identity</span></h2>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Select a unique badge for this arena</p>
                      </div>
                      <button onClick={() => setShowRegFlow(false)} className="text-text-muted hover:text-text-main uppercase text-[10px] font-black tracking-widest">Cancel</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <BadgeSelector 
                        tournamentId={id!} 
                        tournamentStatus={currentStatus}
                        mode="registration" 
                        onSelect={(badgeId) => {
                          setSelectedBadge(badgeId);
                          refreshWallet().catch(err => console.warn('[BadgeSelector onSelect] refreshWallet failed:', err));
                          setRegStep('confirm');
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  (tournament.entry_fee ?? 0) > 0 ? (
                    <div className="p-8 sm:p-10 space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-text-main uppercase italic tracking-tighter">
                          Confirm <span className="text-primary">Payment</span>
                        </h2>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest leading-none">
                          Entry ticket check for {tournament.name}
                        </p>
                      </div>

                      <div className="space-y-4 bg-surface rounded-3xl border border-border-main p-6 sm:p-8">
                        <div className="flex items-center gap-4 border-b border-border-main pb-4">
                          <div className="w-14 h-14 relative shrink-0">
                            <PlayerBadge badgeId={selectedBadge} username="You" size="md" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Identity Selected</p>
                            <p className="text-sm font-bold text-text-main">Ready for deployment</p>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-text-muted font-bold uppercase text-xs tracking-wider">Entry Fee</span>
                            <span className="text-text-main font-black italic text-lg">{formatCurrency(tournament.entry_fee)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-text-muted font-bold uppercase text-xs tracking-wider">Current Balance</span>
                            <span className={cn(
                              "font-black italic text-md",
                              (summary?.balance_usd ?? 0) < tournament.entry_fee ? "text-red-500 font-extrabold" : "text-text-main"
                            )}>
                              {formatCurrency(summary?.balance_usd ?? 0)}
                            </span>
                          </div>
                          {(summary?.balance_usd ?? 0) >= tournament.entry_fee && (
                            <div className="flex justify-between items-center border-t border-border-main pt-3">
                              <span className="text-text-muted font-bold uppercase text-xs tracking-wider">Balance After Deduction</span>
                              <span className="text-emerald-500 font-black italic text-md">
                                {formatCurrency((summary?.balance_usd ?? 0) - tournament.entry_fee)}
                              </span>
                            </div>
                          )}
                        </div>

                        {(summary?.balance_usd ?? 0) < tournament.entry_fee ? (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center space-y-3">
                            <p className="text-red-500 font-extrabold uppercase italic tracking-normal text-xs leading-relaxed">
                              Insufficient balance. Top up your wallet to join.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRegFlow(false);
                                navigate('/wallet');
                              }}
                              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Top Up Wallet Now
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                            <p className="text-amber-500 font-extrabold uppercase italic tracking-normal text-[10px] sm:text-xs leading-relaxed">
                              Warning: {formatCurrency(tournament.entry_fee)} USD will be deducted immediately from your wallet.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <button 
                          onClick={() => setShowRegFlow(false)}
                          className="btn-secondary py-4 font-black uppercase italic tracking-tighter rounded-2xl"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleRegisterWithBadge(selectedBadge!)}
                          disabled={registering || (summary?.balance_usd ?? 0) < tournament.entry_fee}
                          className="btn-primary py-4 font-black uppercase italic tracking-tighter rounded-2xl shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {registering ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm & Pay'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 space-y-8">
                      <div className="text-center space-y-2">
                          <h2 className="text-3xl font-black text-text-main uppercase italic tracking-tighter">Confirm <span className="text-primary">Engagement</span></h2>
                          <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Final review before deployment</p>
                      </div>

                      <div className="flex flex-col items-center py-8 bg-surface rounded-3xl border border-border-main space-y-6">
                        <div className="w-32 h-32 relative">
                          <PlayerBadge badgeId={selectedBadge} username="You" size="xl" />
                          <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-background">Selected</div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-1">Entry Ticket</p>
                          <p className="text-2xl font-black text-text-main italic">FREE ENTRY</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <button 
                          onClick={() => setRegStep('picker')}
                          className="btn-secondary py-4 font-black uppercase italic tracking-tighter rounded-2xl"
                        >
                          Change Badge
                        </button>
                        <button 
                          onClick={() => handleRegisterWithBadge(selectedBadge!)}
                          disabled={registering}
                          className="btn-primary py-4 font-black uppercase italic tracking-tighter rounded-2xl shadow-lg shadow-primary/20"
                        >
                          {registering ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Join'}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {id && isRegistered && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <BadgeSelector 
                tournamentId={id}
                tournamentStatus={currentStatus}
                mode="management"
                onSelect={() => {
                  loadRegistrations();
                  loadRegistrationStatus();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="card divide-y divide-slate-800">
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prize Pool</h3>
                <p className="text-4xl font-black text-emerald-500 italic leading-none">
                  {formatCurrency(currentPrizePool)}
                </p>
                <div className="space-y-2">
                  <PrizeRow pos="1st" percent={tournament.prize_1st_percent || 60} pool={currentPrizePool} />
                  <PrizeRow pos="2nd" percent={tournament.prize_2nd_percent || 25} pool={currentPrizePool} />
                  <PrizeRow pos="3rd" percent={tournament.prize_3rd_percent || 15} pool={currentPrizePool} />
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6">
                <InfoItem icon={<Users className="w-5 h-5 text-primary" />} label="Total Contenders" value={tournament.max_players.toString()} />
                <InfoItem icon={<Calendar className="w-5 h-5 text-blue-500" />} label="Entry Fee" value={tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'} />
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Important Dates</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Registration Ends</p>
                    <p className="text-sm font-semibold text-white">
                      {tournament.start_date ? new Date(new Date(tournament.start_date).getTime() - 86400000).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-primary font-bold uppercase">Tournament Starts</p>
                    <p className="text-sm font-semibold text-white">
                      {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center space-x-1 border-b border-border-main overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {(['info', 'fixtures', 'standings', 'players'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all relative whitespace-nowrap",
                    activeTab === tab ? "text-primary bg-primary/5" : "text-text-muted hover:text-text-main"
                  )}
                >
                  {tab === 'players' ? 'contenders' : tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                </button>
              ))}
            </div>

            <div className="min-h-[400px]">
              {activeTab === 'info' && (
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="space-y-12"
                >
                   <div className="max-w-none">
                    <h2 className="text-2xl sm:text-3xl font-black text-text-main italic uppercase tracking-tighter mb-6">Mission Briefing</h2>
                    <p className="text-text-muted leading-relaxed text-lg sm:text-xl font-medium">
                      {tournament.description || 'Secure your spot in the bracket and fight for glory and a share of the massive prize pool.'}
                    </p>
                  </div>
                </motion.div>
              )}
 
              {activeTab === 'fixtures' && (
                <FixturesList tournamentId={tournament.id} />
              )}
 
              {activeTab === 'standings' && (
                tournament.type === 'group_stage' ? (
                  <GroupStageTournamentView tournamentId={tournament.id} />
                ) : (
                  <StandingsTable tournamentId={tournament.id} registrations={registrations} tournamentType={tournament.type} />
                )
              )}
              {activeTab === 'players' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {registrations.length > 0 ? registrations.map((player, idx) => (
                     <div key={`player-${player.user_id || player.id || idx}`} className="card p-4 flex items-center space-x-3 bg-surface hover:border-primary-light transition-all shadow-sm">
                       {player.username || player.profiles?.username ? (
                         <Link to={`/players/${player.username || player.profiles?.username}`}>
                           <PlayerBadge 
                             badgeId={player.badge_id} 
                             username={player.username || player.profiles?.username || 'Anonymous'} 
                             size="md" 
                             className="hover:scale-105 transition-transform"
                           />
                         </Link>
                       ) : (
                         <PlayerBadge 
                           badgeId={player.badge_id} 
                           username="Anonymous" 
                           size="md" 
                         />
                       )}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            {player.username || player.profiles?.username ? (
                              <Link 
                                to={`/players/${player.username || player.profiles?.username}`}
                                className="font-bold text-text-main uppercase italic tracking-tight truncate hover:text-primary transition-colors"
                              >
                                {player.username || player.profiles?.username}
                              </Link>
                            ) : (
                              <p className="font-bold text-text-main uppercase italic tracking-tight truncate">Anonymous</p>
                            )}
                         </div>
                         <div className="flex items-center gap-2">
                           <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{player.registration_status || player.status || 'Registered'}</p>
                           {player.badge_id && (
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Badge Selected" />
                           )}
                         </div>
                       </div>
                     </div>
                   )) : (
                     <div className="col-span-full py-12 text-center text-text-muted italic">
                       No contenders have registered for this tournament yet.
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

function PrizeRow({ pos, percent, pool }: { pos: string; percent: number; pool: number }) {
  const amount = (pool * percent) / 100;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted font-medium">{pos} Place ({percent}%)</span>
      <span className="text-text-main font-bold">{formatCurrency(amount)}</span>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        {icon}
        <p className="text-[10px] font-bold text-text-muted uppercase">{label}</p>
      </div>
      <p className="text-sm font-bold text-text-main">{value}</p>
    </div>
  );
}
