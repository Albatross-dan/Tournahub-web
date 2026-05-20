import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Match } from '../types/database';
import { matchService } from '../services/matchService';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { 
  Info, ArrowLeft, Trophy,
  Shield
} from 'lucide-react';
import { getPublicIdentity } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import MatchChat from '../components/messages/MatchChat';
import { SubmitResultPanel } from '../components/match/SubmitResultPanel';
import VerificationStatusBadge from '../components/match/VerificationStatusBadge';
import { motion } from 'motion/react';
import { useTournamentBadges } from '../hooks/useTournamentBadges';
import { VerificationStatus } from '../types/verification.types';
import { PlayerBadge } from '../components/ui/PlayerBadge';

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(loadMatchData);
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const { badges } = useTournamentBadges(match?.tournament_id || '');

  const activePlayer1Id = typeof match?.player1 === 'object' ? (match.player1 as any)?.id : match?.player1;
  const activePlayer2Id = typeof match?.player2 === 'object' ? (match.player2 as any)?.id : match?.player2;
  const isParticipant = !!(user && (activePlayer1Id === user.id || activePlayer2Id === user.id));

  useEffect(() => {
    isInitialLoad.current = true;
    if (!id) return;
    
    loadMatchData();

    const matchChannel = supabase
      .channel(`match-detail-${id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${id}`
      }, () => loadMatchData(false))
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [id]);

  async function loadMatchData(showLoading = isInitialLoad.current) {
    if (!id) return;
    try {
      if (showLoading) setLoading(true);
      const matchData = await matchService.getById(id);
      setMatch(matchData);
    } finally {
      if (showLoading) setLoading(false);
      isInitialLoad.current = false;
    }
  }

  if (loading) return (
    <Shell>
      <LoadingState message="Syncing Match Data..." />
    </Shell>
  );
  
  if (!match || !user) return <Shell>Match not found</Shell>;

  return (
    <Shell>
      <div className="space-y-8 min-h-screen pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center space-x-4 md:space-x-6">
             <button onClick={() => navigate(-1)} className="p-3 bg-zinc-900 border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all group shrink-0">
               <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
             </button>
             <div className="min-w-0">
               <div className="flex items-center space-x-2 md:space-x-3 mb-1">
                 <Trophy className="text-primary w-5 h-5 md:w-6 md:h-6 shrink-0" />
                 <h1 className="text-2xl md:text-3xl font-black text-primary uppercase italic tracking-tighter">
                  {(match as any).tournaments?.name || 'BATTLE HUB'}
                </h1>
               </div>
               <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.3em] leading-none">Round {match.round} • Match #{match.match_order}</p>
             </div>
           </div>
           
           <div className="flex items-center space-x-3">
             <VerificationStatusBadge status={match.result_verification_status as VerificationStatus || 'none'} />
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Combatants Card */}
            <div className="card p-6 md:p-8 bg-zinc-900 border-zinc-800">
               <div className="grid grid-cols-3 items-center">
                 {/* Player 1 */}
                 <div className="flex flex-col items-center space-y-3">
                    <PlayerBadge 
                      badgeId={badges[(match.player1 as any)?.id || (match.player1 as any)]} 
                      username={getPublicIdentity(match.player1)} 
                      size="lg"
                    />
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm md:text-base font-black text-white italic uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">
                        {getPublicIdentity(match.player1)}
                      </p>
                      {match.status === 'completed' && match.score1 !== null && (
                        <p className="text-3xl font-black text-primary italic leading-none mt-1">{match.score1}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800 relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      <span className="text-[10px] font-black text-zinc-600 italic">VS</span>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="flex flex-col items-center space-y-3">
                    <PlayerBadge 
                      badgeId={badges[(match.player2 as any)?.id || (match.player2 as any)]} 
                      username={getPublicIdentity(match.player2)} 
                      size="lg"
                    />
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm md:text-base font-black text-white italic uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">
                        {getPublicIdentity(match.player2)}
                      </p>
                      {match.status === 'completed' && match.score2 !== null && (
                        <p className="text-3xl font-black text-primary italic leading-none mt-1">{match.score2}</p>
                      )}
                    </div>
                  </div>
               </div>
            </div>

            {isParticipant ? (
              <div className="space-y-6">
                <SubmitResultPanel 
                  matchId={match.id}
                  currentUserId={user.id}
                  playerName={getPublicIdentity({ id: user.id, username: user.user_metadata?.username })}
                />
                
                <MatchChat 
                  matchId={match.id} 
                  currentUserId={user.id} 
                  tournamentId={match.tournament_id} 
                />
              </div>
            ) : (
              <div className="bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl p-12 text-center h-[500px] flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <Shield className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Spectator Mode</h3>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto">
                  Encrypted communication channels are private to combatants. 
                  You are observing as a tactical analyst.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-8 bg-black border-zinc-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all duration-700" />
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-8 border-b border-zinc-900 pb-4">Match Directive</h3>
              <div className="space-y-4">
                <RuleItem text={`Format: ${(match as any).tournaments?.type || 'Standard'} Mode`} />
                <RuleItem text="Communication: Encrypted Link Active" />
                <RuleItem text="Verification: Required After Match" />
                <RuleItem text="Governance: Platform Standard Rules" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function RuleItem({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-3 text-zinc-500 group">
      <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:bg-primary/10 transition-colors">
        <Info className="w-3 h-3 text-zinc-600 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-xs font-bold leading-none">{text}</span>
    </div>
  );
}
