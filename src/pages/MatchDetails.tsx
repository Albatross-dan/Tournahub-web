import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Match } from '../types/database';
import { matchService } from '../services/matchService';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { 
  Info, ArrowLeft, Trophy,
  Shield, ArrowUpRight, X, XCircle,
  Upload, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { getPublicIdentity, cn } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import MatchChat from '../components/messages/MatchChat';
import { SubmitResultPanel } from '../components/match/SubmitResultPanel';
import VerificationStatusBadge from '../components/match/VerificationStatusBadge';
import { motion } from 'motion/react';
import { useTournamentBadges } from '../hooks/useTournamentBadges';
import { VerificationStatus } from '../types/verification.types';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { NoShowUnderReview } from '../components/match/NoShowUnderReview';

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(() => {
    loadMatchData(false);
    loadMatchStreamUrls();
  });
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [noShowReport, setNoShowReport] = useState<any>(null);
  const { badges } = useTournamentBadges(match?.tournament_id || '');

  // Live stream states
  const [streamUrls, setStreamUrls] = useState<any[]>([]);
  const [myStreamUrlInput, setMyStreamUrlInput] = useState('');
  const [submittingStream, setSubmittingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // No-Show Report States
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowScreenshot, setNoShowScreenshot] = useState<File | null>(null);
  const [noShowPreviewUrl, setNoShowPreviewUrl] = useState<string | null>(null);
  const [noShowNotes, setNoShowNotes] = useState('');
  const [noShowUploading, setNoShowUploading] = useState(false);
  const [noShowError, setNoShowError] = useState<string | null>(null);
  const [noShowSuccess, setNoShowSuccess] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (noShowPreviewUrl) {
        URL.revokeObjectURL(noShowPreviewUrl);
      }
    };
  }, [noShowPreviewUrl]);

  const handleNoShowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setNoShowError('Invalid file type. Only JPEG, PNG, or JPG images allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setNoShowError('File is too large. Max size 10MB.');
      return;
    }

    if (noShowPreviewUrl) {
      URL.revokeObjectURL(noShowPreviewUrl);
    }
    setNoShowPreviewUrl(URL.createObjectURL(file));
    setNoShowScreenshot(file);
    setNoShowError(null);
  };

  const closeNoShowModal = () => {
    setShowNoShowModal(false);
    setNoShowScreenshot(null);
    if (noShowPreviewUrl) {
      URL.revokeObjectURL(noShowPreviewUrl);
    }
    setNoShowPreviewUrl(null);
    setNoShowNotes('');
    setNoShowError(null);
    setNoShowSuccess(false);
  };

  const handleNoShowSubmit = async () => {
    if (!noShowScreenshot) {
      setNoShowError("Screenshot is required.");
      return;
    }
    if (!match || !user) return;
    setNoShowUploading(true);
    setNoShowError(null);

    try {
      const file = noShowScreenshot;
      const arrayBuffer = await file.arrayBuffer();

      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}.jpg`;

      // Upload to 'no-show-evidence' bucket as user/timestamp.jpg
      const { error: uploadErr } = await supabase.storage
        .from('no-show-evidence')
        .upload(filePath, arrayBuffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // Get public Url
      const { data: { publicUrl } } = supabase.storage
        .from('no-show-evidence')
        .getPublicUrl(filePath);

      // Call submit_no_show_report RPC function
      await matchService.submitNoShowReport(match.id, publicUrl, noShowNotes.trim() || null);

      setNoShowSuccess(true);
      await loadMatchData(false);
    } catch (err: any) {
      console.error('[NoShowReport] Error submitting report:', err);
      setNoShowError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setNoShowUploading(false);
    }
  };

  const activePlayer1Id = typeof match?.player1 === 'object' ? (match.player1 as any)?.id : match?.player1;
  const activePlayer2Id = typeof match?.player2 === 'object' ? (match.player2 as any)?.id : match?.player2;
  const isParticipant = !!(user && (activePlayer1Id === user.id || activePlayer2Id === user.id));

  useEffect(() => {
    isInitialLoad.current = true;
    if (!id) return;
    
    loadMatchData();
    loadMatchStreamUrls();

    const matchChannel = supabase
      .channel(`match-detail-${id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${id}`
      }, () => loadMatchData(false))
      .subscribe();

    const streamChannel = supabase
      .channel(`match-streams-${id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fixture_stream_urls',
        filter: `match_id=eq.${id}`
      }, () => loadMatchStreamUrls())
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(streamChannel);
    };
  }, [id, user?.id]);

  async function loadMatchStreamUrls() {
    if (!id) return;
    try {
      const { data, error } = await (supabase as any)
        .from('fixture_stream_urls')
        .select(`
          id,
          stream_url,
          updated_at,
          submitted_by,
          profiles ( username, avatar_url )
        `)
        .eq('match_id', id);

      if (error) {
        console.error('[MatchDetails] Error loading stream URLs:', error);
        return;
      }

      setStreamUrls(data || []);
      
      if (user) {
        const myStream = data?.find((s: any) => s.submitted_by === user.id);
        if (myStream) {
          setMyStreamUrlInput(myStream.stream_url);
        } else {
          setMyStreamUrlInput('');
        }
      }
    } catch (err) {
      console.error('[MatchDetails] Failed to load stream URLs:', err);
    }
  }

  const handleUpsertStream = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id || !user) return;
    
    setSubmittingStream(true);
    setStreamError(null);
    
    let url = myStreamUrlInput.trim();
    if (!url) {
      setStreamError('Please specify a stream URL.');
      setSubmittingStream(false);
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      const { error } = await (supabase as any)
        .from('fixture_stream_urls')
        .upsert(
          {
            match_id: id,
            submitted_by: user.id,
            stream_url: url,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'match_id,submitted_by' }
        );

      if (error) throw error;
      await loadMatchStreamUrls();
    } catch (err: any) {
      console.error('[MatchDetails] Upsert stream error:', err);
      setStreamError(err.message || 'Failed to submit stream URL.');
    } finally {
      setSubmittingStream(false);
    }
  };

  const handleRemoveStream = async () => {
    if (!id || !user) return;
    
    setSubmittingStream(true);
    setStreamError(null);

    try {
      const { error } = await (supabase as any)
        .from('fixture_stream_urls')
        .delete()
        .eq('match_id', id)
        .eq('submitted_by', user.id);

      if (error) throw error;
      setMyStreamUrlInput('');
      await loadMatchStreamUrls();
    } catch (err: any) {
      console.error('[MatchDetails] Remove stream error:', err);
      setStreamError(err.message || 'Failed to remove stream URL.');
    } finally {
      setSubmittingStream(false);
    }
  };

  async function loadMatchData(showLoading = isInitialLoad.current) {
    if (!id) return;
    try {
      if (showLoading) setLoading(true);
      const [matchData, { data: nsReport }] = await Promise.all([
        matchService.getById(id),
        supabase
          .from('match_no_show_reports')
          .select('id, status, reported_by, absent_player')
          .eq('match_id', id)
          .eq('status', 'pending')
          .maybeSingle()
      ]);
      setMatch(matchData);
      setNoShowReport(nsReport);
    } catch (err) {
      console.error('[MatchDetails] loadMatchData failed:', err);
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

  const scheduledAt = match?.scheduled_at;
  const playWindowMinutes = match?.play_window_minutes ?? 30;

  let isNoShowButtonEnabled = true;
  let unlockTimeStr = '';
  let timeRemainingStr = '';

  if (scheduledAt) {
    const matchStart = new Date(scheduledAt);
    const matchEnd = new Date(matchStart.getTime() + playWindowMinutes * 60000);
    const unlockTime = new Date(matchEnd.getTime() - 15 * 60000);
    isNoShowButtonEnabled = now >= unlockTime;

    if (!isNoShowButtonEnabled) {
      const diffMs = unlockTime.getTime() - now.getTime();
      const minutesRemaining = Math.ceil(diffMs / 60000);
      if (minutesRemaining > 60) {
        unlockTimeStr = unlockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
        timeRemainingStr = `${Math.floor(diffMs / 60000)}m ${secs}s`;
      }
    }
  }

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

               {/* Live Streams Section */}
               {(isParticipant || streamUrls.length > 0) && (
                 <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
                   {/* Opponent's Stream URL Display (or all URLs for spectator) */}
                   {isParticipant ? (
                     streamUrls.find((s: any) => s.submitted_by !== user?.id) && (
                       <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
                         <div className="flex items-center space-x-3 min-w-0">
                           {streamUrls.find((s: any) => s.submitted_by !== user?.id).profiles?.avatar_url ? (
                             <img
                               src={streamUrls.find((s: any) => s.submitted_by !== user?.id).profiles.avatar_url}
                               alt={streamUrls.find((s: any) => s.submitted_by !== user?.id).profiles.username}
                               className="w-8 h-8 rounded-xl object-cover shrink-0"
                               referrerPolicy="no-referrer"
                             />
                           ) : (
                             <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 uppercase shrink-0">
                               {streamUrls.find((s: any) => s.submitted_by !== user?.id).profiles?.username?.[0] || 'O'}
                             </div>
                           )}
                           <div className="min-w-0">
                             <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block leading-none mb-1">Live Stream</span>
                             <span className="text-xs font-black text-white truncate block">{streamUrls.find((s: any) => s.submitted_by !== user?.id).profiles?.username || 'Opponent'}</span>
                           </div>
                         </div>
                         <a
                           href={streamUrls.find((s: any) => s.submitted_by !== user?.id).stream_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="btn-secondary py-1.5 px-4 text-xs font-black uppercase italic flex items-center space-x-1.5 shrink-0"
                         >
                           <span>Watch Play</span>
                           <ArrowUpRight className="w-3.5 h-3.5" />
                         </a>
                       </div>
                     )
                   ) : (
                     streamUrls.length > 0 && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {streamUrls.map((s) => (
                           <div key={s.id} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
                             <div className="flex items-center space-x-3 min-w-0">
                               {s.profiles?.avatar_url ? (
                                 <img
                                   src={s.profiles.avatar_url}
                                   alt={s.profiles.username}
                                   className="w-8 h-8 rounded-xl object-cover shrink-0"
                                   referrerPolicy="no-referrer"
                                 />
                               ) : (
                                 <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 uppercase shrink-0">
                                   {s.profiles?.username?.[0] || 'P'}
                                 </div>
                               )}
                               <div className="min-w-0">
                                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block leading-none mb-1">Live Broadcast</span>
                                 <span className="text-xs font-black text-white truncate block">{s.profiles?.username || 'Player'}</span>
                               </div>
                             </div>
                             <a
                               href={s.stream_url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="btn-secondary py-1.5 px-4 text-xs font-black uppercase italic flex items-center space-x-1.5 shrink-0"
                             >
                               <span>Watch Live</span>
                               <ArrowUpRight className="w-3.5 h-3.5" />
                             </a>
                           </div>
                         ))}
                       </div>
                     )
                   )}

                   {/* Add / Update Form for Participant */}
                   {isParticipant && (
                     <div className="bg-zinc-950/40 p-4 border border-zinc-800/60 rounded-2xl space-y-3">
                       <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                         Add stream URL (optional)
                       </label>
                       <form onSubmit={handleUpsertStream} className="flex flex-col sm:flex-row gap-2">
                         <input
                           type="url"
                           placeholder="https://twitch.tv/yourusername"
                           value={myStreamUrlInput}
                           onChange={(e) => setMyStreamUrlInput(e.target.value)}
                           className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all placeholder:text-zinc-600"
                         />
                         <div className="flex gap-2 shrink-0">
                           {streamUrls.some((s: any) => s.submitted_by === user?.id) ? (
                             <>
                               <button
                                 type="submit"
                                 disabled={submittingStream}
                                 className="btn-primary py-2 px-4 text-xs font-black uppercase italic"
                               >
                                 {submittingStream ? 'Saving...' : 'Update'}
                               </button>
                               <button
                                 type="button"
                                 onClick={handleRemoveStream}
                                 disabled={submittingStream}
                                 className="px-4 py-2 bg-red-950/15 border border-red-900/30 text-red-400 hover:bg-red-900/20 text-xs font-black uppercase italic rounded-xl hover:text-red-200 transition-colors"
                               >
                                 Remove
                               </button>
                             </>
                           ) : (
                             <button
                               type="submit"
                               disabled={submittingStream || !myStreamUrlInput.trim()}
                               className="btn-primary py-2 px-6 text-xs font-black uppercase italic disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               {submittingStream ? 'Saving...' : 'Add'}
                             </button>
                           )}
                         </div>
                       </form>
                       {streamError && (
                         <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{streamError}</p>
                       )}
                     </div>
                   )}
                 </div>
               )}
            </div>

            {isParticipant ? (
              <div className="space-y-6">
                {noShowReport && noShowReport.status === 'pending' ? (
                  <NoShowUnderReview
                    reportedBy={noShowReport.reported_by}
                    absentPlayer={noShowReport.absent_player}
                    currentUserId={user.id}
                    tournamentId={match.tournament_id}
                  />
                ) : (
                  <>
                    <SubmitResultPanel 
                      matchId={match.id}
                      currentUserId={user.id}
                      playerName={getPublicIdentity(profile || { id: user.id, username: user.user_metadata?.username })}
                      match={match}
                    />
                
                {/* No-Show Report Action */}
                {match && ['scheduled', 'match_in_progress', 'lobby_open', 'awaiting_result', 'under_review'].includes(match.status) && (
                  <button
                    disabled={match.status === 'under_review' || !isNoShowButtonEnabled}
                    onClick={() => setShowNoShowModal(true)}
                    className={cn(
                      "w-full h-14 flex items-center justify-center gap-2 rounded-2xl font-black uppercase italic tracking-widest transition-all text-xs border cursor-pointer",
                      match.status === 'under_review' || !isNoShowButtonEnabled
                        ? "bg-zinc-950 border-zinc-900 text-zinc-500 cursor-not-allowed"
                        : "bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40"
                    )}
                  >
                    <XCircle className="w-4 h-4" />
                    {match.status === 'under_review' 
                      ? "No-Show Under Review" 
                      : !isNoShowButtonEnabled
                        ? `Opponent Didn't Show Up (${timeRemainingStr ? `Unlocks in ${timeRemainingStr}` : unlockTimeStr ? `Unlocks at ${unlockTimeStr}` : 'Locked'})`
                        : "Opponent Didn't Show Up"}
                  </button>
                )}

                {showNoShowModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full relative space-y-6 overflow-hidden shadow-2xl text-left">
                      {/* Close Header button */}
                      <button 
                        onClick={closeNoShowModal}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {!noShowSuccess ? (
                        <>
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                              <XCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-wider">Report Opponent No-Show</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed font-bold">
                              If your opponent did not show up or communicate within the tournament window, you can submit a report. Proof of unanswered WhatsApp coordination is required.
                            </p>
                          </div>

                          {/* Screenshot File upload */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">WhatsApp Screenshot Proof (Required)</label>
                            
                            {noShowScreenshot ? (
                              <div className="relative rounded-2xl overflow-hidden border border-zinc-805 aspect-video bg-zinc-900">
                                <img 
                                  src={noShowPreviewUrl || ''} 
                                  alt="WhatsApp screenshot proof" 
                                  className="w-full h-full object-cover" 
                                />
                                {noShowUploading && (
                                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-center">Uploading Evidence...</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoShowScreenshot(null);
                                    if (noShowPreviewUrl) URL.revokeObjectURL(noShowPreviewUrl);
                                    setNoShowPreviewUrl(null);
                                  }}
                                  disabled={noShowUploading}
                                  className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700/95 text-white text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-widest cursor-pointer transition-colors z-20"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="border border-zinc-800 hover:border-zinc-700 transition-colors border-dashed rounded-2xl p-8 bg-zinc-900/40 relative cursor-pointer group flex flex-col items-center justify-center text-center">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleNoShowFileChange}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-6 h-6 text-zinc-650 group-hover:text-primary transition-colors mb-2 animate-pulse" />
                                <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">Select WhatsApp Screenshot</span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-1">JPEG, PNG, or JPG up to 10MB</span>
                              </div>
                            )}
                          </div>

                          {/* Notes field */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Additional Notes (Optional)</label>
                            <textarea
                              rows={3}
                              placeholder="Describe the context (e.g. 'I messaged the opponent 15 mins ago and got no response...')"
                              value={noShowNotes}
                              onChange={(e) => setNoShowNotes(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-655 resize-none font-bold"
                            />
                          </div>

                          {/* Error message */}
                          {noShowError && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{noShowError}</span>
                            </div>
                          )}

                          {/* Buttons flow */}
                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={closeNoShowModal}
                              className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-colors border border-zinc-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!noShowScreenshot || noShowUploading}
                              onClick={handleNoShowSubmit}
                              className="flex-1 h-12 bg-red-500 text-black hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2"
                            >
                              {noShowUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <span>Submit Report</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-in zoom-in-95 duration-250">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                             <CheckCircle className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-base font-black text-white uppercase italic tracking-wider animate-pulse">Report Received</h3>
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed font-bold animate-pulse">
                              Report submitted. An admin will review within 24 hours.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeNoShowModal}
                            className="h-11 px-8 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-colors border border-zinc-800 text-zinc-400"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <MatchChat 
                  matchId={match.id} 
                  currentUserId={user.id} 
                  tournamentId={match.tournament_id} 
                />
              </>
            )}
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
