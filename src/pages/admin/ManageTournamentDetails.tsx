import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminShell from '../../components/layout/AdminShell';
import { tournamentService } from '../../services/tournamentService';
import { useRealtimeTournament } from '../../hooks/useRealtimeTournaments';
import { matchService } from '../../services/matchService';
import { Tournament, Registration, Match, Profile } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Users, Trophy, 
  Plus, Calendar, ShieldCheck, UserX,
  Play, CheckCircle, MoreVertical, Loader2,
  Gamepad2, Zap, Settings, RefreshCcw, Activity, Radio
} from 'lucide-react';
import { formatCurrency, cn, getPublicIdentity, getStorageUrl } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import StatusBadge from '../../components/ui/StatusBadge';
import { TournamentStatus } from '../../constants';
import { useTournamentBadges } from '../../hooks/useTournamentBadges';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

import TournamentPrizeConfigComponent from '../../components/admin/TournamentPrizeConfigComponent';
import TournamentDistributePrizesComponent from '../../components/admin/TournamentDistributePrizesComponent';
import TournamentLeaderboardComponent from '../../components/admin/TournamentLeaderboardComponent';
import TournamentLifecycleControlsComponent from '../../components/admin/TournamentLifecycleControlsComponent';

export default function ManageTournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState />;
  }

  if (!can('manage_tournaments')) {
    return <Navigate to="/admin" replace />;
  }
  const { tournament, loading: tournamentLoading } = useRealtimeTournament(id);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'leaderboard' | 'settings'>('players');
  const [busy, setBusy] = useState(false);
  const { badges } = useTournamentBadges(id);

  const settings = Array.isArray((tournament as any)?.tournament_settings) 
    ? (tournament as any)?.tournament_settings[0] 
    : (tournament as any)?.tournament_settings;
  const swissRounds = settings?.swiss_rounds || 3;
  const currentRound = settings?.swiss_current_round || Math.max(0, ...matches.filter(m => !m.stage || m.stage === 'swiss' || m.stage === 'league' || m.stage === 'group_stage').map(m => m.round || 0));
  const hasPlayoffs = matches.some(m => m.stage === 'playoffs');
  const playoffsCompleted = hasPlayoffs && matches.filter(m => m.stage === 'playoffs').every(m => m.status === 'completed');
  const hasKnockouts = matches.some(m => m.stage === 'knockout' || m.stage === 'quarterfinal' || m.stage === 'semifinal' || m.stage === 'final' || m.stage === 'round_of_16');

  useEffect(() => {
    if (!id) return;
    
    loadData();

    // Realtime subscriptions
    const registrationsChannel = supabase
      .channel(`admin-regs-${id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'registrations',
        filter: `tournament_id=eq.${id}`
      }, () => loadRegistrations())
      .subscribe();

    const matchesChannel = supabase
      .channel(`admin-matches-${id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${id}`
      }, () => loadMatches())
      .subscribe();

    return () => {
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [id]);

  useEffect(() => {
    if (tournamentLoading === false && !tournament) {
      navigate('/admin/tournaments');
    }
  }, [tournament, tournamentLoading, navigate]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    await Promise.all([
      loadRegistrations(),
      loadMatches()
    ]);
    setLoading(false);
  }

  async function loadRegistrations() {
    if (!id) return;
    try {
      const rData = await tournamentService.getRegisteredPlayers(id);
      setRegistrations(rData || []);
    } catch (err) {
      console.error('Error loading registrations:', err);
    }
  }

  async function loadMatches() {
    if (!id) return;
    try {
      const mData = await matchService.getByTournament(id);
      setMatches(mData || []);
    } catch (err) {
      console.error('Error loading matches:', err);
    }
  }

  const handleGenerateBrackets = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      await matchService.generateFixtures(tournament.id, tournament.type || 'round_robin');
      await loadMatches();
      setActiveTab('matches');
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!tournament) return;
    if (!confirm('Close registration and lock the roster?')) return;
    setBusy(true);
    try {
      await tournamentService.closeRegistration(tournament.id);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceBracket = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      await matchService.advanceBracket(tournament.id);
      await loadMatches();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDistributePrizes = async () => {
    if (!tournament) return;
    if (!confirm('Authorize prize distribution? This will transfer funds to winners immediately.')) return;
    setBusy(true);
    try {
      await tournamentService.distributePrizes(tournament.id);
      alert('Prizes distributed successfully!');
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateNextSwissRound = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      const nextRound = currentRound + 1;
      const { error } = await (supabase as any).rpc('fn_generate_swiss_round', {
        p_tournament_id: tournament.id,
        p_round: nextRound
      });
      if (error) throw error;
      toast.success(`Round ${nextRound} generated successfully!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate next round');
      alert(`Error generating round: ${err.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePlayoffRound = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc('fn_cl_generate_knockout', {
        p_tournament_id: tournament.id,
        p_stage: 'playoffs'
      });
      if (error) throw error;
      toast.success('Playoff round generated successfully!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate playoffs');
      alert(`Error generating playoffs: ${err.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleBuildKnockoutBracket = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc('fn_cl_build_bracket_skeleton', {
        p_tournament_id: tournament.id
      });
      if (error) throw error;
      toast.success('Knockout bracket built successfully!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to build knockout bracket');
      alert(`Error building bracket: ${err.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  if (tournamentLoading || (loading && !registrations.length && !matches.length)) return (
    <AdminShell>
      <LoadingState message="Connecting to Tournament Hub..." />
    </AdminShell>
  );

  if (!tournament) return <AdminShell>Tournament not found</AdminShell>;

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => navigate('/admin/tournaments')}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:text-primary hover:border-primary/30 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                  {tournament.name}
                </h1>
                <StatusBadge status={tournament.status} />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center">
                <span className="text-primary italic mr-2">{tournament.type}</span> • {(registrations || []).length}/{tournament.max_players} Contenders Joined
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             {tournament.status === TournamentStatus.REGISTRATION_OPEN && (
               <button 
                onClick={handleCloseRegistration}
                disabled={busy}
                className="px-6 py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:bg-amber-500/20 disabled:opacity-50"
               >
                 Close Reg
               </button>
             )}

             {matches.length === 0 && registrations.length >= 2 && (
               <button 
                onClick={handleGenerateBrackets}
                disabled={busy}
                className="group relative px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50"
               >
                 <div className="flex items-center">
                   {busy ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 mr-3 stroke-[3px] group-hover:animate-pulse" />}
                   Generate Payload
                 </div>
               </button>
             )}

             {tournament.status === TournamentStatus.ONGOING && tournament.type === 'knockout' && (
               <button 
                onClick={handleAdvanceBracket}
                disabled={busy}
                className="px-8 py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:bg-emerald-500/20 disabled:opacity-50"
               >
                 Advance Bracket
               </button>
             )}

             {matches.length > 0 && (tournament.type === 'champions_league' || tournament.type === 'swiss') && currentRound < swissRounds && (
               <button 
                onClick={handleGenerateNextSwissRound}
                disabled={busy}
                className="px-6 py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:bg-emerald-500/20 disabled:opacity-50 flex items-center shadow-lg"
               >
                 <Zap className="w-4 h-4 mr-2" />
                 Generate Next Round ({currentRound + 1}/{swissRounds})
               </button>
             )}

             {matches.length > 0 && tournament.type === 'champions_league' && currentRound >= swissRounds && !hasPlayoffs && (
               <button 
                onClick={handleGeneratePlayoffRound}
                disabled={busy}
                className="px-6 py-4 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:bg-purple-500/20 disabled:opacity-50 flex items-center shadow-lg"
               >
                 <Zap className="w-4 h-4 mr-2" />
                 Generate Playoff Round
               </button>
             )}

             {matches.length > 0 && tournament.type === 'champions_league' && currentRound >= swissRounds && !hasKnockouts && (
               <button 
                onClick={handleBuildKnockoutBracket}
                disabled={busy || (hasPlayoffs && !playoffsCompleted)}
                title={hasPlayoffs && !playoffsCompleted ? "Playoff matches must be completed first" : "Build Round of 16 Bracket"}
                className={cn(
                  "px-6 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center border shadow-lg",
                  hasPlayoffs && !playoffsCompleted 
                    ? "bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed" 
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                )}
               >
                 <Trophy className="w-4 h-4 mr-2" />
                 Build Knockout Bracket
               </button>
             )}

             {tournament.status === TournamentStatus.COMPLETED && (
               <button 
                onClick={handleDistributePrizes}
                disabled={busy}
                className="px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50"
               >
                 <div className="flex items-center">
                   <Trophy className="w-5 h-5 mr-2" />
                   Distribute Prizes
                 </div>
               </button>
             )}
             
              {matches.length > 0 && (
                <button 
                  onClick={() => navigate(`/admin/tournaments/${id}/schedule`)}
                  className="px-6 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                >
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-3 stroke-[3px]" />
                    Command Center
                  </div>
                </button>
              )}
              
             <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl">
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="flex space-x-2 p-1.5 bg-slate-950 border border-slate-900 rounded-2xl w-fit">
          <TabButton 
            active={activeTab === 'players'} 
            onClick={() => setActiveTab('players')} 
            icon={<Users className="w-4 h-4 mr-2" />}
            label="Field Intel"
          />
          <TabButton 
            active={activeTab === 'matches'} 
            onClick={() => setActiveTab('matches')} 
            icon={<Gamepad2 className="w-4 h-4 mr-2" />}
            label="Operations"
          />
          <TabButton 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')} 
            icon={<Trophy className="w-4 h-4 mr-2" />}
            label="Leaderboard"
          />
          <TabButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<ShieldCheck className="w-4 h-4 mr-2" />}
            label="Protocol"
          />
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'players' && (
            <PlayersList 
              registrations={registrations} 
              maxPlayers={tournament.max_players} 
              badges={badges}
            />
          )}

          {activeTab === 'matches' && (
            <MatchesManagement 
              matches={matches} 
              tournamentId={tournament.id}
              onUpdate={loadMatches}
            />
          )}

          {activeTab === 'leaderboard' && (
            <TournamentLeaderboardComponent 
              tournament={tournament as any}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <TournamentLifecycleControlsComponent 
                tournament={tournament as any}
                onUpdate={loadData}
              />
              
              <TournamentPrizeConfigComponent 
                tournament={tournament as any}
                onUpdate={loadData}
              />

              <TournamentDistributePrizesComponent 
                tournament={tournament as any}
                onUpdate={loadData}
              />
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
        active ? "bg-primary text-slate-900 shadow-xl shadow-primary/20" : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PlayersList({ registrations, maxPlayers, badges }: { registrations: any[], maxPlayers: number, badges: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Active Contenders</h3>
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-auto">
          Contenders: <span className="text-primary">{registrations.length}</span> / {maxPlayers}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {registrations.map((reg) => {
          if (!reg) return null;
          return (
            <div key={reg.id} className="card p-6 border-white/5 bg-surface/20 hover:border-primary/20 transition-all flex items-center justify-between group">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                    {reg.avatar_url ? (
                      <img src={reg.avatar_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <span className="font-black text-primary text-xl">{(reg.username || 'P')[0].toUpperCase()}</span>
                    )}
                  </div>
                  {badges[reg.user_id] && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shadow-2xl z-10 group-hover:scale-110 transition-transform">
                      <img 
                        src={getStorageUrl('team-badges', badges[reg.user_id])} 
                        className="w-full h-full object-contain" 
                        alt="badge"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-black text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">{reg.username || 'Unknown Operator'}</p>
                  <div className="flex items-center mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Clearance: {reg.status}</p>
                  </div>
                </div>
              </div>
              <button className="p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-lg transition-all border border-red-500/10">
                <UserX className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {registrations.length === 0 && (
          <div className="col-span-full py-24 card border-dashed border-2 border-slate-800 flex flex-col items-center justify-center text-slate-700 italic font-black uppercase tracking-widest text-sm">
            Operational registry empty.
          </div>
        )}
      </div>
    </div>
  );
}

function MatchesManagement({ matches, tournamentId, onUpdate }: { matches: Match[], tournamentId: string, onUpdate: () => void }) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Deployment Schedule</h3>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(`/admin/tournaments/${tournamentId}/live`)}
            className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500/20 transition-all flex items-center"
          >
            <Radio className="w-4 h-4 mr-2" />
            Live Feed
          </button>
          <button 
            onClick={() => navigate(`/admin/tournaments/${tournamentId}/schedule`)}
            className="px-6 py-3 bg-primary text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all flex items-center"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Full Scheduler
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:border-primary/30 transition-all flex items-center"
          >
            <Plus className="w-4 h-4 mr-2 stroke-[3px]" />
            Manual Create
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match: any) => {
          if (!match) return null;
          return (
            <div key={match.id} className="card p-8 hover:border-primary/30 transition-all border-white/5 bg-surface/20 flex flex-col sm:flex-row items-center justify-between gap-6 group">
              <div className="flex items-center space-x-6 w-full sm:w-auto">
                <div className="text-center bg-slate-950 border border-slate-800 p-4 rounded-2xl w-16">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Round</p>
                  <p className="text-2xl font-black text-white italic leading-none">{match.round}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs font-black text-white italic uppercase tracking-tight group-hover:text-primary transition-colors">{getPublicIdentity(match.player1)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 font-black text-[10px] text-slate-700 uppercase italic">VS</div>
                  <div className="text-left">
                    <p className="text-xs font-black text-white italic uppercase tracking-tight group-hover:text-primary transition-colors">{getPublicIdentity(match.player2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6 w-full sm:w-auto justify-end border-t sm:border-t-0 sm:border-l border-slate-800/50 pt-6 sm:pt-0 sm:pl-8">
                <div className="text-right">
                  <p className="text-2xl font-black text-white italic tracking-tighter leading-none mb-2">
                    {match.score1 ?? 0} <span className="text-primary">:</span> {match.score2 ?? 0}
                  </p>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full italic border",
                    match.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary/20 text-primary border-primary/30"
                  )}>
                    {match.status}
                  </span>
                </div>
                <button className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
        {matches.length === 0 && (
          <div className="col-span-full py-24 card border-dashed border-2 border-slate-800 flex flex-col items-center justify-center text-slate-700 italic font-black uppercase tracking-widest text-sm">
            Deployment schedule pending.
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateMatchModal 
          tournamentId={tournamentId} 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function CreateMatchModal({ tournamentId, onClose, onSuccess }: { tournamentId: string, onClose: () => void, onSuccess: () => void }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    loadPlayers();
  }, [tournamentId]);

  async function loadPlayers() {
    try {
      const data = await tournamentService.getRegistrations(tournamentId);
      setPlayers((data || []).filter((r: any) => ['registered', 'approved', 'checked_in'].includes(r.status)));
    } catch (err) {
      console.error('Error loading players for match creation:', err);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1 || !p2) {
      alert('Please select both players');
      return;
    }
    setLoading(true);
    try {
      await matchService.createMatch({
        tournament_id: tournamentId,
        player1: p1,
        player2: p2,
        round: round,
        status: 'pending'
      } as any);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="card relative w-full max-w-md bg-[#0a0b1e] border-slate-800 shadow-2xl overflow-hidden rounded-[2.5rem] border-white/5">
        <div className="p-8 border-b border-slate-800 bg-surface/30 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Event <span className="text-primary italic">Orchestrator</span></h2>
          <button onClick={onClose} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
            <UserX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Contender Alpha</label>
              <select 
                value={p1} 
                onChange={(e) => setP1(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none"
                required
              >
                <option value="">Select Identity</option>
                {players.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.username || 'Unknown Identity'}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Contender Beta</label>
              <select 
                value={p2} 
                onChange={(e) => setP2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none"
                required
              >
                <option value="">Select Identity</option>
                {players.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.username || 'Unknown Identity'}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Operational Round</label>
              <input 
                type="number" 
                value={round} 
                onChange={(e) => setRound(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-white font-black italic outline-none focus:border-primary/50 transition-all"
                min="1"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-20 bg-primary text-slate-900 font-black italic uppercase tracking-tighter shadow-2xl shadow-primary/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xl"
          >
            {loading ? <Loader2 className="animate-spin mx-auto w-8 h-8" /> : 'Authorize Deployment'}
          </button>
        </form>
      </div>
    </div>
  );
}
