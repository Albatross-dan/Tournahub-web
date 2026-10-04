import React, { useState, useEffect, useRef } from 'react';
import { Upload, Check, AlertCircle, Loader2, Trophy, Users, Clock, CheckCircle2 } from 'lucide-react';
import { useMatchVerificationState } from '../../hooks/useMatchVerificationState';
import { matchService } from '../../services/matchService';
import { storageService } from '../../services/storageService';
import { WaitingForOpponent } from './WaitingForOpponent';
import { AutoVerifiedResult } from './AutoVerifiedResult';
import { DisputedResult } from './DisputedResult';
import { AdminReviewBanner } from './AdminReviewBanner';
import { cn, getPublicIdentity } from '../../lib/utils';
import { supabase, ensureAuthenticated } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import StorageImage from '../common/StorageImage';
import { useCountdown } from '../../hooks/useCountdown';
import GuideTip from '../../guide/GuideTip';

interface SubmitResultPanelProps {
  matchId: string;
  currentUserId: string;
  playerName?: string;
  match?: any;
}

export function SubmitResultPanel({ matchId, currentUserId, playerName, match }: SubmitResultPanelProps) {
  const { state, isLoading, error, refetch, serverTimeOffsetMs } = useMatchVerificationState(matchId);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const [score1, setScore1] = useState<string>('');
  const [score2, setScore2] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotBuffer, setScreenshotBuffer] = useState<ArrayBuffer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formDisabled, setFormDisabled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [myResult, setMyResult] = useState<any>(null);
  const [rejectedResult, setRejectedResult] = useState<any>(null);
  const [checkingSubmission, setCheckingSubmission] = useState<boolean>(true);

  const checkMySub = async () => {
    if (!matchId || !currentUserId) return;
    try {
      const { data: activeSub } = await supabase
        .from('match_results')
        .select('id, player1_score, player2_score, status, created_at')
        .eq('match_id', matchId)
        .eq('submitted_by', currentUserId)
        .eq('is_active', true)
        .in('status', ['submitted', 'pending_confirmation', 'disputed', 'verified'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: rejSub } = await supabase
        .from('match_results')
        .select('id, player1_score, player2_score, status, created_at')
        .eq('match_id', matchId)
        .eq('submitted_by', currentUserId)
        .eq('is_active', true)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setMyResult(activeSub || null);
      setRejectedResult(rejSub || null);
    } catch (err) {
      console.error('[SubmitResultPanel] Exception checking submissions:', err);
    } finally {
      setCheckingSubmission(false);
    }
  };

  useEffect(() => {
    checkMySub();
  }, [state?.submissions, matchId, currentUserId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Player identity extraction
  const player1Id = typeof match?.player1 === 'object' ? match?.player1?.id : match?.player1;
  const isPlayer1 = currentUserId === player1Id;

  // Pre-populate scores if user has already submitted to ensure inputs are populated and disabled
  useEffect(() => {
    if (state?.submissions) {
      const mySub = state.submissions.find((s: any) => s.submitted_by === currentUserId);
      if (mySub) {
        const myScore = isPlayer1 ? (mySub.player1_score ?? mySub.score1) : (mySub.player2_score ?? mySub.score2);
        const oppScore = isPlayer1 ? (mySub.player2_score ?? mySub.score2) : (mySub.player1_score ?? mySub.score1);
        setScore1(String(myScore ?? ''));
        setScore2(String(oppScore ?? ''));
      }
    }
  }, [state?.submissions, currentUserId, isPlayer1]);

  const myName = isPlayer1 ? getPublicIdentity(match?.player1) : getPublicIdentity(match?.player2);
  const opponentName = isPlayer1 ? getPublicIdentity(match?.player2) : getPublicIdentity(match?.player1);

  const scheduledAt = match?.scheduled_at;
  const preMatchCountdown = useCountdown(scheduledAt || '', serverTimeOffsetMs);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (state && typeof state.seconds_until_deadline === 'number') {
      setSecondsRemaining(state.seconds_until_deadline);
    }
  }, [state?.seconds_until_deadline]);

  useEffect(() => {
    if (state?.countdown_state !== 'active') return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [state?.countdown_state]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [refetch]);

  if (isLoading || checkingSubmission) {
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

  if (myResult) {
    return (
      <div className="submission-locked-card bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xl relative">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
          <CheckCircle2 className="text-emerald-500 w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-black text-xs sm:text-sm text-white uppercase italic tracking-wider leading-none">You've already submitted</p>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {myResult.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            You submitted <span className="text-white font-bold">{myResult.player1_score} – {myResult.player2_score}</span>.
            {myResult.status === 'disputed' 
              ? ' Your opponent submitted a different score — an admin will review this shortly.'
              : myResult.status === 'verified'
              ? ' This result has been confirmed.'
              : ' Waiting for your opponent to confirm.'}
          </p>
        </div>
      </div>
    );
  }

  const {
    verification_status,
    ui_state,
    can_submit,
    total_window_minutes,
    match_deadline,
    seconds_until_deadline,
    countdown_state,
    submissions,
    match_status
  } = state;

  // Render appropriate state view
  if (ui_state === 'waiting_for_opponent') {
    const mySub = submissions?.find((s: any) => s.submitted_by === currentUserId);
    const opponent = submissions?.find((s: any) => s.submitted_by !== currentUserId);

    if (mySub) {
      return (
        <WaitingForOpponent 
          submission={mySub}
          deadline={match_deadline || ''}
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
        currentUserId={currentUserId}
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

  const convertToJpg = (file: File): Promise<{ buffer: ArrayBuffer; name: string; type: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context could not be created'));
            URL.revokeObjectURL(objectUrl);
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Canvas conversion failed'));
              return;
            }
            try {
              // Read arrayBuffer immediately in the same callback context of canvas.toBlob to prevent browser revocation!
              const buf = await blob.arrayBuffer();
              const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || 'screenshot';
              resolve({
                buffer: buf,
                name: `${nameWithoutExt}.jpg`,
                type: 'image/jpeg'
              });
            } catch (err) {
              reject(err);
            }
          }, 'image/jpeg', 0.9);
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for conversion'));
      };
      img.src = objectUrl;
    });
  };

  const performUpload = async (buffer: ArrayBuffer, name: string, type: string) => {
    console.log('[SubmitResultPanel] [STEP 3] Upload started for file:', {
      name,
      size: buffer.byteLength,
      type
    });
    setUploading(true);
    setUploadError(null);
    setPublicUrl(null);

    try {
      // Hydrate session prior to upload to prevent auth-mismatch CORS "Failed to fetch" errors
      await ensureAuthenticated();

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error("You must be logged in to upload evidence. Please log in again.");
      }

      const fileExt = name ? (name.split('.').pop() || 'png') : 'png';
      const filePath = `${user.id}/match_${matchId}_${Date.now()}.${fileExt}`;

      console.log('[SubmitResultPanel] Uploading screenshot directly to path:', filePath);

      // Create browser Blob from in-memory ArrayBuffer.
      // Plain Blob bypasses the iOS Safari fetch new File() serialization/Failed to fetch bug completely!
      const blobToUpload = new Blob([buffer], { type });

      const { data, error: uploadErr } = await supabase.storage
        .from('result-screenshots')
        .upload(filePath, blobToUpload, {
          cacheControl: '3600',
          contentType: type,
          upsert: true
        });

      if (uploadErr) {
        console.error('Screenshot upload failed:', uploadErr);
        setUploadError(uploadErr.message);
        return;
      }

      // Get the full public URL from supabase
      const { data: publicUrlData } = supabase.storage
        .from('result-screenshots')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to retrieve public/signed URL for the uploaded screenshot.");
      }

      console.log('[SubmitResultPanel] [STEP 4] Upload complete successfully. Public URL:', publicUrlData.publicUrl);
      setPublicUrl(publicUrlData.publicUrl);
      toast.success("Screenshot uploaded successfully!");
    } catch (uError: any) {
      const errMsg = uError?.message || uError?.toString() || 'Unknown upload error';
      console.error('[SubmitResultPanel] Screenshot upload failed:', uError);
      setUploadError(`Upload failed: ${errMsg}`);
      toast.error(`Screenshot upload failed: ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[SubmitResultPanel] [STEP 1] handleFileUpload invoked. e.target.files:', e.target.files);
    const originalFile = e.target.files?.[0];
    if (!originalFile) {
      console.warn('[SubmitResultPanel] e.target.files is empty or null');
      return;
    }

    console.log('[SubmitResultPanel] Original file selected:', {
      name: originalFile.name,
      size: originalFile.size,
      type: originalFile.type
    });

    // CRITICAL: Read the array buffer immediately before any async wait, state updates, or canvas operations!
    // This maintains synchronous reference permission on iOS/Safari.
    let buffer: ArrayBuffer;
    try {
      buffer = await originalFile.arrayBuffer();
    } catch (readErr: any) {
      console.error('[SubmitResultPanel] Failed to read file immediately:', readErr);
      setUploadError(`Failed to read file: Please try again or use a different browser.`);
      toast.error('The selected file could not be read. Please try again or use a different browser.');
      return;
    }

    let currentName = originalFile.name;
    let currentType = originalFile.type || 'image/jpeg';
    const fileExt = (currentName ? currentName.split('.').pop() : '').toLowerCase();

    // Check if the uploaded image has an unsupported format (like WebP, HEIC, GIF)
    const isUnsupportedUploadFormat = !['image/jpeg', 'image/png', 'image/jpg'].includes(currentType);

    if (isUnsupportedUploadFormat) {
      const convertibles = ['image/webp', 'image/gif', 'image/bmp'];
      if (convertibles.includes(currentType) || ['webp', 'gif', 'bmp'].includes(fileExt)) {
        try {
          const toastId = toast.loading("Converting image to JPEG format...");
          const tempFile = new File([buffer], currentName, { type: currentType });
          const converted = await convertToJpg(tempFile);
          buffer = converted.buffer;
          currentName = converted.name;
          currentType = converted.type;
          toast.success("Converted image to JPEG format successfully!", { id: toastId });
        } catch (convErr) {
          console.error('[SubmitResultPanel] Client-side image conversion failed:', convErr);
          setUploadError('Please upload a JPG or PNG screenshot under 10MB.');
          toast.error('Please upload a JPG or PNG screenshot under 10MB.');
          return;
        }
      } else {
        setUploadError('Please upload a JPG or PNG screenshot under 10MB.');
        toast.error('Please upload a JPG or PNG screenshot under 10MB.');
        return;
      }
    }

    if (buffer.byteLength > 10 * 1024 * 1024) {
      console.warn('[SubmitResultPanel] File size exceeds 10MB limit:', buffer.byteLength);
      setUploadError('Please upload a JPG or PNG screenshot under 10MB.');
      toast.error('Please upload a JPG or PNG screenshot under 10MB.');
      return;
    }

    console.log('[SubmitResultPanel] [STEP 2] File validation passed successfully. Final File size to Upload:', buffer.byteLength);

    // Revoke previous object URL if any to clean memory
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const previewBlob = new Blob([buffer], { type: currentType });
    const generatedPreview = URL.createObjectURL(previewBlob);
    setPreviewUrl(generatedPreview);
    
    const filePlaceholder = new File([buffer], currentName, { type: currentType });
    setScreenshotFile(filePlaceholder);
    setScreenshotBuffer(buffer);
    setUploadError(null);
    setPublicUrl(null);

    await performUpload(buffer, currentName, currentType);
  };

  // Error grouping & matching
  const finalSubmitError = submitError || localError;
  const isAlreadySubmitted = (finalSubmitError || '').toLowerCase().includes('already submitted');
  const isDeadlineExpired = (finalSubmitError || '').toLowerCase().includes('deadline');
  const isScreenshotError = (finalSubmitError || '').toLowerCase().includes('screenshot') || !!uploadError;
  const hasAlreadySubmitted = !!state?.submissions?.some((s: any) => s.submitted_by === currentUserId) || isAlreadySubmitted || formDisabled;

  const handleSubmit = async () => {
    setLocalError(null);
    setSubmitError(null);
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

    const stage = match?.stage || '';
    const tournamentType = match?.tournaments?.type || '';
    const drawForbiddenStages = ['knockout', 'quarterfinal', 'semifinal', 'final', 'third_place', 'round_of_16', 'round_of_32', 'playoffs'];
    const drawForbidden = drawForbiddenStages.includes(stage) || tournamentType === 'knockout';

    if (drawForbidden && s1Val === s2Val) {
      setLocalError('Knockout tournaments do not allow equal scores (no draws).');
      return;
    }

    setShowConfirm(true);
  };

  const handleFinalConfirmSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSubmitError(null);
    setLocalError(null);

    try {
      let currentPath = publicUrl;

      // Map scores correctly based on player1 / player2
      const finalPlayer1Score = isPlayer1 ? Number(score1) : Number(score2);
      const finalPlayer2Score = isPlayer1 ? Number(score2) : Number(score1);

      // Call the centralized service to submit the result
      const resData = await matchService.submitResult(
        matchId,
        finalPlayer1Score,
        finalPlayer2Score,
        currentPath || null
      );

      // Handle the success state
      let message = "Result submitted successfully.";
      const pathVal = resData?.path;
      if (pathVal === 'A' || pathVal === 'B') {
        message = "Result submitted, waiting for opponent";
      } else if (pathVal === 'C') {
        message = "Scores conflict — admin will review";
      } else if (resData?.message) {
        message = resData.message;
      }

      toast.success(message);
      setSuccessMsg(message);
      setFormDisabled(true);
      
      // Delay to show success state before refetching/re-rendering
      setTimeout(async () => {
        await refetch();
      }, 1000);

    } catch (err: any) {
      const errMsg = err?.message || "An unexpected transmission error occurred.";
      console.error('[SubmitResultPanel] error:', err);
      toast.error(errMsg);
      setSubmitError(errMsg);

      if (err?.screenshot_required) {
        setUploadError("A screenshot of the match result is strictly required to submit.");
        setTimeout(() => {
          uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepScore = (field: 'score1' | 'score2', delta: number) => {
    if (!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted) return;
    if (field === 'score1') {
      const current = score1 === '' ? 0 : parseInt(score1, 10);
      const nextVal = Math.max(0, isNaN(current) ? 0 : current + delta);
      setScore1(String(nextVal));
    } else {
      const current = score2 === '' ? 0 : parseInt(score2, 10);
      const nextVal = Math.max(0, isNaN(current) ? 0 : current + delta);
      setScore2(String(nextVal));
    }
  };

  const isFormValid = score1 !== '' && score2 !== '';

  const formatSecondsRemaining = (secs: number) => {
    const totalSeconds = Math.max(0, Math.floor(secs));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s]
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  };

  const getSubmitButtonLabel = () => {
    if (isSubmitting) {
      return "Transmitting...";
    }
    if (hasAlreadySubmitted) {
      return "RESULT ALREADY SUBMITTED";
    }
    const countdownState = state?.countdown_state || 'not_scheduled';
    if (countdownState === 'not_scheduled') {
      return "AWAITING SCHEDULE";
    }
    if (countdownState === 'pre_match') {
      return "MATCH STARTS SOON - CANNOT SUBMIT";
    }
    if (countdownState === 'deadline_expired') {
      return "TIME'S UP - SUBMISSIONS CLOSED";
    }
    if (countdownState === 'finished') {
      return "MATCH FINISHED - SUBMISSIONS CLOSED";
    }
    if (screenshotFile && uploading) {
      return "UPLOADING EVIDENCE...";
    }
    if (screenshotFile && !publicUrl) {
      return "AWAITING SCREENSHOT UPLOAD...";
    }
    return "SUBMIT RESULT ✓";
  };

  const countdownState = state?.countdown_state || 'not_scheduled';

  // Window NOT open yet: replace the big form with ONE slim locked row (about 48px)
  if (countdownState === 'pre_match' || countdownState === 'not_scheduled') {
    return (
      <div className="h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-wider shadow-lg">
        <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
        <span>Submissions open when the match starts</span>
      </div>
    );
  }

  if (countdownState === 'deadline_expired') {
    return (
      <div className="h-12 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider shadow-lg">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Time's up — awaiting admin review</span>
      </div>
    );
  }

  if (countdownState === 'finished') {
    return (
      <div className="h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider shadow-lg">
        <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
        <span>Match complete — submissions closed</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl relative p-3.5 sm:p-4 space-y-3">
      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 text-center animate-in fade-in duration-200">
          <div className="space-y-4 max-w-xs w-full">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white uppercase italic tracking-wider">Verify Scores</h4>
              <p className="text-xs text-zinc-400">
                Confirm: You scored <span className="font-mono text-white font-black text-sm">{score1}</span>, opponent scored <span className="font-mono text-white font-black text-sm">{score2}</span>.
              </p>
              <p className="text-red-400 uppercase tracking-widest text-[9px] font-black mt-1">
                This cannot be changed.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-10 bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-700 transition-all cursor-pointer"
              >
                No, Edit
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 h-10 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
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

      {/* Active Deadline Countdown Bar */}
      {countdownState === 'active' && match_deadline && (
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold text-emerald-400 px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Submit by {(() => {
              try {
                return new Date(match_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                return 'deadline';
              }
            })()}
          </span>
          <span className="text-emerald-400 font-black">{formatSecondsRemaining(secondsRemaining)} left</span>
        </div>
      )}

      {rejectedResult && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[10px] font-semibold text-red-400">
            Previous submission rejected. Please resubmit with a clear screenshot.
          </p>
        </div>
      )}

      {/* Both scores on ONE row: [YOU/name] [ - ] 0 [ + ] - [ - ] 0 [ + ] [OPPONENT name] */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: You */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs font-black text-white italic uppercase tracking-tight truncate max-w-[65px] sm:max-w-[100px]" title={myName}>
            {myName}
          </span>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStepScore('score1', -1)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted || Number(score1) <= 0}
              className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white font-black text-sm flex items-center justify-center hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Decrease your score"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              step="1"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
              aria-label="Your score"
              className="w-9 sm:w-11 h-7 bg-zinc-900 border border-zinc-700 rounded-lg text-base sm:text-lg font-black text-center text-white focus:border-primary focus:outline-none transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => handleStepScore('score1', 1)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
              className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white font-black text-sm flex items-center justify-center hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Increase your score"
            >
              +
            </button>
          </div>
        </div>

        {/* Divider */}
        <span className="text-xs font-black text-zinc-600 px-0.5 shrink-0">-</span>

        {/* Right: Opponent */}
        <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStepScore('score2', -1)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted || Number(score2) <= 0}
              className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white font-black text-sm flex items-center justify-center hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Decrease opponent score"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              step="1"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
              aria-label="Opponent score"
              className="w-9 sm:w-11 h-7 bg-zinc-900 border border-zinc-700 rounded-lg text-base sm:text-lg font-black text-center text-white focus:border-primary focus:outline-none transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => handleStepScore('score2', 1)}
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
              className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white font-black text-sm flex items-center justify-center hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Increase opponent score"
            >
              +
            </button>
          </div>
          <span className="text-xs font-black text-white italic uppercase tracking-tight truncate max-w-[65px] sm:max-w-[100px] text-right" title={opponentName}>
            {opponentName}
          </span>
        </div>
      </div>

      {/* Screenshot Upload: compact row (~56px tall) */}
      <div ref={uploadSectionRef} className="space-y-1">
        {screenshotFile ? (
          <div className="h-14 px-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 relative">
                <img 
                  src={previewUrl || ''} 
                  alt="Proof preview" 
                  className="w-full h-full object-cover" 
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[190px]">
                  {screenshotFile.name}
                </p>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {uploading ? 'Uploading proof...' : uploadError ? 'Upload failed' : 'Proof attached'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {uploadError && !uploading && (
                <button
                  type="button"
                  onClick={() => {
                    if (screenshotBuffer && screenshotFile) {
                      performUpload(screenshotBuffer, screenshotFile.name, screenshotFile.type);
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 cursor-pointer"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setScreenshotFile(null);
                  setPublicUrl(null);
                  setUploadError(null);
                }}
                disabled={uploading || isSubmitting}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "relative h-14 px-3 bg-zinc-950 border border-dashed rounded-xl flex items-center justify-between gap-2 transition-all",
            isScreenshotError ? "border-red-500/50 bg-red-500/5" : "border-zinc-800 hover:border-primary/50",
            can_submit && !hasAlreadySubmitted && !formDisabled ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileUpload}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              disabled={!can_submit || uploading || isSubmitting || formDisabled || hasAlreadySubmitted}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className="flex items-center gap-2 min-w-0">
              <Upload className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-xs font-bold text-zinc-300 truncate">
                <span className="md:hidden">Tap to upload proof</span>
                <span className="hidden md:inline">Click or drag to upload proof</span>
              </span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded shrink-0">
              REQUIRED
            </span>
          </div>
        )}
        {uploadError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">{uploadError}</p>}
      </div>

      {/* Messages */}
      {hasAlreadySubmitted && !successMsg && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">
            Results logged. Double submissions are locked.
          </p>
        </div>
      )}

      {finalSubmitError && !isAlreadySubmitted && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-wider text-red-500">
            {isDeadlineExpired ? "Submission deadline has passed." : finalSubmitError}
          </p>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
            {successMsg}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        disabled={!can_submit || !isFormValid || isSubmitting || uploading || formDisabled || hasAlreadySubmitted || (Boolean(screenshotFile) && !publicUrl)}
        className={cn(
          "w-full h-12 flex items-center justify-center space-x-2 rounded-xl font-black uppercase italic tracking-wider transition-all text-xs cursor-pointer",
          can_submit && isFormValid && !hasAlreadySubmitted && !formDisabled && !uploading && (!screenshotFile || Boolean(publicUrl))
            ? "bg-primary text-black hover:bg-white active:scale-[0.99] shadow-lg shadow-primary/20"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transmitting...</span>
          </>
        ) : (
          <>
            <span>{getSubmitButtonLabel()}</span>
            {can_submit && !hasAlreadySubmitted && <Check className="w-4 h-4" />}
          </>
        )}
      </button>
    </div>
  );
}
