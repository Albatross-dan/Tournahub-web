import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, Loader2, Trophy, Users, Clock } from 'lucide-react';
import { useMatchVerificationState } from '../../hooks/useMatchVerificationState';
import { useSubmitResult } from '../../hooks/useSubmitResult';
import { storageService } from '../../services/storageService';
import { WaitingForOpponent } from './WaitingForOpponent';
import { AutoVerifiedResult } from './AutoVerifiedResult';
import { DisputedResult } from './DisputedResult';
import { AdminReviewBanner } from './AdminReviewBanner';
import { cn, getPublicIdentity } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';

interface SubmitResultPanelProps {
  matchId: string;
  currentUserId: string;
  playerName?: string;
  match?: any;
}

export function SubmitResultPanel({ matchId, currentUserId, playerName, match }: SubmitResultPanelProps) {
  const { state, isLoading, error, refetch, serverTimeOffsetMs } = useMatchVerificationState(matchId);
  const { submit, isSubmitting, submitError: hookSubmitError } = useSubmitResult(matchId);

  const [score1, setScore1] = useState<string>('');
  const [score2, setScore2] = useState<string>('');
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Player identity extraction
  const player1Id = typeof match?.player1 === 'object' ? match?.player1?.id : match?.player1;
  const isPlayer1 = currentUserId === player1Id;
  const myName = isPlayer1 ? getPublicIdentity(match?.player1) : getPublicIdentity(match?.player2);
  const opponentName = isPlayer1 ? getPublicIdentity(match?.player2) : getPublicIdentity(match?.player1);

  const scheduledAt = match?.scheduled_at;
  const playWindowMinutes = match?.play_window_minutes ?? 30;
  const submissionGraceMinutes = match?.submission_grace_minutes ?? 10;
  const matchStatus = match?.status;

  const matchStart = scheduledAt ? new Date(scheduledAt) : null;
  const playWindowEndObj = matchStart ? new Date(matchStart.getTime() + playWindowMinutes * 60000) : null;
  const submissionCloseObj = playWindowEndObj ? new Date(playWindowEndObj.getTime() + submissionGraceMinutes * 60000) : null;

  const [currentNow, setCurrentNow] = useState(() => new Date(Date.now() + (serverTimeOffsetMs || 0)));

  useEffect(() => {
    setCurrentNow(new Date(Date.now() + (serverTimeOffsetMs || 0)));
  }, [serverTimeOffsetMs]);

  useEffect(() => {
    if (!matchStart) return;

    const interval = setInterval(() => {
      const updatedNow = new Date(Date.now() + (serverTimeOffsetMs || 0));
      setCurrentNow(updatedNow);

      const isPhaseD = playWindowEndObj && submissionCloseObj && updatedNow >= submissionCloseObj;
      if (isPhaseD) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt, playWindowMinutes, submissionGraceMinutes, serverTimeOffsetMs]);

  const phase = (() => {
    if (!matchStart || !playWindowEndObj || !submissionCloseObj) return 'UNKNOWN';
    if (currentNow < matchStart) return 'PHASE_A';
    if (currentNow >= matchStart && currentNow < playWindowEndObj) return 'PHASE_B';
    if (currentNow >= playWindowEndObj && currentNow < submissionCloseObj) return 'PHASE_C';
    return 'PHASE_D';
  })();

  // Trigger refetch on boundary crossing to ensure backend state updates are fetched
  const prevPhaseRef = React.useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      refetch();
      prevPhaseRef.current = phase;
    }
  }, [phase, refetch]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl border border-slate-800 animate-pulse">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Match State...</span>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
        <span className="text-red-500 font-bold tracking-tight">System failure: Unable to retrieve verification telemetry.</span>
      </div>
    );
  }

  const {
    verification_status,
    ui_state,
    can_submit,
    play_window_end,
    submission_deadline,
    submissions,
    match_status
  } = state;

  // Render appropriate state view
  if (ui_state === 'waiting_for_opponent') {
    const mySub = submissions?.find((s: any) => s.username === playerName);
    const opponent = submissions?.find((s: any) => s.username !== playerName);

    if (mySub) {
      return (
        <WaitingForOpponent 
          submission={mySub}
          deadline={submission_deadline}
          opponentUsername={opponent?.username || 'Opponent'}
          serverTimeOffsetMs={serverTimeOffsetMs}
        />
      );
    }
  }

  if (ui_state === 'auto_verified' || ui_state === 'completed' || ui_state === 'admin_verified') {
    const winner_username = state.winner_username;
    return (
      <AutoVerifiedResult 
        finalScore1={state.final_score1 || 0}
        finalScore2={state.final_score2 || 0}
        submissions={submissions}
        winner={winner_username}
        matchId={matchId}
        playerName={playerName}
        tournamentId={match?.tournament_id}
      />
    );
  }

  if (verification_status === 'disputed' || ui_state === 'under_admin_review' || ui_state === 'awaiting_admin_review') {
    return (
      <DisputedResult 
        submissions={submissions} 
        matchId={matchId} 
        tournamentId={match?.tournament_id} 
      />
    );
  }

  if (ui_state === 'abandoned') {
    return <AdminReviewBanner type="abandoned" />;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const path = await storageService.uploadScreenshot(file, matchId, currentUserId);
      setScreenshotPath(path);
    } catch (err: any) {
      setUploadError(err.message || 'Transmission failed. Signal lost during upload.');
    } finally {
      setUploading(false);
    }
  };

  // Error grouping & matching
  const submitError = hookSubmitError || localError;
  const isAlreadySubmitted = (submitError || '').toLowerCase().includes('already submitted');
  const isDeadlineExpired = (submitError || '').toLowerCase().includes('deadline');
  const isScreenshotError = (submitError || '').toLowerCase().includes('screenshot') || !!uploadError;

  const handleSubmit = async () => {
    setLocalError(null);
    const s1Val = parseFloat(score1);
    const s2Val = parseFloat(score2);

    if (score1 === '' || score2 === '') {
      setLocalError('Both scores must be entered.');
      return;
    }

    if (isNaN(s1Val) || isNaN(s2Val)) {
      setLocalError('Both scores must be valid integers.');
      return;
    }

    if (s1Val < 0 || s2Val < 0 || !Number.isInteger(s1Val) || !Number.isInteger(s2Val)) {
      setLocalError('Both scores must be integers greater than or equal to 0.');
      return;
    }

    const isKnockout = match?.tournaments?.type === 'knockout';
    if (isKnockout && s1Val === s2Val) {
      setLocalError('Knockout tournaments do not allow equal scores (no draws).');
      return;
    }

    setShowConfirm(true);
  };

  const handleFinalConfirmSubmit = async () => {
    setShowConfirm(false);
    try {
      await submit(parseInt(score1), parseInt(score2), screenshotPath);
      refetch();
    } catch (err) {
      // Handled by hook
    }
  };

  const isFormValid = score1 !== '' && score2 !== '';

  const formatHHMMSS = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const formatMMSS = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}`;
  };

  let leftLabel = "Submit Match Result";
  let clockText = "";
  let clockColorClass = "";
  let showClock = false;

  if (phase === 'PHASE_A') {
    leftLabel = "MATCH STARTS IN";
    const diffSecs = Math.max(0, Math.floor((matchStart!.getTime() - currentNow.getTime()) / 1000));
    clockText = formatHHMMSS(diffSecs);
    clockColorClass = "text-slate-400";
    showClock = true;
  } else if (phase === 'PHASE_B') {
    leftLabel = "PLAY NOW  •  SUBMITS OPEN IN";
    const diffSecs = Math.max(0, Math.floor((playWindowEndObj!.getTime() - currentNow.getTime()) / 1000));
    clockText = formatMMSS(diffSecs);
    clockColorClass = "text-slate-400";
    showClock = true;
  } else if (phase === 'PHASE_C') {
    leftLabel = "SUBMIT MATCH RESULT  •  CLOSES IN";
    const diffSecs = Math.max(0, Math.floor((submissionCloseObj!.getTime() - currentNow.getTime()) / 1000));
    clockText = formatMMSS(diffSecs);
    clockColorClass = "text-amber-500 animate-pulse";
    showClock = true;
  } else if (phase === 'PHASE_D') {
    leftLabel = "SUBMISSION CLOSED";
    clockText = "";
    clockColorClass = "";
    showClock = false;
  }

  const getSubmitButtonLabel = () => {
    if (isSubmitting) {
      return "Transmitting...";
    }
    if (phase === 'PHASE_D') {
      return "SUBMISSION CLOSED";
    }
    if (phase === 'PHASE_C') {
      return "SUBMIT RESULT ✓";
    }
    return "SUBMIT RESULT";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center animate-in fade-in duration-200">
          <div className="space-y-6 max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black text-white uppercase italic tracking-widest">Verify Scores</h4>
              <p className="text-xs text-slate-400">
                Confirm: You scored <span className="font-mono text-white font-extrabold text-sm">{score1}</span>, opponent scored <span className="font-mono text-white font-extrabold text-sm">{score2}</span>.
              </p>
              <p className="text-red-400 uppercase tracking-widest text-[9px] font-black mt-2">
                This cannot be changed.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all cursor-pointer"
              >
                No, Edit
              </button>
              <button
                onClick={handleFinalConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <span>Yes, Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center text-xs">
            <Trophy className="w-4 h-4 mr-2 text-primary" />
            Submit Match Result
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            {myName} vs {opponentName}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          {showClock && (
            <div className={cn("flex items-center space-x-2 font-mono text-base font-black italic tracking-tighter sm:text-lg", clockColorClass)}>
              <Clock className="w-4 h-4" />
              <span>{clockText}</span>
            </div>
          )}
          {phase === 'PHASE_B' && (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Submit your result once the play window closes
            </p>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              {myName} Score (You)
            </label>
            <input 
              type="number"
              min="0"
              step="1"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              disabled={phase !== 'PHASE_C' || isSubmitting || isAlreadySubmitted}
              aria-label="Your score"
              className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-black text-center text-white focus:border-primary focus:ring-0 transition-all disabled:opacity-50"
              placeholder="0"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              {opponentName} Score
            </label>
            <input 
              type="number"
              min="0"
              step="1"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              disabled={phase !== 'PHASE_C' || isSubmitting || isAlreadySubmitted}
              aria-label="Opponent score"
              className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-black text-center text-white focus:border-primary focus:ring-0 transition-all disabled:opacity-50"
              placeholder="0"
            />
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Screenshot Evidence</label>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5">Recommended</span>
          </div>
          
          {screenshotPath ? (
            <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 aspect-video bg-slate-950">
              <StorageImage 
                bucket="result-screenshots" 
                path={screenshotPath} 
                alt="Match proof" 
                className="w-full h-full object-cover" 
              />
              <button 
                onClick={() => { setScreenshotPath(null); }}
                className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                disabled={phase !== 'PHASE_C' || isAlreadySubmitted}
              >
                <div className="bg-red-600 p-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">Remove</div>
              </button>
            </div>
          ) : (
            <div className={cn(
              "relative border-2 border-dashed rounded-2xl p-12 transition-all group",
              isScreenshotError ? "border-red-500/50 bg-red-500/5" : "border-slate-800",
              phase === 'PHASE_C' && !isAlreadySubmitted ? "hover:border-primary/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
            )}>
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={phase !== 'PHASE_C' || uploading || isSubmitting || isAlreadySubmitted}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center justify-center text-center">
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Uploading Encrypted Intel...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-600 group-hover:text-primary transition-colors mb-3" />
                    <span className="text-slate-400 font-bold uppercase tracking-tight mb-1">Click or drag to upload proof</span>
                    <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">PNG, JPG up to 10MB</span>
                  </>
                )}
              </div>
            </div>
          )}
          {uploadError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">{uploadError}</p>}
          {isScreenshotError && !uploadError && (
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">
              Verification proof required. Highlight error: Screenshot issue detected.
            </p>
          )}
        </div>

        {/* Submission Error Message Displays */}
        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
              {isAlreadySubmitted ? "You have already submitted a result for this match." : 
               isDeadlineExpired ? "Submission deadline has passed." : submitError}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={phase !== 'PHASE_C' || !isFormValid || isSubmitting || uploading || isAlreadySubmitted}
          className={cn(
            "w-full h-16 flex items-center justify-center space-x-3 rounded-2xl font-black uppercase italic tracking-widest transition-all cursor-pointer",
            phase === 'PHASE_C' && isFormValid && !isAlreadySubmitted
              ? "bg-primary text-black hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Transmitting...</span>
            </>
          ) : (
            <>
              <span>{getSubmitButtonLabel()}</span>
              {phase === 'PHASE_C' && !isAlreadySubmitted && <Check className="w-5 h-5" />}
            </>
          )}
        </button>

        {phase !== 'PHASE_C' && (
          <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            {phase === 'PHASE_D' ? 'Submissions have been locked for this deployment' : 'Submissions window is not yet active'}
          </p>
        )}
      </div>
    </div>
  );
}
