import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { useAuth } from '../contexts/AuthContext';
import { 
  Swords, Shield, Timer, MessageSquare, PlusCircle, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, Upload, Camera, Award, Copy,
  ArrowLeft, Users, Zap, Check, ShieldAlert, X
} from 'lucide-react';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from '../services/storageService';

export default function ChallengeDetails() {
  const { id: challengeId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Submit Result Modal State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [player1Score, setPlayer1Score] = useState<number | ''>('');
  const [player2Score, setPlayer2Score] = useState<number | ''>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNoShowReport, setIsNoShowReport] = useState(false);

  // Fetch Challenge Details
  const fetchDetail = async (showLoading = true) => {
    if (!challengeId) return;
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await (supabase as any)
        .from('v_challenge_detail')
        .select('*')
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (!data) {
        setError('Challenge not found or you do not have permission to view it.');
        return;
      }

      setDetail(data);
    } catch (err: any) {
      console.error('[ChallengeDetails] Error fetching challenge details:', err);
      setError(err.message || 'Failed to load challenge details.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    // Subscribe to match status changes
    const matchChannel = supabase
      .channel(`challenge-detail-${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenge_matches',
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          fetchDetail(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: `id=eq.${challengeId}`,
        },
        () => {
          fetchDetail(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [challengeId]);

  // Countdown Timer Effect
  useEffect(() => {
    if (!detail?.auto_cancel_at || detail.challenge_status !== 'matched' && detail.challenge_status !== 'in_progress') {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const autoCancelDate = new Date(detail.auto_cancel_at).getTime();
      const now = new Date().getTime();
      const difference = autoCancelDate - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        fetchDetail(false); // Refetch to show cancelled state
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const pad = (num: number) => String(num).padStart(2, '0');
      setTimeLeft(`⏱ ${pad(hours)}:${pad(minutes)}:${pad(seconds)} remaining`);
    }, 1000);

    return () => clearInterval(interval);
  }, [detail]);

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/challenge-lobby`;
    navigator.clipboard.writeText(inviteUrl);
    alert('Invite link copied to clipboard! Share it with your opponent.');
  };

  const handleCancelChallenge = async () => {
    if (!window.confirm('Are you sure you want to cancel this challenge? You will be fully refunded if it was paid.')) return;
    try {
      setRefetching(true);
      const { error: cancelErr } = await (supabase as any).rpc('fn_challenge_cancel_and_refund', {
        p_challenge_id: challengeId,
        p_reason: 'Cancelled by creator'
      });

      if (cancelErr) throw cancelErr;
      await fetchDetail(true);
    } catch (err: any) {
      console.error('[ChallengeDetails] Cancel error:', err);
      alert(err.message || 'Could not cancel the challenge.');
    } finally {
      setRefetching(false);
    }
  };

  // Result submission file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenSubmitModal = (noShow = false) => {
    setSubmitError(null);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setIsNoShowReport(noShow);

    if (noShow) {
      // Prefill with 3-0 or 0-3 depending on if you are player1 or player2
      const isP1 = detail.player1_id === user?.id;
      setPlayer1Score(isP1 ? 3 : 0);
      setPlayer2Score(isP1 ? 0 : 3);
    } else {
      setPlayer1Score('');
      setPlayer2Score('');
    }
    setIsSubmitOpen(true);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !detail?.match_id) return;

    if (player1Score === '' || player2Score === '') {
      setSubmitError('Please enter both scores.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let uploadedUrl = null;

      if (screenshotFile) {
        setUploading(true);
        // Upload screenshot using storageService
        uploadedUrl = await storageService.uploadScreenshot(screenshotFile, detail.match_id, user.id);
        setUploading(false);
      }

      const { error: submitErr } = await (supabase as any)
        .from('challenge_match_results')
        .insert({
          challenge_match_id: detail.match_id,
          submitted_by: user.id,
          player1_score: Number(player1Score),
          player2_score: Number(player2Score),
          screenshot_url: uploadedUrl || null,
        });

      if (submitErr) throw submitErr;

      setIsSubmitOpen(false);
      await fetchDetail(true);
    } catch (err: any) {
      console.error('[ChallengeDetails] Result submit failed:', err);
      setSubmitError(err.message || 'Failed to submit match results.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleRematch = async () => {
    if (!user || !detail) return;
    try {
      setRefetching(true);
      // Step 1: Create rematch challenge
      const { data: rematch, error: createErr } = await (supabase as any)
        .from('challenges')
        .insert({
          created_by: user.id,
          entry_type: detail.entry_type,
          entry_fee: detail.entry_fee,
          currency: detail.currency,
          rematch_of_challenge_id: detail.challenge_id,
        })
        .select('id')
        .single();

      if (createErr) throw createErr;
      if (!rematch) throw new Error('Failed to create rematch challenge.');

      // Handle debit if paid
      let walletTxId = null;
      if (detail.entry_type === 'paid' && detail.entry_fee > 0) {
        const { data: wallet } = await (supabase as any)
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!wallet || wallet.balance < detail.entry_fee) {
          throw new Error('Insufficient balance to pay for rematch entry fee.');
        }

        const { error: deductErr } = await (supabase as any)
          .from('wallets')
          .update({ balance: wallet.balance - detail.entry_fee })
          .eq('user_id', user.id);

        if (deductErr) throw deductErr;

        const { data: tx, error: txErr } = await (supabase as any)
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: -detail.entry_fee,
            type: 'debit',
            description: `Rematch Challenge Entry Fee`
          })
          .select('id')
          .single();

        if (txErr) throw txErr;
        if (!tx) throw new Error('Failed to generate wallet transaction.');
        walletTxId = tx.id;
      }

      // Step 2: Register as player 1
      const { error: regErr } = await (supabase as any)
        .from('challenge_registrations')
        .insert({
          challenge_id: rematch.id,
          user_id: user.id,
          payment_status: 'paid',
          entry_fee_snapshot: detail.entry_fee,
          currency_snapshot: detail.currency,
          wallet_transaction_id: walletTxId || null,
        });

      if (regErr) throw regErr;

      // Step 3: Save badge selection (use your own current badge)
      const isP1 = detail.player1_id === user.id;
      const myBadgeId = isP1 ? detail.player1_badge_id : detail.player2_badge_id;

      const { error: badgeErr } = await (supabase as any)
        .from('challenge_badge_selections')
        .insert({
          challenge_id: rematch.id,
          user_id: user.id,
          badge_id: myBadgeId,
        });

      if (badgeErr) throw badgeErr;

      // Success - Navigate to new rematch screen
      navigate(`/challenges/${rematch.id}`);
    } catch (err: any) {
      console.error('[ChallengeDetails] Rematch failed:', err);
      alert(err.message || 'Failed to start a rematch.');
    } finally {
      setRefetching(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">Syncing Challenge Arena...</p>
        </div>
      </Shell>
    );
  }

  if (error || !detail) {
    return (
      <Shell>
        <div className="text-center py-20 bg-zinc-950 rounded-3xl border border-zinc-800 space-y-4 max-w-xl mx-auto">
          <Shield className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-lg font-black text-white uppercase italic">{error || 'Challenge Not Found'}</p>
          <button
            onClick={() => navigate('/challenge-lobby')}
            className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Back to Challenge Lobby
          </button>
        </div>
      </Shell>
    );
  }

  const isCreator = detail.created_by === user?.id;
  const isP1 = detail.player1_id === user?.id;
  const isP2 = detail.player2_id === user?.id;
  const isParticipant = isP1 || isP2;

  return (
    <Shell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/challenge-lobby')}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Challenge Lobby
        </button>

        {/* Status Alert Banner */}
        {detail.challenge_status === 'disputed' && (
          <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase italic leading-none">⚠️ Under Review</p>
              <p className="text-[11px] text-red-400/80 mt-1">
                Conflicting match results were submitted. Our admin moderation team is currently reviewing your chat logs and submitted screenshots.
              </p>
            </div>
          </div>
        )}

        {detail.challenge_status === 'cancelled' && (
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3 text-zinc-400">
            <XCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase italic leading-none">❌ Challenge Cancelled</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                This challenge has been cancelled. If this was a paid challenge, your entry fees have been fully refunded to your wallet.
              </p>
            </div>
          </div>
        )}

        {/* MAIN VISUAL CARD (VERSUS OR WAITING STATUS) */}
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 to-transparent pointer-events-none" />

          {detail.challenge_status === 'waiting' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 relative z-10">
              <Link 
                to={`/players/${detail.player1_username}`}
                className="relative group cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                <PlayerBadge 
                  badgeId={detail.player1_badge_id} 
                  username={detail.player1_username || 'Creator'} 
                  size="xl"
                  className="w-24 h-24 relative z-10"
                />
              </Link>

              <div className="space-y-1">
                <Link 
                  to={`/players/${detail.player1_username}`}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  <h2 className="text-xl font-black text-white uppercase italic">{detail.player1_username}</h2>
                </Link>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Waiting for an opponent...</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-zinc-800 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  Copy Invite Link
                </button>
                {isCreator && (
                  <button
                    onClick={handleCancelChallenge}
                    disabled={refetching}
                    className="inline-flex items-center gap-2 bg-red-950/40 hover:bg-red-950/80 text-red-400 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-red-900/30 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Challenge
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* VERSUS CARD */
            <div className="relative z-10 space-y-6">
              <div className="grid grid-cols-3 items-center text-center">
                {/* Player 1 */}
                <div className="flex flex-col items-center space-y-3">
                  <Link 
                    to={`/players/${detail.player1_username}`}
                    className="flex flex-col items-center space-y-3 group cursor-pointer"
                  >
                    <div className="relative group-hover:scale-105 transition-transform">
                      <PlayerBadge 
                        badgeId={detail.player1_badge_id} 
                        username={detail.player1_username || 'P1'} 
                        size="lg"
                        className="w-16 h-16 sm:w-20 sm:h-20"
                      />
                      {detail.winner_id === detail.player1_id && detail.challenge_status === 'completed' && (
                        <span className="absolute -top-2 -right-2 text-2xl drop-shadow animate-bounce">👑</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white italic truncate max-w-[120px] group-hover:text-primary transition-colors">{detail.player1_username}</h3>
                    </div>
                  </Link>
                  {detail.player1_legacy_score !== null && detail.player1_legacy_score > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      🏆 {detail.player1_legacy_score}
                    </span>
                  )}
                </div>

                {/* VS Divider / Scores */}
                <div className="flex flex-col items-center justify-center space-y-2">
                  {detail.challenge_status === 'completed' ? (
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">FINAL SCORE</span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-widest bg-zinc-900 px-3 py-1.5 rounded-2xl border border-zinc-800">
                        {detail.player1_score} – {detail.player2_score}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black italic text-lg shadow-inner">
                        VS
                      </div>
                      {timeLeft && (
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md mt-1">
                          {timeLeft}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Player 2 */}
                <div className="flex flex-col items-center space-y-3">
                  <Link 
                    to={`/players/${detail.player2_username}`}
                    className="flex flex-col items-center space-y-3 group cursor-pointer"
                  >
                    <div className="relative group-hover:scale-105 transition-transform">
                      <PlayerBadge 
                        badgeId={detail.player2_badge_id} 
                        username={detail.player2_username || 'P2'} 
                        size="lg"
                        className="w-16 h-16 sm:w-20 sm:h-20"
                      />
                      {detail.winner_id === detail.player2_id && detail.challenge_status === 'completed' && (
                        <span className="absolute -top-2 -right-2 text-2xl drop-shadow animate-bounce">👑</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white italic truncate max-w-[120px] group-hover:text-primary transition-colors">{detail.player2_username}</h3>
                    </div>
                  </Link>
                  {detail.player2_legacy_score !== null && detail.player2_legacy_score > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      🏆 {detail.player2_legacy_score}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS INFO / ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Info */}
          <div className="md:col-span-1 bg-zinc-950 p-5 rounded-3xl border border-zinc-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">Challenge Settings</h4>
            
            <div className="space-y-3 divide-y divide-zinc-900 text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500">Entry Type:</span>
                <span className="font-bold text-white uppercase">{detail.entry_type}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500">Entry Fee:</span>
                <span className="font-bold text-white">
                  {detail.entry_type === 'free' ? 'FREE' : `$${detail.entry_fee}`}
                </span>
              </div>
              {detail.entry_type === 'paid' && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-zinc-500">Prize Pool:</span>
                  <span className="font-black text-amber-400">${detail.prize_pool}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500">Created:</span>
                <span className="text-zinc-400">{new Date(detail.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right panel: Controls */}
          {detail.challenge_status !== 'waiting' && detail.challenge_status !== 'cancelled' && (
            <div className="md:col-span-2 bg-zinc-950 p-5 rounded-3xl border border-zinc-800 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-2">Battle Controls</h4>
                <p className="text-xs text-zinc-400">Coordinate game settings inside the Match Chat. When you carry out your match, ensure you capture screenshots and submit the final results.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {isParticipant && detail.conversation_id && (
                  <button
                    onClick={() => navigate(`/challenges/${challengeId}/chat`)}
                    className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border border-zinc-800 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Open Chat
                  </button>
                )}

                {isParticipant && (detail.challenge_status === 'matched' || detail.challenge_status === 'in_progress') && (
                  <>
                    <button
                      onClick={() => handleOpenSubmitModal(false)}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Submit Result
                    </button>
                    <button
                      onClick={() => handleOpenSubmitModal(true)}
                      className="flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/55 text-red-400 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border border-red-900/30 transition-all cursor-pointer sm:col-span-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Report No-Show
                    </button>
                  </>
                )}

                {detail.challenge_status === 'completed' && (
                  <button
                    onClick={handleRematch}
                    disabled={refetching}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md sm:col-span-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    🔁 REMATCH OPPONENT
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Result Modal */}
        <AnimatePresence>
          {isSubmitOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl p-6 overflow-hidden relative shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-500" />
                    <h3 className="font-black text-lg text-white uppercase italic tracking-tight">
                      {isNoShowReport ? 'Report No-Show' : 'Submit Match Result'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsSubmitOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitResult} className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    {isNoShowReport 
                      ? 'Reporting no-show will prefill the scores in your favor (3-0) and request proof that the opponent was non-responsive.' 
                      : 'Please input the final match score below. Both players must submit scores; discrepancies trigger administrative reviews.'
                    }
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 truncate">{detail.player1_username}'s Score</label>
                      <input 
                        type="number"
                        min="0"
                        max="99"
                        disabled={isNoShowReport}
                        value={player1Score}
                        onChange={(e) => setPlayer1Score(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 truncate">{detail.player2_username}'s Score</label>
                      <input 
                        type="number"
                        min="0"
                        max="99"
                        disabled={isNoShowReport}
                        value={player2Score}
                        onChange={(e) => setPlayer2Score(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  {/* Screenshot upload */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                      Screenshot Proof {isNoShowReport ? '(Required)' : '(Optional)'}
                    </label>
                    <div className="relative">
                      {screenshotPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-40">
                          <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                            className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white hover:bg-black"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-6 hover:border-zinc-700 hover:bg-zinc-900/10 cursor-pointer">
                          <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                          <span className="text-xs text-zinc-400 font-bold">Select Screenshot Image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="hidden" 
                            required={isNoShowReport}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || uploading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-wider py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting || uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {uploading ? 'UPLOADING PROOF...' : 'SUBMITTING...'}
                      </>
                    ) : (
                      isNoShowReport ? 'SUBMIT NO-SHOW REPORT' : 'SUBMIT RESULT'
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
