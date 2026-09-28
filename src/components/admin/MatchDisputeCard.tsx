import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  RefreshCw, 
  Eye, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  ExternalLink,
  ImageOff
} from 'lucide-react';
import { cn, getPublicIdentity, getSignedUrl } from '../../lib/utils';
import { matchService } from '../../services/matchService';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import StorageImage from '../common/StorageImage';

interface MatchDisputeCardProps {
  match: any;
  onResolved: () => void;
  adminId: string;
}

export const MatchDisputeCard: React.FC<MatchDisputeCardProps> = ({ match, onResolved, adminId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState(
    match.scheduled_at 
      ? new Date(new Date(match.scheduled_at).getTime() - new Date(match.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) 
      : ''
  );
  const [adminNotes, setAdminNotes] = useState('');
  const [overrideScore1, setOverrideScore1] = useState<string>('');
  const [overrideScore2, setOverrideScore2] = useState<string>('');

  const [internalSubmissions, setInternalSubmissions] = useState<any[]>([]);
  const [isFetchingSubmissions, setIsFetchingSubmissions] = useState(false);

  const submissions = match.submissions && match.submissions.length > 0 ? match.submissions : internalSubmissions;
  const requiredAction = match.required_action;

  const player1Id = typeof match?.player1 === 'object' ? (match?.player1?.id || match?.player1) : match?.player1;
  const player2Id = typeof match?.player2 === 'object' ? (match?.player2?.id || match?.player2) : match?.player2;
  const isMyMatch = !!(adminId && (adminId === player1Id || adminId === player2Id));
  const isAlreadyFinalised = match.verification_status === 'completed' || match.verification_status === 'verified' || match.status === 'completed' || match.status === 'verified';

  // State for challenge resolution
  const [isResolvingChallenge, setIsResolvingChallenge] = useState(false);
  const [challengeResolvedMessage, setChallengeResolvedMessage] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeViewerImage, setChallengeViewerImage] = useState<string | null>(null);

  const [challengeScore1, setChallengeScore1] = useState(() => {
    if (match.submissions && match.submissions.length === 1) {
      return match.submissions[0].player1_score ?? 0;
    }
    return 0;
  });
  const [challengeScore2, setChallengeScore2] = useState(() => {
    if (match.submissions && match.submissions.length === 1) {
      return match.submissions[0].player2_score ?? 0;
    }
    return 0;
  });

  const [selectedWinner, setSelectedWinner] = useState<string | 'draw' | null>(null);
  const [challengeAdminNotes, setChallengeAdminNotes] = useState('Resolved by admin moderation team');

  const handleResolveChallenge = async () => {
    if (!selectedWinner) return;
    setIsResolvingChallenge(true);
    setChallengeError(null);

    const winnerId = selectedWinner === 'draw' 
      ? null 
      : (selectedWinner === 'p1' ? player1Id : player2Id);

    try {
      const { data, error } = await (supabase as any).rpc(
        'fn_admin_resolve_challenge_match',
        {
          p_match_id: match.match_id || match.id,
          p_winner_id: winnerId,
          p_score1: challengeScore1,
          p_score2: challengeScore2,
          p_notes: challengeAdminNotes
        }
      );

      if (error) throw error;

      if (data && (data as any).success === false) {
        throw new Error((data as any).message || 'Resolution RPC returned unsuccessful status.');
      }

      setChallengeResolvedMessage('✅ Match Resolved Successfully!');
      setTimeout(() => {
        onResolved();
      }, 2000);
    } catch (err: any) {
      console.error('[ChallengeResolution] RPC Failed:', err);
      setChallengeError(err.message || 'Failed to execute challenge resolution.');
    } finally {
      setIsResolvingChallenge(false);
    }
  };

  if (match.is_challenge) {
    const p1Name = getPublicIdentity(match.player1_username || match.player1);
    const p2Name = getPublicIdentity(match.player2_username || match.player2);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white uppercase italic tracking-widest leading-tight">
                  1v1 Challenge Match
                </h4>
                {match.verification_status === 'disputed' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                    🔴 Score Dispute
                  </span>
                )}
                {match.verification_status === 'pending' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    🟡 No Response
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                  {match.verification_status || 'Under Review'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  {submissions.length || 0} Submissions
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
            Challenge Dispute
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-8">
          {isMyMatch && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>You cannot resolve or override disputes for your own match. Please request another administrator to audit this conflict.</span>
            </div>
          )}

          <div className="flex items-center justify-center space-x-8 py-4 relative">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 1</span>
              <span className="text-sm font-black text-white uppercase tracking-tight">{p1Name}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-black italic text-slate-700">VS</div>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 2</span>
              <span className="text-sm font-black text-white uppercase tracking-tight">{p2Name}</span>
            </div>
          </div>

          {/* Submitted Result Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submissions.map((sub: any, idx: number) => (
              <div key={sub.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intel #{idx + 1}</span>
                  <span className="text-xs font-black text-white uppercase tracking-widest">
                    Submitted by {getPublicIdentity(sub.username || sub.profiles || sub.submitter || sub)}
                  </span>
                </div>
                <div className="flex items-center justify-center py-6 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <span className="text-4xl font-black italic text-white">
                    {(sub.player1_score ?? sub.score1) ?? 0} – {(sub.player2_score ?? sub.score2) ?? 0}
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-600">Verification Image</span>
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group relative">
                    {sub.screenshot_url ? (
                      <>
                        <StorageImage 
                          bucket="result-screenshots" 
                          path={sub.screenshot_url} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                          alt={`Match result screenshot submitted by ${sub.username}`} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/60">
                          <button 
                            onClick={async () => {
                              let url = sub.screenshot_url;
                              if (!url.startsWith('http')) {
                                url = await getSignedUrl('result-screenshots', sub.screenshot_url);
                              }
                              setChallengeViewerImage(url);
                            }}
                            className="p-3 bg-white text-black rounded-full shadow-xl"
                            aria-label={`View full size screenshot from ${sub.username}`}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                        <ImageOff className="w-6 h-6 text-slate-600 mb-1" />
                        <span className="text-[8px] font-bold text-slate-600 uppercase">No Screenshot</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution Form (inline, below the submitted result) */}
          <div className="bg-black/20 border border-white/5 rounded-3xl p-6 space-y-6">
            <h4 className="text-sm font-black text-white uppercase italic tracking-widest">
              ⚖️ Challenge Resolution Panel
            </h4>

            {/* Score inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {p1Name}'s Final Score
                </label>
                <input 
                  type="number" 
                  value={challengeScore1}
                  onChange={(e) => setChallengeScore1(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-2xl font-black italic outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {p2Name}'s Final Score
                </label>
                <input 
                  type="number" 
                  value={challengeScore2}
                  onChange={(e) => setChallengeScore2(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-2xl font-black italic outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Winner selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Winner Selector <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedWinner('p1')}
                  className={cn(
                    "py-3 rounded-xl font-bold uppercase text-xs border transition-all",
                    selectedWinner === 'p1' 
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  🏆 {p1Name} Wins
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWinner('p2')}
                  className={cn(
                    "py-3 rounded-xl font-bold uppercase text-xs border transition-all",
                    selectedWinner === 'p2' 
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  🏆 {p2Name} Wins
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWinner('draw')}
                  className={cn(
                    "py-3 rounded-xl font-bold uppercase text-xs border transition-all",
                    selectedWinner === 'draw' 
                      ? "bg-slate-600 text-white border-slate-600 shadow-lg" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  🤝 Draw
                </button>
              </div>
            </div>

            {/* Admin notes */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Admin Notes (visible to both players)
              </label>
              <textarea
                value={challengeAdminNotes}
                onChange={(e) => setChallengeAdminNotes(e.target.value)}
                placeholder="Admin decision explanation..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:border-primary outline-none min-h-[80px]"
              />
            </div>

            {/* Resolve Button and Status Messages */}
            <div className="space-y-3 pt-2">
              {challengeError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{challengeError}</span>
                </div>
              )}

              {challengeResolvedMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{challengeResolvedMessage}</span>
                </div>
              )}

              <button
                type="button"
                disabled={!selectedWinner || isResolvingChallenge || !!challengeResolvedMessage || isMyMatch}
                onClick={handleResolveChallenge}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center justify-center space-x-2 text-sm",
                  (!selectedWinner || isResolvingChallenge || !!challengeResolvedMessage || isMyMatch)
                    ? "bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed"
                    : "bg-primary text-slate-900 hover:scale-[1.02]"
                )}
              >
                {isResolvingChallenge ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resolving Challenge Match...</span>
                  </>
                ) : challengeResolvedMessage ? (
                  <span>✅ Resolved</span>
                ) : (
                  <span>Resolve Challenge Match</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Challenge Image Lightbox */}
        {challengeViewerImage && (
          <div 
            onClick={() => setChallengeViewerImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
          >
            <div className="max-w-4xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
              <img 
                src={challengeViewerImage} 
                alt="Full Evidence Screenshot" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10"
              />
              <button 
                onClick={() => setChallengeViewerImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  React.useEffect(() => {
    // If we have submissions in match object or match is already completed, don't fetch
    if ((match.submissions && match.submissions.length > 0) || match.verification_status === 'completed') {
      return;
    }

    const fetchSubmissions = async () => {
      setIsFetchingSubmissions(true);
      try {
        const { data, error } = await supabase
          .from('match_results')
          .select(`
            *,
            submitter:profiles!submitted_by(id, username, avatar_url)
          `)
          .eq('match_id', match.match_id || match.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          const mapped = (data as any[]).map(sub => ({
            ...sub,
            username: (sub as any).submitter?.username || 'Unknown',
            avatar_url: (sub as any).submitter?.avatar_url,
            // Ensure compatibility with the UI score names
            score1: sub.player1_score !== undefined ? sub.player1_score : sub.score1,
            score2: sub.player2_score !== undefined ? sub.player2_score : sub.score2
          }));
          setInternalSubmissions(mapped);
        }
      } catch (err) {
        console.error('[MatchDisputeCard] Submissions fetch error:', err);
      } finally {
        setIsFetchingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [match.match_id, match.id, match.submissions, match.verification_status]);

  const [cardError, setCardError] = useState<string | null>(null);
  const [overrideWinner, setOverrideWinner] = useState<string | null>(null);
  const [showWinnerPickerInOverride, setShowWinnerPickerInOverride] = useState(false);

  const handleAction = async (actionType: string, resultId?: string) => {
    setLoadingAction(actionType);
    setCardError(null);
    const targetMatchId = match.match_id || match.id;
    console.log(`[MatchDisputeCard] Action Request: ${actionType}`, { 
      resultId, 
      matchId: targetMatchId, 
      requiredAction: match.required_action,
      submissionCount: submissions.length 
    });
    
    if (!targetMatchId) {
      console.error('[MatchDisputeCard] Critical Error: Match object is missing match_id and id', match);
      setCardError('Internal Reference Error: This match data is malformed and missing its unique identifier.');
      setLoadingAction(null);
      return;
    }

    if (isMyMatch) {
      setCardError("Unauthorized: Admins cannot resolve disputes for their own matches.");
      setLoadingAction(null);
      return;
    }

    if (isAlreadyFinalised) {
      setCardError("This match is already finalised.");
      setLoadingAction(null);
      return;
    }

    try {
      if (actionType === 'reschedule_modal') {
        const initialDate = match.scheduled_at 
          ? new Date(new Date(match.scheduled_at).getTime() - new Date(match.scheduled_at).getTimezoneOffset() * 60000)
          : new Date();
        setRescheduleTime(initialDate.toISOString().slice(0, 16));
        setShowRescheduleModal(true);
        setLoadingAction(null);
        return;
      }

      const payload: any = {
        adminId,
        matchId: targetMatchId,
        action: actionType === 'approve' ? 'approve_submission' : actionType,
        adminNotes: adminNotes || `Admin action: ${actionType}`
      };

      if (actionType === 'approve' || actionType === 'approve_submission') {
        payload.winningSubId = resultId || (submissions[0]?.id);
        payload.action = 'approve_submission';
      }

      await matchService.resolveDispute(payload);
      toast.success('Match dispute resolved successfully!');
      onResolved();
    } catch (err: any) {
      console.error('[MatchDisputeCard] Action failure:', err);
      setCardError(err.message || 'Failed to execute dispute resolution action.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOverrideSubmit = async () => {
    setLoadingAction('override');
    setCardError(null);
    const targetMatchId = match.match_id || match.id;
    if (isMyMatch) {
      setCardError("Unauthorized: Admins cannot resolve disputes for their own matches.");
      setLoadingAction(null);
      return;
    }
    if (isAlreadyFinalised) {
      setCardError("This match is already finalised.");
      setLoadingAction(null);
      return;
    }
    try {
      await matchService.resolveDispute({
        adminId,
        matchId: targetMatchId,
        action: 'score_override',
        overrideScore1: parseInt(overrideScore1) || 0,
        overrideScore2: parseInt(overrideScore2) || 0,
        winnerId: overrideWinner || undefined,
        adminNotes: adminNotes || 'Manual score override by admin',
      });
      setShowOverrideModal(false);
      toast.success('Score override applied!');
      onResolved();
    } catch (err: any) {
      console.error('[MatchDisputeCard] Override failure:', err);
      if (err.message && (err.message.includes('draw') || err.message.includes('winner') || err.message.includes('tiebreak'))) {
        setCardError('Draws are forbidden for this tournament stage. Please select a winner.');
        setShowWinnerPickerInOverride(true);
      } else {
        setCardError(err.message || 'Manual score override failed.');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    setLoadingAction('reschedule_action');
    setCardError(null);
    const targetMatchId = match.match_id || match.id;
    if (isMyMatch) {
      setCardError("Unauthorized: Admins cannot resolve disputes for their own matches.");
      setLoadingAction(null);
      return;
    }
    if (isAlreadyFinalised) {
      setCardError("This match is already finalised.");
      setLoadingAction(null);
      return;
    }
    try {
      if (!rescheduleTime) {
        throw new Error('Please select a valid scheduled timestamp.');
      }

      await matchService.resolveDispute({
        adminId,
        matchId: targetMatchId,
        action: 'reschedule',
        adminNotes: adminNotes || `Rescheduled to ${rescheduleTime}`
      });

      setShowRescheduleModal(false);
      toast.success('Match rescheduled!');
      onResolved();
    } catch (err: any) {
      console.error('[MatchDisputeCard] Reschedule failure:', err);
      setCardError(err.message || 'Reschedule failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  console.log(`[MatchDisputeCard:${match.match_id}] Render State:`, { 
    requiredAction: match.required_action, 
    status: match.verification_status,
    submissions: submissions.length 
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase italic tracking-widest leading-tight">
              {match.tournament_name || 'Tournament Match'} • Round {match.round || '?'}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                match.verification_status === 'disputed' ? "bg-red-500/10 text-red-500" : 
                match.verification_status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                "bg-orange-500/10 text-orange-500"
              )}>
                {match.verification_status || 'Under Review'}
              </span>
              {match.verification_status !== 'completed' && (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  {submissions.length || match.submission_count || 0} Submissions
                </span>
              )}
            </div>
          </div>
        </div>
        
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse match details" : "Expand match details for examination"}
            className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all flex items-center space-x-2"
          >
          <span className="text-[10px] font-black uppercase tracking-widest">{isExpanded ? 'Collapse' : match.verification_status === 'completed' ? 'View Intel' : 'Examine Intel'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {cardError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-wide flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{cardError}</span>
          </div>
        )}

        <div className="flex items-center justify-center space-x-8 py-4 relative">
          <div className="text-center group">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mb-3 mx-auto">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 1</span>
            <span className="text-sm font-black text-white uppercase tracking-tight">{getPublicIdentity(match.player1_username || match.player1)}</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-2xl font-black italic text-slate-700">VS</div>
            {(match.verification_status === 'completed' || match.score1 !== null) && (
              <div className="mt-2 text-2xl font-black text-primary italic tracking-tight">
                {match.score1 ?? 0} – {match.score2 ?? 0}
              </div>
            )}
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mb-3 mx-auto">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 2</span>
            <span className="text-sm font-black text-white uppercase tracking-tight">{getPublicIdentity(match.player2_username || match.player2)}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            {/* Submissions Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.length > 0 ? submissions.map((sub: any, idx: number) => (
                <div key={sub.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intel #{idx + 1}</span>
                    <span className="text-[10px] font-bold text-primary uppercase">{getPublicIdentity(sub.profiles || sub.submitter || sub)}</span>
                  </div>
                  <div className="flex items-center justify-center py-6 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <span className="text-4xl font-black italic text-white">
                      {(sub.player1_score ?? sub.score1) ?? 0} – {(sub.player2_score ?? sub.score2) ?? 0}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-600">Verification Image</span>
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group relative">
                      <StorageImage 
                        bucket="result-screenshots" 
                        path={sub.screenshot_url} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        alt={`Match result screenshot submitted by ${sub.username}`} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/60">
                        <button 
                          className="p-3 bg-white text-black rounded-full shadow-xl"
                          aria-label={`View full size screenshot from ${sub.username}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Approve Specific Button */}
                  {requiredAction === 'pick_winner_or_override' && !isAlreadyFinalised && !isMyMatch && (
                    <button 
                      onClick={() => handleAction('approve', sub.id)}
                      disabled={!!loadingAction}
                      aria-label={`Approve score for ${sub.username}`}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {loadingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{loadingAction === 'approve' ? 'Processing...' : 'Approve This Score'}</span>
                    </button>
                  )}
                </div>
              )) : isFetchingSubmissions ? (
                <div className="col-span-2 p-12 text-center bg-slate-950 border border-slate-800 rounded-3xl">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Searching signal archives...</span>
                </div>
              ) : match.verification_status !== 'completed' ? (
                <div className="col-span-2 p-12 text-center bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl">
                  <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">No active signal transmissions found</span>
                </div>
              ) : (
                <div className="col-span-2 p-12 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">Operation Finalized</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">The conflict has been resolved by general consensus or administrative decision.</p>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {match.verification_status === 'completed' ? (
              match.admin_notes && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderator Logs</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-400 italic">
                    {match.admin_notes}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderator Logs (Visibility: Internal)</label>
                <textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter justification for resolution protocol..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-primary focus:ring-0 transition-all h-24 resize-none outline-none focus:border-primary/50"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Actions */}
      {!isAlreadyFinalised && (
        <div className="pt-6 border-t border-slate-800 space-y-4">
          {isMyMatch ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>You cannot resolve or override disputes for your own match. Please request another administrator to audit this conflict.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {requiredAction === 'pick_winner_or_override' || match.verification_status === 'disputed' || match.verification_status === 'abandoned' ? (
                <>
                  <button 
                    onClick={() => setShowOverrideModal(true)}
                    disabled={!!loadingAction}
                    className="flex-1 min-w-[110px] py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center justify-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Override</span>
                  </button>
                  <button 
                    onClick={() => handleAction('reschedule')}
                    disabled={!!loadingAction}
                    className="flex-1 min-w-[110px] py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reschedule</span>
                  </button>
                  <button 
                    onClick={() => handleAction('no_show_p1')}
                    disabled={!!loadingAction}
                    className="flex-1 min-w-[110px] py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingAction === 'no_show_p1' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span>Forfeit P1</span>
                  </button>
                  <button 
                    onClick={() => handleAction('no_show_p2')}
                    disabled={!!loadingAction}
                    className="flex-1 min-w-[110px] py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingAction === 'no_show_p2' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span>Forfeit P2</span>
                  </button>
                  <button 
                    onClick={() => handleAction('cancel')}
                    disabled={!!loadingAction}
                    className="flex-1 min-w-[110px] py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingAction === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span>Cancel</span>
                  </button>
                </>
              ) : (requiredAction === 'approve_or_reject_single_submission' || match.verification_status === 'awaiting_admin_review' || match.verification_status === 'single_submission' || (submissions.length === 1 && match.verification_status === 'disputed')) ? (
                <>
                  <button 
                    onClick={() => {
                      if (submissions[0]) {
                        handleAction('approve', submissions[0].id);
                      } else {
                        console.error('[MatchDisputeCard] Approval failed: submissions array is empty', match);
                        alert('Configuration Error: Unable to approve because no submission data was found for this match. This may be a synchronization issue.');
                      }
                    }}
                    disabled={!!loadingAction}
                    className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{loadingAction === 'approve' ? 'Processing...' : 'Approve One'}</span>
                  </button>
                  <button 
                    onClick={() => handleAction('no_show_p2')} // Assuming P2 is the one who didn't submit
                    disabled={!!loadingAction}
                    className="py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingAction === 'no_show_p2' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span>No-Show P2</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleAction('cancel')}
                  disabled={!!loadingAction}
                  className="col-span-2 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loadingAction === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Eradicate Match</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
            <h5 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6">Manual <span className="text-primary">Echelon Override</span></h5>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final P1 Score</label>
                <input 
                  type="number"
                  value={overrideScore1}
                  onChange={(e) => setOverrideScore1(e.target.value)}
                  className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-2xl font-black text-center text-white focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final P2 Score</label>
                <input 
                  type="number"
                  value={overrideScore2}
                  onChange={(e) => setOverrideScore2(e.target.value)}
                  className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-2xl font-black text-center text-white focus:border-primary outline-none"
                />
              </div>
            </div>

            {(showWinnerPickerInOverride || (overrideScore1 !== '' && overrideScore1 === overrideScore2)) && (
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-400">Match Winner (Required for Knockout/Tiebreak)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOverrideWinner(player1Id)}
                    className={cn(
                      "py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all border",
                      overrideWinner === player1Id
                        ? "bg-primary text-black border-primary font-black"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {getPublicIdentity(match.player1_username || match.player1)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideWinner(player2Id)}
                    className={cn(
                      "py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all border",
                      overrideWinner === player2Id
                        ? "bg-primary text-black border-primary font-black"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {getPublicIdentity(match.player2_username || match.player2)}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleOverrideSubmit}
                disabled={!overrideScore1 || !overrideScore2 || loadingAction === 'override'}
                className="w-full py-5 bg-primary text-black font-black uppercase italic tracking-widest rounded-2xl hover:bg-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center disabled:opacity-50"
              >
                {loadingAction === 'override' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Confirm Override'}
              </button>
              <button 
                onClick={() => setShowOverrideModal(false)}
                className="w-full py-5 bg-slate-800 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
              >
                Abort Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h5 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6">Tactical <span className="text-primary">Match Reschedule</span></h5>
            
            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Scheduled Time</label>
                <input 
                  type="datetime-local"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-bold tracking-tight focus:border-primary focus:ring-0 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRescheduleSubmit}
                disabled={!rescheduleTime || loadingAction === 'reschedule_action'}
                className="w-full py-5 bg-primary text-black font-black uppercase italic tracking-widest rounded-2xl hover:bg-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center disabled:opacity-50"
              >
                {loadingAction === 'reschedule_action' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Confirm New Time'}
              </button>
              <button 
                onClick={() => setShowRescheduleModal(false)}
                className="w-full py-5 bg-slate-800 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
              >
                Abort Protocol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
