import React, { useState } from 'react';
import { Trophy, AlertTriangle, Loader2, CheckCircle2, ArrowRight, X, AlertCircle } from 'lucide-react';
import { GroupedTie, getPlayerUuid } from '../../utils/tieUtils';
import { matchService } from '../../services/matchService';
import { PlayerBadge } from '../ui/PlayerBadge';
import { getPublicIdentity, cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LevelTieResolutionBannerProps {
  ties: GroupedTie[];
  onResolved: () => Promise<void> | void;
  className?: string;
}

export default function LevelTieResolutionBanner({
  ties,
  onResolved,
  className
}: LevelTieResolutionBannerProps) {
  const { user, profile } = useAuth();
  const [resolvingTieId, setResolvingTieId] = useState<string | null>(null);
  const [resolvingWinnerId, setResolvingWinnerId] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({});

  // Filter for ties in level_pending_admin state
  const pendingLevelTies = (ties || []).filter(t => t.is_level_pending_admin || t.tie_status === 'level_pending_admin');

  if (!pendingLevelTies.length) {
    return null;
  }

  const handlePickWinner = async (tie: GroupedTie, playerIndex: 1 | 2) => {
    const tieId = tie.tie_id;
    if (!tieId) {
      toast.error('Missing tie identifier.');
      return;
    }

    const playerObj = playerIndex === 1 ? tie.player1 : tie.player2;
    const username = playerIndex === 1 ? tie.player1_username : tie.player2_username;
    const directId = playerIndex === 1 ? tie.player1_id : tie.player2_id;
    const match = tie.leg1 || tie.leg2 || tie.matches?.[0];

    // Clear previous error/success for this tie
    setErrorMessages(prev => {
      const next = { ...prev };
      delete next[tieId];
      return next;
    });

    setResolvingTieId(tieId);
    setResolvingWinnerId(playerIndex === 1 ? 'player1' : 'player2');

    try {
      // Resolve player's UUID
      let winnerId = directId;
      if (!winnerId) {
        winnerId = await getPlayerUuid(playerObj, username, match, playerIndex);
      }

      if (!winnerId) {
        throw new Error(`Could not resolve user ID for player "${username || 'Unknown'}".`);
      }

      const adminId = user?.id || profile?.id;
      const res = await matchService.resolveLevelTie(tieId, winnerId, adminId);

      const winnerDisplayName = username ? getPublicIdentity(username) : 'Winner';
      const successText = `${winnerDisplayName} confirmed as winner and advanced to next round!`;
      
      setSuccessMessages(prev => ({ ...prev, [tieId]: successText }));
      toast.success(successText);

      // Trigger immediate live refresh of parent component (fixtures/matches/tree)
      await onResolved();
    } catch (err: any) {
      console.error('[LevelTieResolution] Error resolving level tie:', err);
      // Surface the RPC error text verbatim
      const errMsg = err?.message || 'Failed to resolve tie';
      setErrorMessages(prev => ({ ...prev, [tieId]: errMsg }));
      toast.error(errMsg);
    } finally {
      setResolvingTieId(null);
      setResolvingWinnerId(null);
    }
  };

  return (
    <div className={cn("space-y-4 mb-8", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <h3 className="text-base font-black text-white italic uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Action Required: Level On Aggregate ({pendingLevelTies.length})
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
          Admin Decision Needed
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pendingLevelTies.map((tie) => {
          const p1User = tie.player1_username ? getPublicIdentity(tie.player1_username) : 'Player 1';
          const p2User = tie.player2_username ? getPublicIdentity(tie.player2_username) : 'Player 2';
          const isCurrentTieResolving = resolvingTieId === tie.tie_id;
          const stageName = (tie.stage || 'Quarterfinal').toUpperCase().replace('_', ' ');
          const currentError = errorMessages[tie.tie_id];
          const currentSuccess = successMessages[tie.tie_id];

          // Compute leg scores
          const leg1ScoreText = tie.leg1_p1_score !== null && tie.leg1_p2_score !== null
            ? `${tie.leg1_p1_score} - ${tie.leg1_p2_score}`
            : 'Pending';
          const leg2ScoreText = tie.leg2_p1_score !== null && tie.leg2_p2_score !== null
            ? `${tie.leg2_p1_score} - ${tie.leg2_p2_score}`
            : 'Pending';
          const aggText = tie.aggregate_score1 !== null && tie.aggregate_score2 !== null
            ? `${tie.aggregate_score1} – ${tie.aggregate_score2}`
            : 'Level';

          return (
            <div
              key={tie.tie_id}
              className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-950/90 to-slate-900/90 p-5 md:p-6 shadow-xl backdrop-blur-md relative overflow-hidden"
            >
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {stageName} · TWO-LEGGED TIE
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    level_pending_admin
                  </span>
                </div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-tight">
                  Aggregate: {aggText} (Level)
                </span>
              </div>

              {/* Match Details & Score Breakdown */}
              <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-white/5">
                {/* Player 1 Card */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface/40 border border-white/5">
                  <PlayerBadge
                    badgeId={tie.player1_badge_id}
                    username={tie.player1_username || 'Player 1'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Player 1</p>
                    <p className="text-sm font-black text-white truncate uppercase italic">{p1User}</p>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="text-center space-y-1 py-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-black text-white">
                    <span>Leg 1: {leg1ScoreText}</span>
                    <span className="text-slate-500">|</span>
                    <span>Leg 2: {leg2ScoreText}</span>
                  </div>
                  <p className="text-[11px] font-black text-amber-400 uppercase tracking-tight">
                    Aggregate Level: {aggText}
                  </p>
                </div>

                {/* Player 2 Card */}
                <div className="flex items-center justify-end gap-3 p-3 rounded-2xl bg-surface/40 border border-white/5">
                  <div className="min-w-0 text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Player 2</p>
                    <p className="text-sm font-black text-white truncate uppercase italic">{p2User}</p>
                  </div>
                  <PlayerBadge
                    badgeId={tie.player2_badge_id}
                    username={tie.player2_username || 'Player 2'}
                    size="sm"
                  />
                </div>
              </div>

              {/* Instructional Context */}
              <div className="pt-4 pb-2">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  This knockout tie concluded level on aggregate after both legs. Because extra time or penalty shootouts are played outside the platform, select which player won to resolve the tie and automatically advance them to the next round:
                </p>
              </div>

              {/* Verbatim Error Message Surface */}
              {currentError && (
                <div className="my-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start justify-between gap-3 text-rose-300">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">Resolution Error from RPC</p>
                      <p className="text-xs font-mono text-rose-200 mt-0.5 break-all">{currentError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setErrorMessages(prev => {
                      const next = { ...prev };
                      delete next[tie.tie_id];
                      return next;
                    })}
                    className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Success Banner */}
              {currentSuccess && (
                <div className="my-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs font-black uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{currentSuccess}</span>
                </div>
              )}

              {/* Action Buttons: Pick Winner */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Player 1 Wins Button */}
                <button
                  type="button"
                  disabled={isCurrentTieResolving}
                  onClick={() => handlePickWinner(tie, 1)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-amber-500 border border-slate-700 hover:border-amber-400 text-white hover:text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    {isCurrentTieResolving && resolvingWinnerId === 'player1' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400 group-hover:text-slate-950" />
                    ) : (
                      <Trophy className="w-4 h-4 text-amber-400 group-hover:text-slate-950 transition-colors" />
                    )}
                    <span className="truncate">Confirm {p1User} Wins</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-950 transition-colors" />
                </button>

                {/* Player 2 Wins Button */}
                <button
                  type="button"
                  disabled={isCurrentTieResolving}
                  onClick={() => handlePickWinner(tie, 2)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-amber-500 border border-slate-700 hover:border-amber-400 text-white hover:text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    {isCurrentTieResolving && resolvingWinnerId === 'player2' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400 group-hover:text-slate-950" />
                    ) : (
                      <Trophy className="w-4 h-4 text-amber-400 group-hover:text-slate-950 transition-colors" />
                    )}
                    <span className="truncate">Confirm {p2User} Wins</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-950 transition-colors" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
