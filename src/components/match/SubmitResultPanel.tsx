import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, Loader2, Trophy, Users } from 'lucide-react';
import { useMatchVerificationState } from '../../hooks/useMatchVerificationState';
import { useSubmitResult } from '../../hooks/useSubmitResult';
import { storageService } from '../../services/storageService';
import { MatchCountdown } from './MatchCountdown';
import { WaitingForOpponent } from './WaitingForOpponent';
import { AutoVerifiedResult } from './AutoVerifiedResult';
import { DisputedResult } from './DisputedResult';
import { AdminReviewBanner } from './AdminReviewBanner';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';

interface SubmitResultPanelProps {
  matchId: string;
  currentUserId: string;
  playerName?: string;
}

export function SubmitResultPanel({ matchId, currentUserId, playerName }: SubmitResultPanelProps) {
  const { state, isLoading, error, refetch, serverTimeOffsetMs } = useMatchVerificationState(matchId);
  const { submit, isSubmitting, submitError } = useSubmitResult(matchId);

  const [score1, setScore1] = useState<string>('');
  const [score2, setScore2] = useState<string>('');
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      />
    );
  }

  if (verification_status === 'disputed') {
    return <DisputedResult submissions={submissions} matchId={matchId} />;
  }

  if (ui_state === 'under_admin_review' || ui_state === 'awaiting_admin_review') {
    return <AdminReviewBanner type="awaiting" />;
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

  const handleSubmit = async () => {
    if (!score1 || !score2 || !screenshotPath) return;
    
    try {
      await submit(parseInt(score1), parseInt(score2), screenshotPath);
      refetch();
    } catch (err) {
      // Error handled by hook
    }
  };

  const isFormValid = score1 !== '' && score2 !== '' && screenshotPath !== null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center">
          <Trophy className="w-4 h-4 mr-2 text-primary" />
          Result Submission
        </h3>
        <MatchCountdown state={state} onExpired={refetch} serverTimeOffsetMs={serverTimeOffsetMs} />
      </div>

      <div className="p-8 space-y-8">
        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Score</label>
            <input 
              type="number"
              min="0"
              max="99"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              disabled={!can_submit || isSubmitting}
              aria-label="Your score"
              className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-black text-center text-white focus:border-primary focus:ring-0 transition-all disabled:opacity-50"
              placeholder="0"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Opponent Score</label>
            <input 
              type="number"
              min="0"
              max="99"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              disabled={!can_submit || isSubmitting}
              aria-label="Opponent score"
              className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-black text-center text-white focus:border-primary focus:ring-0 transition-all disabled:opacity-50"
              placeholder="0"
            />
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Screenshot Evidence</label>
          
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
                className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <div className="bg-red-600 p-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">Remove</div>
              </button>
            </div>
          ) : (
            <div className={cn(
              "relative border-2 border-dashed border-slate-800 rounded-2xl p-12 transition-all group",
              can_submit ? "hover:border-primary/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
            )}>
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={!can_submit || uploading || isSubmitting}
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
        </div>

        {/* Global Error */}
        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={!can_submit || !isFormValid || isSubmitting || uploading}
          className={cn(
            "w-full h-16 flex items-center justify-center space-x-3 rounded-2xl font-black uppercase italic tracking-widest transition-all",
            can_submit && isFormValid
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
              <span>Submit Final Result</span>
              <Check className="w-5 h-5" />
            </>
          )}
        </button>

        {!can_submit && (
          <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            {ui_state === 'awaiting_submissions' ? 'Submissions window is not yet active' : 'Submissions have been locked for this deployment'}
          </p>
        )}
      </div>
    </div>
  );
}
