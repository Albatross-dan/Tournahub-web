import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { matchService } from '../../services/matchService';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Gamepad2, Search, Trophy, FilterIcon, 
  Play, CheckCircle2, ChevronRight,
  Zap, Save, RefreshCcw, User as UserIcon,
  Eye, Image as ImageIcon, ExternalLink,
  AlertTriangle, X
} from 'lucide-react';
import { formatCurrency, cn, getSignedUrl, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import StorageImage from '../../components/common/StorageImage';
import { useAuth } from '../../contexts/AuthContext';
import TwoLeggedTieCard from '../../components/fixtures/TwoLeggedTieCard';
import LevelTieResolutionBanner from '../../components/admin/LevelTieResolutionBanner';
import { groupMatchesIntoDisplayUnits, GroupedTie, isPlaceholderPlayer, getPlaceholderText, getPlayerUuid } from '../../utils/tieUtils';
import { PlayerBadge } from '../../components/ui/PlayerBadge';
import toast from 'react-hot-toast';

export default function AdminFixtures() {
  const { can, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchResults, setMatchResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resolveModalTie, setResolveModalTie] = useState<GroupedTie | null>(null);
  const [resolvingBusy, setResolvingBusy] = useState(false);

  if (authLoading) {
    return <LoadingState />;
  }

  if (!can('manage_matches')) {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchMatches(selectedTournament);
    } else {
      setMatches([]);
      setMatchResults({});
    }
  }, [selectedTournament]);

  async function fetchTournaments() {
    try {
      const { data, error } = await supabase
        .from('v_tournaments_with_creator')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMatches(id: string) {
    setLoading(true);
    try {
      const data = await matchService.getByTournament(id);
      const matchesData = data || [];
      setMatches(matchesData);

      if (matchesData.length > 0) {
        const matchIds = matchesData.map((m: any) => m.id);
        const { data: allResults, error: resultsError } = await (supabase as any)
          .from('match_results')
          .select('*, profiles:submitted_by(username)')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false });

        if (resultsError) throw resultsError;

        const resultsByMatch = (allResults || []).reduce((acc: any, r: any) => {
          if (!acc[r.match_id]) {
            acc[r.match_id] = {
              ...r,
              submitter_username: r.profiles?.username
            };
          }
          return acc;
        }, {});
        setMatchResults(resultsByMatch);
      } else {
        setMatchResults({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    if (!selectedTournament) return;
    const t = tournaments.find(x => x.id === selectedTournament);
    if (!t) return;

    setBusy(true);
    try {
      await matchService.generateFixtures(selectedTournament, t.type || 'round_robin');
      fetchMatches(selectedTournament);
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const updateScore = async (matchId: string, s1: number, s2: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    const p1Id = match.player1?.id || match.player1;
    const p2Id = match.player2?.id || match.player2;
    const winnerId = s1 > s2 ? p1Id : s2 > s1 ? p2Id : null;
    
    const stage = match.stage || '';
    const tournamentType = match.tournaments?.type || '';
    const drawForbiddenStages = ['knockout', 'quarterfinal', 'semifinal', 'final', 'third_place', 'round_of_16', 'round_of_32', 'playoffs'];
    const drawForbidden = drawForbiddenStages.includes(stage) || tournamentType === 'knockout';
    const isTwoLeggedMatch = !!match.tie_id || match.leg === 1 || match.leg === 2;

    if (drawForbidden && !winnerId && s1 === s2 && !isTwoLeggedMatch) {
      alert('Draws are not supported for verification yet in single-leg matches. Please set a winner.');
      return;
    }

    setBusy(true);
    try {
      await (matchService as any).verifyResult(matchId, winnerId, s1, s2);
      await fetchMatches(selectedTournament!);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveTieWinner = async (playerIndex: 1 | 2) => {
    if (!resolveModalTie || !resolveModalTie.tie_id) {
      toast.error('Missing tie identifier');
      return;
    }
    setResolvingBusy(true);
    try {
      const playerObj = playerIndex === 1 ? resolveModalTie.player1 : resolveModalTie.player2;
      const username = playerIndex === 1 ? resolveModalTie.player1_username : resolveModalTie.player2_username;
      const directId = playerIndex === 1 ? resolveModalTie.player1_id : resolveModalTie.player2_id;
      let winnerId = directId;
      if (!winnerId) {
        winnerId = await getPlayerUuid(playerObj, username, resolveModalTie.leg1 || resolveModalTie.leg2, playerIndex);
      }
      if (!winnerId) {
        throw new Error(`Could not resolve player ID for "${username || 'Player'}".`);
      }
      await matchService.resolveLevelTie(resolveModalTie.tie_id, winnerId);
      toast.success('Tie resolved! Winner advanced to the next round.');
      setResolveModalTie(null);
      await fetchMatches(selectedTournament!);
    } catch (err: any) {
      toast.error(`Error resolving tie: ${err.message}`);
    } finally {
      setResolvingBusy(false);
    }
  };

  const displayUnits = groupMatchesIntoDisplayUnits(matches);

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Fixture <span className="text-primary italic">Engine</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Match Generation and Score Validation</p>
          </div>

          <div className="flex items-center space-x-4">
            <select 
              value={selectedTournament || ''} 
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-6 py-4 font-black uppercase italic tracking-tighter outline-none focus:border-primary/50"
            >
              <option value="">Select Tournament</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {selectedTournament && matches.length === 0 && (
              <button 
                onClick={handleGenerate}
                disabled={busy}
                className="btn-primary px-8 py-4 flex items-center group disabled:opacity-50"
              >
                <Zap className="w-5 h-5 mr-3 stroke-[3px] group-hover:animate-pulse" />
                Generate
              </button>
            )}
          </div>
        </div>

        {!selectedTournament ? (
          <div className="card p-20 text-center space-y-6 border-dashed border-2 border-slate-800">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-700">
              <Gamepad2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">No Operation Selected</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Select a tournament from the decrypted logs above to view fixtures.</p>
            </div>
          </div>
        ) : loading ? (
          <LoadingState message="eFootball Tournaments" />
        ) : (
          <div className="space-y-6">
            <LevelTieResolutionBanner
              ties={displayUnits.filter((u) => u.type === 'tie').map((u) => (u as any).tie)}
              onResolved={() => fetchMatches(selectedTournament!)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayUnits.map((unit) => {
                if (unit.type === 'tie') {
                  return (
                    <div key={unit.id} className="col-span-1 md:col-span-2">
                      <TwoLeggedTieCard 
                        tie={unit.tie}
                        variant="admin"
                        onUpdateScore={updateScore}
                        onResolveTie={(t) => setResolveModalTie(t)}
                        onResolved={() => fetchMatches(selectedTournament!)}
                        matchResults={matchResults}
                      />
                    </div>
                  );
                }

                return (
                  <FixtureCard 
                    key={unit.id} 
                    match={unit.match} 
                    onUpdate={updateScore}
                    result={matchResults[unit.match.id] || null}
                  />
                );
              })}
            </div>
            {matches.length === 0 && (
              <div className="card p-20 text-center border-dashed border-2 border-slate-800">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matches have been deployed for this operation yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal for Admin Tie Resolution */}
        {resolveModalTie && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card bg-slate-900 border border-slate-800 p-6 max-w-md w-full shadow-2xl rounded-3xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Resolve Level Tie
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Aggregate is tied ({resolveModalTie.aggregate_score1}–{resolveModalTie.aggregate_score2}). Enter extra time / penalty winner or select the advancing player:
              </p>

              <div className="space-y-3 mb-6">
                <button
                  disabled={resolvingBusy}
                  onClick={() => handleResolveTieWinner(1)}
                  className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-primary/20 border border-slate-700 hover:border-primary transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerBadge badgeId={resolveModalTie.player1_badge_id} username={resolveModalTie.player1_username || 'Player 1'} size="sm" />
                    <span className="font-bold text-white group-hover:text-primary uppercase tracking-tight truncate">
                      {resolveModalTie.player1_username ? getPublicIdentity(resolveModalTie.player1_username) : 'Player 1'}
                    </span>
                  </div>
                  <span className="text-xs font-black uppercase text-primary px-2.5 py-1 rounded bg-primary/10">Advance</span>
                </button>

                <button
                  disabled={resolvingBusy}
                  onClick={() => handleResolveTieWinner(2)}
                  className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-primary/20 border border-slate-700 hover:border-primary transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerBadge badgeId={resolveModalTie.player2_badge_id} username={resolveModalTie.player2_username || 'Player 2'} size="sm" />
                    <span className="font-bold text-white group-hover:text-primary uppercase tracking-tight truncate">
                      {resolveModalTie.player2_username ? getPublicIdentity(resolveModalTie.player2_username) : 'Player 2'}
                    </span>
                  </div>
                  <span className="text-xs font-black uppercase text-primary px-2.5 py-1 rounded bg-primary/10">Advance</span>
                </button>
              </div>

              <button
                disabled={resolvingBusy}
                onClick={() => setResolveModalTie(null)}
                className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-all text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function FixtureCard({ match, onUpdate, result }: { match: any; onUpdate: (id: string, s1: number, s2: number) => Promise<void> | void; result: any; key?: any }) {
  const [s1, setS1] = useState(match.score1 || 0);
  const [s2, setS2] = useState(match.score2 || 0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setS1(match.score1 || 0);
    setS2(match.score2 || 0);
  }, [match.score1, match.score2]);

  const p1Raw = match.player1?.username || match.player1_username || (typeof match.player1 === 'string' ? match.player1 : null);
  const p2Raw = match.player2?.username || match.player2_username || (typeof match.player2 === 'string' ? match.player2 : null);

  const isPlaceholder = isPlaceholderPlayer(match.player1, p1Raw) && isPlaceholderPlayer(match.player2, p2Raw);

  const stageLabel = (match.stage === 'final') ? 'Grand Final' :
    ((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 1) ? 'Quarter Final' :
    ((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 2) ? 'Semi Final' :
    ((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 3) ? 'Final' :
    `Round ${match.round} • ${match.stage?.replace('_', ' ')}`;

  if (isPlaceholder) {
    return (
      <div className="card p-6 border-dashed border-2 border-white/10 bg-surface/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            {stageLabel}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-900 text-slate-500">
            Awaiting Results
          </span>
        </div>
        <div className="py-6 text-center space-y-1">
          <p className="text-xs font-black text-slate-400 uppercase tracking-tight">
            {getPlaceholderText(match.stage, match.round)}
          </p>
          <p className="text-[9px] text-slate-600 uppercase tracking-widest">
            Participants will populate automatically when previous round concludes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "card p-6 border-white/5 bg-surface/20 hover:border-primary/20 transition-all",
      match.status === 'completed' ? 'opacity-80' : ''
    )}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          {stageLabel}
        </span>
        {match.status === 'completed' ? (
          <div className="flex items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
          </div>
        ) : result ? (
          <div className="flex items-center text-amber-500 text-[10px] font-black uppercase tracking-widest italic">
            <Play className="w-3 h-3 mr-1" /> Pending Proof
          </div>
        ) : (
          <div className="flex items-center text-blue-500 text-[10px] font-black uppercase tracking-widest italic">
            <Play className="w-3 h-3 mr-1" /> Pending Submission
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[
          { id: match.player1?.id, profile: match.player1, username: p1Raw, score: s1, setScore: setS1, isWinner: match.winner === match.player1?.id },
          { id: match.player2?.id, profile: match.player2, username: p2Raw, score: s2, setScore: setS2, isWinner: match.winner === match.player2?.id }
        ].map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border transition-all",
                p.isWinner ? "bg-primary/20 text-primary border-primary/30" : "bg-slate-900 text-slate-500 border-slate-800"
              )}>
                {(getPublicIdentity(p.username || p.profile) || 'U')[0].toUpperCase()}
              </div>
              <span className={cn(
                "text-sm font-black uppercase tracking-tight truncate max-w-[120px]",
                p.isWinner ? "text-primary" : "text-white"
              )}>
                {getPublicIdentity(p.username || p.profile)}
              </span>
            </div>
            
            {editing ? (
              <input 
                type="number" 
                value={p.score} 
                onChange={(e) => p.setScore(parseInt(e.target.value) || 0)}
                className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
            ) : (
              <span className="text-xl font-black text-white italic">{p.score}</span>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 text-center">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Submitted Scores: {result.player1_score} - {result.player2_score}</p>
          {result.screenshot_url && (
            <div className="relative group">
              <StorageImage 
                bucket="result-screenshots" 
                path={result.screenshot_url} 
                className="w-full aspect-video rounded-lg border border-white/5 object-cover grayscale group-hover:grayscale-0 transition-all" 
                alt="Proof" 
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                <span className="text-[10px] font-black text-white uppercase italic">Click to zoom in admin tools</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
        {editing ? (
          <div className="flex space-x-2">
            <button 
              onClick={() => { setEditing(false); onUpdate(match.id, s1, s2); }}
              className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all"
            >
              <Save size={16} />
            </button>
            <button 
              onClick={() => setEditing(false)}
              className="p-2 bg-slate-800 text-slate-500 rounded-lg hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setEditing(true)}
            className="text-[10px] font-black text-primary uppercase tracking-widest italic hover:underline"
          >
            Review Entry
          </button>
        )}
      </div>
    </div>
  );
}
