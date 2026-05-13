import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Tournament, Match } from '../types/database';
import { tournamentService } from '../services/tournamentService';
import { useRealtimeTournament } from '../hooks/useRealtimeTournaments';
import { matchService } from '../services/matchService';
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
import { useTournamentBadges } from '../hooks/useTournamentBadges';

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'fixtures' | 'standings' | 'players'>('info');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const { badges } = useTournamentBadges(id);

  useEffect(() => {
    if (!id) return;
    
    loadRegistrations();
    loadRegistrationStatus();
    
    // Realtime subscription for registrations
    const channel = supabase
      .channel(`tournament-registrations-${id}-${Math.random().toString(36).substring(7)}`)
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
    if (!id || !user) return;
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
    }
  }

  async function loadRegistrations() {
    if (!id) return;
    try {
      const regs = await tournamentService.getRegistrations(id);
      setRegistrations(regs);
    } catch (err) {
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleRegister = async () => {
    if (!user || !tournament || !id) return;

    if (!navigator.onLine) {
      setMessage({ type: 'error', text: 'Internet connection required for registration. Please reconnect and try again.' });
      return;
    }

    // Show confirmation for paid tournaments
    if (tournament.entry_fee && tournament.entry_fee > 0) {
      if (!confirm(`Are you sure you want to register? This will deduct ${formatCurrency(tournament.entry_fee)} from your wallet if successful.`)) {
        return;
      }
    }

    setRegistering(true);
    setMessage(null);
    try {
      if (!selectedBadgeId) {
        setShowBadgeSelector(true);
        setRegistering(false);
        return;
      }

      const result = await tournamentService.register(id, selectedBadgeId) as any;
      
      if (result.success) {
        setShowBadgeSelector(false);
        setSelectedBadgeId(null);
        if (result.status === 'waitlisted') {
          setMessage({ type: 'success', text: `Tournament is full. You have been added to the waitlist at position ${result.data?.position || 'unknown'}.` });
        } else {
          setMessage({ type: 'success', text: 'Registration successful! You are in.' });
        }
        // Realtime listeners in hooks will pick up balance/slot/status changes automatically
        setTimeout(() => setMessage(null), 5000);
        await loadRegistrations();
        await loadRegistrationStatus();
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setMessage({ type: 'error', text: err.message || 'Registration failed. Please try again.' });
    } finally {
      setRegistering(false);
    }
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
        await loadRegistrations();
        await loadRegistrationStatus();
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

  const isRegistered = regStatus ? regStatus.registered : registrations.some(r => r.user_id === user?.id && ['registered', 'approved', 'checked_in', 'waitlisted'].includes(r.status));
  const userStatus = regStatus ? regStatus.user_status : registrations.find(r => r.user_id === user?.id)?.status;
  const isWaitlisted = regStatus ? regStatus.waitlisted : userStatus === 'waitlisted';
  const spotsLeft = regStatus ? regStatus.spots_left : (tournament.max_players || 0) - (registrations.filter(r => ['registered', 'approved', 'checked_in'].includes(r.status)).length || 0);
  const currentStatus = regStatus?.tournament_status || tournament.status;
  const isClosed = currentStatus !== TournamentStatus.REGISTRATION_OPEN;
  
  const canRegister = !isRegistered && !isWaitlisted && currentStatus === TournamentStatus.REGISTRATION_OPEN;
  const isWaitlist = spotsLeft === 0 && canRegister;
  const isActuallyFull = spotsLeft === 0 && !canRegister && !isRegistered && !isWaitlisted;

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
                  {String(regStatus ? regStatus.players_registered : (tournament.max_players - spotsLeft))} / {tournament.max_players}
                </span>
              </div>
              
              {isRegistered || isWaitlisted ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 px-6 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center shadow-2xl shadow-emerald-500/10 w-full md:w-auto">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                    {isWaitlisted 
                      ? (regStatus?.waitlist_position ? `Waitlist #${regStatus.waitlist_position}` : 'On Waitlist') 
                      : 'Registered'}
                  </div>
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
                  onClick={handleRegister}
                  disabled={registering}
                  className="btn-secondary w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 shadow-2xl text-lg sm:text-xl font-black uppercase italic tracking-tighter rounded-xl sm:rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 border-amber-500/50 text-amber-500"
                >
                  {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Join Waitlist'}
                </button>
              ) : isClosed ? (
                <div className="bg-slate-800 border-2 border-slate-700 text-slate-400 px-10 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black italic uppercase tracking-tighter text-lg sm:text-xl flex items-center justify-center w-full md:w-auto opacity-75">
                  Registration Closed
                </div>
              ) : (
                <button 
                  onClick={handleRegister}
                  disabled={registering || !canRegister}
                  className="btn-primary w-full md:w-auto px-10 sm:px-14 py-3 sm:py-5 shadow-2xl shadow-primary/30 text-lg sm:text-xl font-black uppercase italic tracking-tighter rounded-xl sm:rounded-[1.5rem] transition-all hover:scale-105 active:scale-95"
                >
                  {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Claim Spot'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showBadgeSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="card p-6 bg-slate-900/50 border-primary/20 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Choose Your Identity</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select a unique badge to represent you in this tournament.</p>
                </div>
                
                <BadgeSelector 
                  tournamentId={id} 
                  onSelect={setSelectedBadgeId} 
                  selectedBadgeId={selectedBadgeId} 
                />
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowBadgeSelector(false)}
                    className="flex-1 px-6 py-4 rounded-xl border border-slate-700 text-slate-400 font-black uppercase italic tracking-widest hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRegister}
                    disabled={!selectedBadgeId || registering}
                    className="flex-1 btn-primary px-6 py-4 rounded-xl font-black uppercase italic tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {registering ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'Finalize Entry'}
                  </button>
                </div>
              </div>
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
                <StandingsTable tournamentId={tournament.id} />
              )}
              {activeTab === 'players' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {registrations.length > 0 ? registrations.map((reg, idx) => (
                     <div key={`reg-${reg.id || idx}-${idx}`} className="card p-4 flex items-center space-x-3 bg-slate-900/50">
                       <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                         {reg.profiles.avatar_url ? (
                           <img src={reg.profiles.avatar_url} className="w-full h-full object-cover" />
                         ) : (
                           <Users className="w-5 h-5 text-slate-600" />
                         )}
                       </div>
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                           <p className="font-bold text-white uppercase italic tracking-tight">{reg.profiles.username || 'Anonymous'}</p>
                           {badges[reg.user_id] && (
                             <img 
                               src={getStorageUrl('team-badges', badges[reg.user_id])} 
                               className="w-4 h-4 object-contain" 
                               alt="badge"
                             />
                           )}
                         </div>
                         <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{reg.status}</p>
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
