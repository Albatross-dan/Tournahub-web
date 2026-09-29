import React, { useState, useEffect } from 'react';
import { Trophy, AlertTriangle, CheckCircle2, Play, Calendar, Swords, ChevronRight, Save, X, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, getPublicIdentity } from '../../lib/utils';
import { GroupedTie, formatLegLabel, isPlaceholderPlayer, getPlayerUuid } from '../../utils/tieUtils';
import { matchService } from '../../services/matchService';
import { PlayerBadge } from '../ui/PlayerBadge';
import StorageImage from '../common/StorageImage';
import toast from 'react-hot-toast';

interface TwoLeggedTieCardProps {
  tie: GroupedTie;
  variant?: 'admin' | 'public';
  onUpdateScore?: (matchId: string, s1: number, s2: number) => Promise<void> | void;
  onResolveTie?: (tie: GroupedTie) => void;
  onResolveWinner?: (tie: GroupedTie, winnerId: string) => Promise<void> | void;
  onResolved?: () => Promise<void> | void;
  matchResults?: Record<string, any>;
  className?: string;
}

export default function TwoLeggedTieCard({
  tie,
  variant = 'public',
  onUpdateScore,
  onResolveTie,
  onResolveWinner,
  onResolved,
  matchResults = {},
  className
}: TwoLeggedTieCardProps) {
  const [resolvingWinner, setResolvingWinner] = useState<number | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const p1Name = tie.player1_username ? getPublicIdentity(tie.player1_username) : 'TBD';
  const p2Name = tie.player2_username ? getPublicIdentity(tie.player2_username) : 'TBD';
  const isPlaceholder = tie.is_placeholder;

  const leg1 = tie.leg1;
  const leg2 = tie.leg2;

  // Aggregate stats
  const agg1 = tie.aggregate_score1;
  const agg2 = tie.aggregate_score2;
  const advancingUser = tie.advancing_player_username ? getPublicIdentity(tie.advancing_player_username) : null;
  const isLevel = tie.is_level_pending_admin;
  const isCompleted = tie.is_completed;

  const cleanStage = (tie.stage || 'QUARTERFINAL').toUpperCase().replace('_', ' ');

  if (isPlaceholder) {
    return (
      <div className={cn(
        "rounded-2xl border-2 border-dashed border-border-main/50 bg-surface/30 p-6 relative overflow-hidden backdrop-blur-sm",
        className
      )}>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-main/30">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-primary/60" />
            {cleanStage} · TWO-LEGGED TIE
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Awaiting Results
          </span>
        </div>

        <div className="py-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Swords className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-sm font-black text-text-muted uppercase tracking-tight">
            {tie.placeholder_text || 'TBD — awaiting previous round results'}
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-text-muted/60 font-bold uppercase tracking-widest pt-2">
            <span>Leg 1 (Home/Away)</span>
            <span>•</span>
            <span>Leg 2 (Reverse)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 relative overflow-hidden backdrop-blur-md shadow-lg",
      isCompleted 
        ? "border-emerald-500/30 bg-surface/80 hover:border-emerald-500/50" 
        : isLevel
          ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500"
          : "border-border-main bg-surface/80 hover:border-primary/40",
      className
    )}>
      {/* Top Tie Bar */}
      <div className="px-5 py-3 bg-background/60 border-b border-border-main/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary italic flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            {cleanStage} · TWO-LEGGED TIE
          </span>
          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            Aggregate
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="flex items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest italic bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Aggregate Complete
            </span>
          ) : isLevel ? (
            <span className="flex items-center text-amber-400 text-[10px] font-black uppercase tracking-widest italic bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" /> Level on Aggregate
            </span>
          ) : tie.is_leg1_completed ? (
            <span className="flex items-center text-blue-400 text-[10px] font-black uppercase tracking-widest italic bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              <Play className="w-3 h-3 mr-1" /> Leg 1 Complete
            </span>
          ) : (
            <span className="flex items-center text-text-muted text-[10px] font-black uppercase tracking-widest italic bg-slate-800/60 border border-slate-700/40 px-2.5 py-0.5 rounded-full">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Banner Section */}
      {isCompleted && advancingUser && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/25 to-emerald-500/15 border-b border-emerald-500/30 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2 text-emerald-400">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>
              Aggregate: {agg1 !== null && agg2 !== null ? `${agg1}–${agg2}` : 'Complete'} — <strong className="text-white underline underline-offset-2">{advancingUser}</strong> advances 🏆
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
            ADVANCED
          </span>
        </div>
      )}

      {/* Level Pending Admin Alert Banner */}
      {isLevel && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-tight">
                  Level on aggregate ({agg1 ?? 0}–{agg2 ?? 0}) — awaiting admin decision on extra time/penalties
                </p>
                <p className="text-[10px] text-amber-400/80 font-medium">
                  Leg 1: {tie.leg1_p1_score ?? 0}–{tie.leg1_p2_score ?? 0} · Leg 2: {tie.leg2_p1_score ?? 0}–{tie.leg2_p2_score ?? 0} · Aggregate: {agg1 ?? 0}–{agg2 ?? 0} (Level)
                </p>
              </div>
            </div>
            {onResolveTie && (
              <button
                type="button"
                onClick={() => onResolveTie(tie)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition-all shrink-0 cursor-pointer"
              >
                Resolve Tie
              </button>
            )}
          </div>

          {(variant === 'admin' || onResolveWinner) && (
            <div className="pt-2 border-t border-amber-500/20 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mr-1">
                  Pick Advancing Winner:
                </span>
                <button
                  type="button"
                  disabled={resolvingWinner !== null}
                  onClick={async () => {
                    setInlineError(null);
                    setResolvingWinner(1);
                    try {
                      let wId = tie.player1_id;
                      if (!wId) {
                        wId = await getPlayerUuid(tie.player1, tie.player1_username, tie.leg1 || tie.leg2, 1);
                      }
                      if (!wId) throw new Error(`Could not resolve user ID for "${p1Name}".`);

                      if (onResolveWinner) {
                        await onResolveWinner(tie, wId);
                      } else {
                        await matchService.resolveLevelTie(tie.tie_id, wId);
                        toast.success(`${p1Name} confirmed as winner and advanced!`);
                        await onResolved?.();
                      }
                    } catch (err: any) {
                      const msg = err?.message || 'Failed to resolve tie';
                      setInlineError(msg);
                      toast.error(msg);
                    } finally {
                      setResolvingWinner(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-amber-500 border border-slate-700 hover:border-amber-400 text-white hover:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {resolvingWinner === 1 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3 text-amber-400" />}
                  <span>{p1Name} Wins</span>
                </button>

                <button
                  type="button"
                  disabled={resolvingWinner !== null}
                  onClick={async () => {
                    setInlineError(null);
                    setResolvingWinner(2);
                    try {
                      let wId = tie.player2_id;
                      if (!wId) {
                        wId = await getPlayerUuid(tie.player2, tie.player2_username, tie.leg1 || tie.leg2, 2);
                      }
                      if (!wId) throw new Error(`Could not resolve user ID for "${p2Name}".`);

                      if (onResolveWinner) {
                        await onResolveWinner(tie, wId);
                      } else {
                        await matchService.resolveLevelTie(tie.tie_id, wId);
                        toast.success(`${p2Name} confirmed as winner and advanced!`);
                        await onResolved?.();
                      }
                    } catch (err: any) {
                      const msg = err?.message || 'Failed to resolve tie';
                      setInlineError(msg);
                      toast.error(msg);
                    } finally {
                      setResolvingWinner(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-amber-500 border border-slate-700 hover:border-amber-400 text-white hover:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {resolvingWinner === 2 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3 text-amber-400" />}
                  <span>{p2Name} Wins</span>
                </button>
              </div>

              {inlineError && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-start justify-between gap-2">
                  <span>RPC Error: {inlineError}</span>
                  <button onClick={() => setInlineError(null)} className="text-rose-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Running Context when Leg 1 is complete and Leg 2 is pending/active */}
      {!isCompleted && tie.is_leg1_completed && !isLevel && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-5 py-2 flex items-center justify-between text-blue-300 text-xs">
          <div className="flex items-center gap-2 font-black uppercase tracking-tight">
            <span>
              Leg 1 Result: {p1Name} {tie.leg1_p1_score}–{tie.leg1_p2_score} {p2Name}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
            {tie.leg1_p1_score! > tie.leg1_p2_score! ? `${p1Name} leads on agg` : tie.leg1_p2_score! > tie.leg1_p1_score! ? `${p2Name} leads on agg` : 'Level on agg'}
          </span>
        </div>
      )}

      {/* Two Legs Display */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Leg 1 Box */}
        {leg1 && (
          <LegRow 
            legMatch={leg1}
            legNumber={1}
            stage={tie.stage}
            isReverse={false}
            variant={variant}
            onUpdateScore={onUpdateScore}
            result={matchResults[leg1.id || leg1.match_id]}
            primaryP1={p1Name}
            primaryP2={p2Name}
          />
        )}

        {/* Divider with VS Icon */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-border-main/50 w-full" />
          <span className="absolute bg-surface px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-text-muted border border-border-main/40">
            Reverse Home/Away
          </span>
        </div>

        {/* Leg 2 Box */}
        {leg2 && (
          <LegRow 
            legMatch={leg2}
            legNumber={2}
            stage={tie.stage}
            isReverse={true}
            variant={variant}
            onUpdateScore={onUpdateScore}
            result={matchResults[leg2.id || leg2.match_id]}
            primaryP1={p1Name}
            primaryP2={p2Name}
            leg1Summary={tie.is_leg1_completed ? `Leg 1: ${p1Name} ${tie.leg1_p1_score}–${tie.leg1_p2_score} ${p2Name}` : undefined}
          />
        )}
      </div>
    </div>
  );
}

function LegRow({
  legMatch,
  legNumber,
  stage,
  isReverse,
  variant,
  onUpdateScore,
  result,
  primaryP1,
  primaryP2,
  leg1Summary
}: {
  legMatch: any;
  legNumber: number;
  stage: string;
  isReverse: boolean;
  variant: 'admin' | 'public';
  onUpdateScore?: (matchId: string, s1: number, s2: number) => Promise<void> | void;
  result?: any;
  primaryP1: string;
  primaryP2: string;
  leg1Summary?: string;
}) {
  const [s1, setS1] = useState(legMatch.score1 ?? 0);
  const [s2, setS2] = useState(legMatch.score2 ?? 0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setS1(legMatch.score1 ?? 0);
    setS2(legMatch.score2 ?? 0);
  }, [legMatch.score1, legMatch.score2]);

  const p1Raw = legMatch.player1_username || legMatch.player1?.username || (typeof legMatch.player1 === 'string' ? legMatch.player1 : null);
  const p2Raw = legMatch.player2_username || legMatch.player2?.username || (typeof legMatch.player2 === 'string' ? legMatch.player2 : null);

  const p1Name = p1Raw ? getPublicIdentity(p1Raw) : 'TBD';
  const p2Name = p2Raw ? getPublicIdentity(p2Raw) : 'TBD';

  const isCompleted = legMatch.status === 'completed' || legMatch.match_status === 'completed';
  const legLabel = formatLegLabel(stage, legNumber, 2);

  const matchId = legMatch.id || legMatch.match_id;

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      isCompleted ? "border-border-main bg-background/50" : "border-border-main/60 bg-background/30"
    )}>
      {/* Leg Subheader */}
      <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono tracking-widest">{legLabel}</span>
          {isReverse && (
            <span className="text-[8px] text-text-muted px-1 rounded bg-slate-800">
              Home/Away Reversed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {leg1Summary && !isCompleted && (
            <span className="text-[9px] text-blue-400 font-bold hidden sm:inline-block">
              {leg1Summary}
            </span>
          )}
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-black",
            isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-400"
          )}>
            {legMatch.status || legMatch.match_status || 'scheduled'}
          </span>
        </div>
      </div>

      {/* Players & Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Player 1 (Home for this leg) */}
        <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PlayerBadge badgeId={legMatch.player1_badge_id} username={p1Raw || 'TBD'} size="sm" />
            <div className="min-w-0">
              <span className="font-black text-xs uppercase tracking-tight text-text-main truncate block">
                {p1Name}
              </span>
              <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                Home
              </span>
            </div>
          </div>
          
          {/* Score 1 */}
          <div className="sm:hidden">
            {editing ? (
              <input 
                type="number"
                value={s1}
                onChange={(e) => setS1(parseInt(e.target.value) || 0)}
                className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
            ) : (
              <span className="font-black text-base italic px-2 py-1 bg-surface rounded min-w-[28px] text-center inline-block">
                {isCompleted ? (legMatch.score1 ?? 0) : (legMatch.score1 ?? '-')}
              </span>
            )}
          </div>
        </div>

        {/* Center / VS & Score in Desktop */}
        <div className="hidden sm:flex items-center justify-center gap-3 px-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <input 
                type="number"
                value={s1}
                onChange={(e) => setS1(parseInt(e.target.value) || 0)}
                className="w-11 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
              <span className="text-text-muted font-bold">:</span>
              <input 
                type="number"
                value={s2}
                onChange={(e) => setS2(parseInt(e.target.value) || 0)}
                className="w-11 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-surface/80 border border-border-main/50 px-3 py-1 rounded-xl">
              <span className="font-black text-sm italic min-w-[16px] text-center">
                {isCompleted ? (legMatch.score1 ?? 0) : (legMatch.score1 ?? '-')}
              </span>
              <span className="text-text-muted text-[10px] font-bold">:</span>
              <span className="font-black text-sm italic min-w-[16px] text-center">
                {isCompleted ? (legMatch.score2 ?? 0) : (legMatch.score2 ?? '-')}
              </span>
            </div>
          )}
        </div>

        {/* Player 2 (Away for this leg) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
          <div className="sm:hidden">
            {editing ? (
              <input 
                type="number"
                value={s2}
                onChange={(e) => setS2(parseInt(e.target.value) || 0)}
                className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
            ) : (
              <span className="font-black text-base italic px-2 py-1 bg-surface rounded min-w-[28px] text-center inline-block">
                {isCompleted ? (legMatch.score2 ?? 0) : (legMatch.score2 ?? '-')}
              </span>
            )}
          </div>

          <div className="flex items-center sm:flex-row-reverse gap-2 min-w-0 flex-1 sm:text-right">
            <PlayerBadge badgeId={legMatch.player2_badge_id} username={p2Raw || 'TBD'} size="sm" />
            <div className="min-w-0">
              <span className="font-black text-xs uppercase tracking-tight text-text-main truncate block">
                {p2Name}
              </span>
              <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                Away
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Review Section if in Admin mode */}
      {result && variant === 'admin' && (
        <div className="mt-3 p-2.5 bg-black/40 rounded-xl border border-white/5 text-center text-[9px] font-bold text-slate-400">
          <span>Submitted: {result.player1_score} - {result.player2_score}</span>
          {result.screenshot_url && (
            <div className="mt-2 max-w-[200px] mx-auto">
              <StorageImage 
                bucket="result-screenshots" 
                path={result.screenshot_url} 
                className="w-full aspect-video rounded border border-white/5 object-cover" 
                alt="Proof" 
              />
            </div>
          )}
        </div>
      )}

      {/* Admin Controls */}
      {variant === 'admin' && onUpdateScore && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[8px] font-mono text-slate-500 uppercase">
            ID: {String(matchId).slice(0, 8)}...
          </span>

          {editing ? (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={async () => {
                  setEditing(false);
                  await onUpdateScore(matchId, s1, s2);
                }}
                className="p-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-all"
                title="Save Score"
              >
                <Save size={14} />
              </button>
              <button 
                onClick={() => setEditing(false)}
                className="p-1.5 bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setEditing(true)}
              className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider"
            >
              Edit Score
            </button>
          )}
        </div>
      )}
    </div>
  );
}
