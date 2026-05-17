import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Tournament } from '../types/database';
import { tournamentService } from '../services/tournamentService';
import { useRealtimeTournament } from '../hooks/useRealtimeTournaments';
import Shell from '../components/layout/Shell';
import { 
  Trophy, Users, Calendar, Info, 
  ChevronRight, ArrowLeft, CheckCircle2, Shield, Loader2
} from 'lucide-react';
import { formatCurrency, formatDate, cn, getStorageUrl } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';
import StandingsTable from '../components/standings/StandingsTable';
import FixturesList from '../components/fixtures/FixturesList';
import StatusBadge from '../components/ui/StatusBadge';
import { TournamentStatus } from '../constants';
import BadgeSelector from '../components/badges/BadgeSelector';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { useWallet } from '../hooks/useWallet';
import toast from 'react-hot-toast';

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { summary, limits, refreshWallet } = useWallet('USD');
  
  const { tournament, loading: tournamentLoading } = useRealtimeTournament(id);
  const [regStatus, setRegStatus] = useState<{
    registered: boolean;
    waitlisted: boolean;
    user_status: string | null;
    registration_id: string | null;
    players_registered: number;
    max_players: number;
    spots_left: number;
    tournament_status: string;
    waitlist_position: number | null;
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

  useEffect(() => {
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
  }, [id, user]);

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
    }
  }

  async function loadRegistrations() {
    if (!id) return;
    try {
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
    }
  }

  const handleRegisterWithBadge = async (badgeId: string) => {
    if (!user || !tournament || !id) return;

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
          : result.status === 'waitlisted' 
            ? 'Added to waitlist.' 
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

  const handleRegisterClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/tournaments/${id}` } });
      return;
    }
    setShowRegFlow(true);
    setRegStep('picker');
  };

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
        if (result.slot_filled) msg += ' A waitlisted player has been promoted.';
        
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

  const isRegistered = !!(
    (regStatus && regStatus.registered) || 
    (registrations || []).some(r => (r.user_id === user?.id || r.id === user?.id) && ['registered', 'approved', 'checked_in', 'waitlisted'].includes(r.status || ''))
  );
  const userStatus = regStatus ? regStatus.user_status : (registrations || []).find(r => (r.user_id === user?.id || r.id === user?.id))?.status;
  const isWaitlisted = !!(regStatus ? regStatus.waitlisted : userStatus === 'waitlisted');
  const playersCount = regStatus ? regStatus.players_registered : (registrations?.length || 0);
  const spotsLeft = regStatus ? (regStatus.max_players - regStatus.players_registered) : (tournament.max_players || 0) - ((registrations || []).filter(r => ['registered', 'approved', 'checked_in'].includes(r.status || '')).length || 0);
  const currentStatus = regStatus?.tournament_status || tournament.status;
  const isClosed = currentStatus !== TournamentStatus.REGISTRATION_OPEN;
  
  const canRegister = !isRegistered && !isWaitlisted && currentStatus === TournamentStatus.REGISTRATION_OPEN;
  const isWaitlist = spotsLeft <= 0 && canRegister;
  const isActuallyFull = spotsLeft <= 0 && !canRegister && !isRegistered && !isWaitlisted;
  const isActionDisabled = registering || isRegStatusLoading || !user || isRegistered;

  return (
    <Shell>
      <div className="space-y-8">
        <button 
          onClick={() => navigate('/tournaments')}
          className="flex items-center text-slate-400 hover:text-white transition-colors group"
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

          {isRegistered && !isWaitlisted && regStatus && !(regStatus as any).has_badge && (
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
          className="relative h-64 sm:h-80 md:h-96 rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl"
        >
          <img 
            src={getStorageUrl('tournament-banners', tournament.banner_url) || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200'} 
            className="w-full h-full object-cover" 
            alt={tournament.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/20 text-primary border border-primary/20 text-[10px] sm:text-xs font-black uppercase rounded-full tracking-widest shadow-lg shadow-primary/10">
                  {tournament.type}
                </span>
                <StatusBadge status={regStatus?.tournament_status || tournament.status} />
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                {tournament.name}
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-6 sm:px-8 py-3 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenders</span>
                <span className="text-xl font-black text-white italic">
                  {String(playersCount)} / {tournament.max_players}
                </span>
              </div>
              
              {isRegistered || isWaitlisted ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <button 
                    disabled
                    className="w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center shadow-xl shadow-emerald-500/5 cursor-not-allowed opacity-90"
                  >
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    {isWaitlisted 
                      ? (regStatus?.waitlist_position ? `Waitlist #${regStatus.waitlist_position}` : 'On Waitlist') 
                      : 'Registered'}
                  </button>
                  {(regStatus?.user_status === 'registered' || regStatus?.user_status === 'approved' || regStatus?.user_status === 'checked_in' || isWaitlisted) && (
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
              ) : isWaitlist ? (
                <button 
                  onClick={handleRegisterClick}
                  disabled={isActionDisabled || isRegistered || isWaitlisted}
                  className="btn-secondary w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 shadow-2xl text-lg sm:text-xl font-black uppercase italic tracking-tighter rounded-xl sm:rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 border-amber-500/50 text-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Join Waitlist'}
                </button>
              ) : isClosed ? (
                <div className="bg-slate-800 border-2 border-slate-700 text-slate-400 px-10 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center w-full md:w-auto opacity-75">
                  Registration Closed
                </div>
              ) : (
                <button 
                  onClick={handleRegisterClick}
                  disabled={isActionDisabled || !canRegister || isRegistered || isWaitlisted}
                  className="btn-primary w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 shadow-2xl shadow-primary/30 text-lg sm:text-xl font-black uppercase italic tracking-tighter rounded-xl sm:rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                >
                  {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Claim Spot'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
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
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Choose Your <span className="text-primary">Identity</span></h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Select a unique badge for this arena</p>
                      </div>
                      <button onClick={() => setShowRegFlow(false)} className="text-slate-500 hover:text-white uppercase text-[10px] font-black tracking-widest">Cancel</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <BadgeSelector 
                        tournamentId={id!} 
                        tournamentStatus={currentStatus}
                        mode="registration" 
                        onSelect={(badgeId) => {
                          setSelectedBadge(badgeId);
                          setRegStep('confirm');
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-10 space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Confirm <span className="text-primary">Engagement</span></h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Final review before deployment</p>
                    </div>

                    <div className="flex flex-col items-center py-8 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                      <div className="w-32 h-32 relative">
                        <PlayerBadge badgeId={selectedBadge} username="You" size="xl" />
                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-black">Selected</div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Entry Ticket</p>
                        <p className="text-2xl font-black text-white italic">{tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : 'FREE ENTRY'}</p>
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
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {id && isRegistered && !isWaitlisted && (
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
                  {formatCurrency(tournament.prize_pool || 0)}
                </p>
                <div className="space-y-2">
                  <PrizeRow pos="1st" percent={tournament.prize_1st_percent || 60} pool={tournament.prize_pool || 0} />
                  <PrizeRow pos="2nd" percent={tournament.prize_2nd_percent || 25} pool={tournament.prize_pool || 0} />
                  <PrizeRow pos="3rd" percent={tournament.prize_3rd_percent || 15} pool={tournament.prize_pool || 0} />
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
            <div className="flex items-center space-x-1 border-b border-zinc-800 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {(['info', 'fixtures', 'standings', 'players'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 sm:px-8 py-4 text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all relative whitespace-nowrap",
                    activeTab === tab ? "text-primary bg-primary/5" : "text-zinc-500 hover:text-white"
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
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter mb-6">Mission Briefing</h2>
                    <p className="text-zinc-400 leading-relaxed text-lg sm:text-xl font-medium">
                      {tournament.description || 'Secure your spot in the bracket and fight for glory and a share of the massive prize pool.'}
                    </p>
                  </div>
                </motion.div>
              )}
 
              {activeTab === 'fixtures' && (
                <FixturesList tournamentId={tournament.id} />
              )}
 
              {activeTab === 'standings' && (
                <StandingsTable tournamentId={tournament.id} registrations={registrations} />
              )}
              {activeTab === 'players' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {registrations.length > 0 ? registrations.map((player, idx) => (
                     <div key={`player-${player.user_id || player.id || idx}`} className="card p-4 flex items-center space-x-3 bg-slate-900/50 hover:border-slate-700 transition-all">
                       <PlayerBadge 
                         badgeId={player.badge_id} 
                         username={player.username || player.profiles?.username || 'Anonymous'} 
                         size="md" 
                       />
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           <p className="font-bold text-white uppercase italic tracking-tight truncate">{player.username || player.profiles?.username || 'Anonymous'}</p>
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
                     <div className="col-span-full py-12 text-center text-slate-500 italic">
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
      <span className="text-slate-400 font-medium">{pos} Place ({percent}%)</span>
      <span className="text-white font-bold">{formatCurrency(amount)}</span>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        {icon}
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}
