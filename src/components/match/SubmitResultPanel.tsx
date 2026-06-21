import React, { useState, useEffect } from 'react';
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

interface SubmitResultPanelProps {
  matchId: string;
  currentUserId: string;
  playerName?: string;
  match?: any;
}

export function SubmitResultPanel({ matchId, currentUserId, playerName, match }: SubmitResultPanelProps) {
  const { state, isLoading, error, refetch, serverTimeOffsetMs } = useMatchVerificationState(matchId);

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
      <div className="submission-locked-card bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl relative flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-2">
          <CheckCircle2 className="text-emerald-500 w-8 h-8" />
        </div>
        <p className="font-black text-lg text-white uppercase italic tracking-wider leading-none">You've already submitted</p>
        <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Status: {myResult.status.replace('_', ' ')}</p>
        <p className="text-sm text-slate-400 max-w-md">
          You submitted {myResult.player1_score} – {myResult.player2_score}.
          {myResult.status === 'disputed' 
            ? ' Your opponent submitted a different score — an admin will review this shortly.'
            : myResult.status === 'verified'
            ? ' This result has been confirmed.'
            : ' Waiting for your opponent to confirm.'}
        </p>
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

    const isKnockout = match?.tournaments?.type === 'knockout';
    if (isKnockout && s1Val === s2Val) {
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
    } finally {
      setIsSubmitting(false);
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
          <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center text-[10px] sm:text-xs">
            <Trophy className="w-4 h-4 mr-2 text-primary shrink-0" />
            Play your Match and submit results here
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            {myName} vs {opponentName}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* State Status Card Mapping */}
        {(() => {
          const countdownState = state?.countdown_state || 'not_scheduled';
          switch (countdownState) {
            case 'not_scheduled':
              return (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center space-x-2 text-slate-400 font-mono text-xs font-black uppercase italic tracking-wider">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Awaiting schedule</span>
                </div>
              );
            case 'pre_match':
              return (
                <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl flex items-center justify-center space-x-2 text-sky-400 font-mono text-xs font-black uppercase italic tracking-wider">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>Match starts in {preMatchCountdown.formatted}</span>
                </div>
              );
            case 'active': {
              let deadlineLabel = 'N/A';
              if (match_deadline) {
                try {
                  const deadline = new Date(match_deadline);
                  deadlineLabel = deadline.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                } catch (e) {
                  console.error('Error parsing match_deadline:', e);
                }
              }
              return (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-center space-x-2 text-emerald-400 animate-pulse font-mono text-xs font-black uppercase italic tracking-wider">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Submit by {deadlineLabel}  •  {formatSecondsRemaining(secondsRemaining)} left</span>
                </div>
              );
            }
            case 'deadline_expired':
              return (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center justify-center space-x-2 text-rose-400 font-mono text-xs font-black uppercase italic tracking-wider">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>Time's up — awaiting admin review</span>
                </div>
              );
            case 'finished':
              return (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center space-x-2 text-slate-500 font-mono text-xs font-black uppercase italic tracking-wider">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Match complete</span>
                </div>
              );
            default:
              return null;
          }
        })()}

        {rejectedResult && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-400">
              Your previous submission was rejected. Please resubmit with a clear screenshot.
            </p>
          </div>
        )}

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
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
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
              disabled={!can_submit || isSubmitting || formDisabled || hasAlreadySubmitted}
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
          
          {screenshotFile ? (
            <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 aspect-video bg-slate-950">
              <img 
                src={previewUrl || ''} 
                alt="Match proof preview" 
                className="w-full h-full object-cover" 
              />
              {uploading && (
                <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center space-y-2 z-10 transition-all">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Uploading Encrypted Intel...</span>
                </div>
              )}
              {uploadError && !uploading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-4 text-center z-10 space-y-3">
                  <AlertCircle className="w-8 h-8 text-red-500 animate-bounce" />
                  <p className="text-red-400 font-bold uppercase tracking-wider text-[10px] px-2">{uploadError}</p>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (screenshotBuffer && screenshotFile) {
                          performUpload(screenshotBuffer, screenshotFile.name, screenshotFile.type);
                        }
                      }}
                      className="px-3 py-1.5 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                    >
                      Retry Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                        }
                        setPreviewUrl(null);
                        setScreenshotFile(null);
                        setPublicUrl(null);
                        setUploadError(null);
                      }}
                      className="px-3 py-1.5 bg-red-600 border border-red-700 text-white hover:bg-red-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {!uploading && !uploadError && (
                <button 
                  onClick={() => { 
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null);
                    setScreenshotFile(null); 
                    setPublicUrl(null);
                    setUploadError(null);
                  }}
                  className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  disabled={!can_submit || formDisabled || isSubmitting || hasAlreadySubmitted}
                >
                  <div className="bg-red-600 p-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">Remove</div>
                </button>
              )}
            </div>
          ) : (
            <div className={cn(
              "relative border-2 border-dashed rounded-2xl p-12 transition-all group",
              isScreenshotError ? "border-red-500/50 bg-red-500/5" : "border-slate-800",
              can_submit && !hasAlreadySubmitted && !formDisabled ? "hover:border-primary/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
            )}>
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                onClick={(e) => {
                  console.log('[SubmitResultPanel] File input element clicked, resetting value to allow repeating same file selection.');
                  (e.target as HTMLInputElement).value = '';
                }}
                disabled={!can_submit || uploading || isSubmitting || formDisabled || hasAlreadySubmitted}
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

        {/* Inform user they already submitted */}
        {hasAlreadySubmitted && !successMsg && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3">
            <Check className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              Your results are successfully logged. Double submissions are locked.
            </p>
          </div>
        )}

        {/* Submission Error Message Displays */}
        {finalSubmitError && !isAlreadySubmitted && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
               {isDeadlineExpired ? "Submission deadline has passed." : finalSubmitError}
            </p>
          </div>
        )}

        {/* Submission Success Message Display */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-3">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              {successMsg}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={!can_submit || !isFormValid || isSubmitting || uploading || formDisabled || hasAlreadySubmitted || (screenshotFile !== null && (!publicUrl || uploading))}
          className={cn(
            "w-full h-16 flex items-center justify-center space-x-3 rounded-2xl font-black uppercase italic tracking-widest transition-all cursor-pointer",
            can_submit && isFormValid && !hasAlreadySubmitted && !formDisabled && !(screenshotFile !== null && (!publicUrl || uploading))
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
              {can_submit && !hasAlreadySubmitted && <Check className="w-5 h-5" />}
            </>
          )}
        </button>

        {state?.countdown_state === 'pre_match' && (
          <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            Submissions window is not yet active (Match starts soon)
          </p>
        )}
        {state?.countdown_state === 'deadline_expired' && (
          <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            The deadline for submitting results has expired.
          </p>
        )}
        {state?.countdown_state === 'finished' && (
          <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            The match has been completed or expired.
          </p>
        )}
      </div>
    </div>
  );
}
