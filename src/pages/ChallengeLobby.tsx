import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { useAuth } from '../contexts/AuthContext';
import { 
  Swords, Plus, Trophy, Wallet, RefreshCw, Search, X, Shield, 
  HelpCircle, ArrowRight, User, Check, Flame, MessageSquare, ShieldAlert,
  Timer
} from 'lucide-react';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { tournamentService } from '../services/tournamentService';

interface LobbyChallenge {
  id: string;
  created_by: string;
  creator_username: string | null;
  creator_avatar: string | null;
  creator_country: string | null;
  creator_badge_id: string | null;
  creator_legacy_score: number | null;
  title: string | null;
  entry_type: 'free' | 'paid';
  entry_fee: number;
  currency: string;
  prize_pool: number;
  status: string;
  created_at: string;
  rematch_of_challenge_id: string | null;
}

interface ChallengeHistory {
  challenge_id: string;
  player1_id: string;
  player1_username: string;
  player1_badge_id: string;
  player2_id: string;
  player2_username: string;
  player2_badge_id: string;
  player1_score: number | null;
  player2_score: number | null;
  status: string;
  winner_id: string | null;
  played_at: string;
  entry_type: 'free' | 'paid';
  entry_fee: number;
  prize_pool: number;
}

function ActiveChallengeCountdown({ autoCancelAt }: { autoCancelAt: string | null | undefined }) {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');

  useEffect(() => {
    if (!autoCancelAt) {
      setTimeLeft('00:00:00');
      return;
    }
    const updateTime = () => {
      const targetTime = new Date(autoCancelAt).getTime();
      if (isNaN(targetTime)) {
        setTimeLeft('00:00:00');
        return;
      }
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(
        [
          hours.toString().padStart(2, '0'),
          minutes.toString().padStart(2, '0'),
          seconds.toString().padStart(2, '0'),
        ].join(':')
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [autoCancelAt]);

  return <span>{timeLeft}</span>;
}

function ExpiresCountdown({ autoCancelAt }: { autoCancelAt: string | null | undefined }) {
  const [timeLeft, setTimeLeft] = useState<string>('Expires soon');

  useEffect(() => {
    if (!autoCancelAt) {
      setTimeLeft('Expired');
      return;
    }
    const updateTime = () => {
      const targetTime = new Date(autoCancelAt).getTime();
      if (isNaN(targetTime)) {
        setTimeLeft('Expired');
        return;
      }
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const totalMinutes = Math.floor(diff / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setTimeLeft(`Expires in ${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [autoCancelAt]);

  return <span>{timeLeft}</span>;
}

export default function ChallengeLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [activeLoading, setActiveLoading] = useState<boolean>(true);
  const [activeError, setActiveError] = useState<string | null>(null);

  const [challenges, setChallenges] = useState<LobbyChallenge[]>([]);
  const [history, setHistory] = useState<ChallengeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'history'>('lobby');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [selectedChallengeToJoin, setSelectedChallengeToJoin] = useState<LobbyChallenge | null>(null);

  // Form States for creating
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState<'free' | 'paid'>('free');
  const [entryFee, setEntryFee] = useState<number>(0);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [availableBadges, setAvailableBadges] = useState<{ badge_id: string }[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Form States for joining
  const [joinBadgeId, setJoinBadgeId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Open Challenges
  const fetchLobby = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error: fetchErr } = await (supabase as any)
        .from('v_challenge_lobby')
        .select(`
          id,
          created_by,
          creator_username,
          creator_avatar,
          creator_country,
          creator_badge_id,
          creator_legacy_score,
          title,
          entry_type,
          entry_fee,
          currency,
          prize_pool,
          status,
          created_at,
          rematch_of_challenge_id
        `)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setChallenges((data || []) as LobbyChallenge[]);
    } catch (err: any) {
      console.error('[ChallengeLobby] Error fetching lobby:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch Active Challenges
  const fetchActiveChallenges = async () => {
    if (!user) return;
    try {
      setActiveLoading(true);
      setActiveError(null);
      const { data, error: activeErr } = await (supabase as any)
        .from('v_my_active_challenges')
        .select('*');

      if (activeErr) throw activeErr;
      setActiveChallenges(data || []);
    } catch (err: any) {
      console.error('[ChallengeLobby] Error fetching active challenges:', err);
      setActiveError(err.message || 'Error loading active challenges');
    } finally {
      setActiveLoading(false);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const { data, error: histErr } = await (supabase as any)
        .from('v_challenge_history')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('played_at', { ascending: false })
        .limit(20);

      if (histErr) throw histErr;
      setHistory((data || []) as ChallengeHistory[]);
    } catch (err) {
      console.error('[ChallengeLobby] Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch Wallet Balance and Badges
  const fetchWalletAndBadges = async () => {
    if (!user) return;
    try {
      setBadgesLoading(true);
      // Fetch wallet balance
      const { data: walletData } = await (supabase as any)
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (walletData) {
        setWalletBalance((walletData as any).balance || 0);
      }

      // Fetch badges from the first active tournament to use for challenge picker
      const { data: tourneys } = await (supabase as any)
        .from('tournaments')
        .select('id')
        .limit(5);

      if (tourneys && tourneys.length > 0) {
        // Try tournaments in order until we find badges
        for (const t of tourneys) {
          try {
            const badges = await tournamentService.listBadgesForPicker(t.id);
            if (badges && badges.length > 0) {
              setAvailableBadges(badges);
              break;
            }
          } catch (e) {
            console.warn('Failed to load badges from tournament:', t.id, e);
          }
        }
      }
    } catch (err) {
      console.error('[ChallengeLobby] Error loading picker data:', err);
    } finally {
      setBadgesLoading(false);
    }
  };

  useEffect(() => {
    fetchLobby();
    fetchWalletAndBadges();

    // Subscribe to challenge lobby changes
    const lobbySubscription = supabase
      .channel('public-challenges-lobby')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges'
      }, () => {
        fetchLobby(false);
        fetchActiveChallenges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(lobbySubscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    
    fetchActiveChallenges();

    // Subscribe to active challenge changes
    const activeSubscription = supabase
      .channel('my-active-challenge-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenge_matches',
        filter: `player1_id=eq.${user.id}`,
      }, () => {
        fetchActiveChallenges();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenge_matches',
        filter: `player2_id=eq.${user.id}`,
      }, () => {
        fetchActiveChallenges();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges'
      }, () => {
        fetchActiveChallenges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activeSubscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleOpenCreateModal = () => {
    setError(null);
    setTitle('');
    setEntryType('free');
    setEntryFee(0);
    setSelectedBadgeId(null);
    setIsCreateOpen(true);
    fetchWalletAndBadges();
  };

  const handleOpenJoinModal = (challenge: LobbyChallenge) => {
    setError(null);
    setJoinBadgeId(null);
    setSelectedChallengeToJoin(challenge);
    setIsJoinOpen(true);
    fetchWalletAndBadges();
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedBadgeId) {
      setError('Please choose a team badge.');
      return;
    }

    if (entryType === 'paid' && entryFee <= 0) {
      setError('Please specify a positive entry fee.');
      return;
    }

    if (entryType === 'paid' && walletBalance < entryFee) {
      setError(`Insufficient wallet balance. You have $${walletBalance.toFixed(2)} but need $${entryFee.toFixed(2)}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let walletTxId = null;

      // Handle debit if paid
      if (entryType === 'paid' && entryFee > 0) {
        // Double check wallet balance inside transaction logic
        const { data: freshWallet } = await (supabase as any)
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!freshWallet || (freshWallet as any).balance < entryFee) {
          throw new Error('Insufficient balance. Please top up.');
        }

        // Deduct from wallet
        const { error: deductErr } = await (supabase as any)
          .from('wallets')
          .update({ balance: (freshWallet as any).balance - entryFee })
          .eq('user_id', user.id);

        if (deductErr) throw deductErr;

        // Create transaction
        const { data: tx, error: txErr } = await (supabase as any)
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: -entryFee,
            type: 'debit',
            description: `1v1 Challenge Entry Fee`
          })
          .select('id')
          .single();

        if (txErr) throw txErr;
        if (!tx) throw new Error('Transaction creation failed.');
        walletTxId = tx.id;
      }

      // Step 1: Insert challenge
      const { data: challenge, error: challengeErr } = await (supabase as any)
        .from('challenges')
        .insert({
          created_by: user.id,
          title: title || null,
          entry_type: entryType,
          entry_fee: entryType === 'paid' ? entryFee : 0,
          currency: 'USD',
          platform_fee_pct: 10,
        })
        .select('id')
        .single();

      if (challengeErr) throw challengeErr;
      if (!challenge) throw new Error('Challenge creation failed.');

      // Step 2: Register creator
      const { error: regErr } = await (supabase as any)
        .from('challenge_registrations')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          payment_status: 'paid', // paid means fee cleared (instant for free)
          entry_fee_snapshot: entryType === 'paid' ? entryFee : 0,
          currency_snapshot: 'USD',
          wallet_transaction_id: walletTxId || null,
        });

      if (regErr) throw regErr;

      // Step 3: Save badge selection
      const { error: badgeErr } = await (supabase as any)
        .from('challenge_badge_selections')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          badge_id: selectedBadgeId,
        });

      if (badgeErr) throw badgeErr;

      // Success - Navigate to Challenge Details
      setIsCreateOpen(false);
      navigate(`/challenges/${challenge.id}`);
    } catch (err: any) {
      console.error('[ChallengeLobby] Failed to create challenge:', err);
      setError(err.message || 'An unexpected error occurred during creation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinChallenge = async () => {
    if (!user || !selectedChallengeToJoin) return;
    if (!joinBadgeId) {
      setError('Please select a badge to join.');
      return;
    }

    const fee = selectedChallengeToJoin.entry_fee;

    if (selectedChallengeToJoin.entry_type === 'paid' && walletBalance < fee) {
      setError(`Insufficient wallet balance. You have $${walletBalance.toFixed(2)} but need $${fee.toFixed(2)}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let walletTxId = null;

      // Debit wallet for paid
      if (selectedChallengeToJoin.entry_type === 'paid' && fee > 0) {
        const { data: freshWallet } = await (supabase as any)
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!freshWallet || (freshWallet as any).balance < fee) {
          throw new Error('Insufficient balance.');
        }

        // Deduct
        const { error: deductErr } = await (supabase as any)
          .from('wallets')
          .update({ balance: (freshWallet as any).balance - fee })
          .eq('user_id', user.id);

        if (deductErr) throw deductErr;

        // Create transaction
        const { data: tx, error: txErr } = await (supabase as any)
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: -fee,
            type: 'debit',
            description: `1v1 Challenge Opponent Entry Fee`
          })
          .select('id')
          .single();

        if (txErr) throw txErr;
        if (!tx) throw new Error('Transaction creation failed.');
        walletTxId = tx.id;
      }

      // Step 2: Insert registration
      const { error: regErr } = await (supabase as any)
        .from('challenge_registrations')
        .insert({
          challenge_id: selectedChallengeToJoin.id,
          user_id: user.id,
          payment_status: 'paid',
          entry_fee_snapshot: fee,
          currency_snapshot: 'USD',
          wallet_transaction_id: walletTxId || null,
        });

      if (regErr) throw regErr;

      // Step 3: Save badge selection
      const { error: badgeErr } = await (supabase as any)
        .from('challenge_badge_selections')
        .upsert({
          challenge_id: selectedChallengeToJoin.id,
          user_id: user.id,
          badge_id: joinBadgeId,
        }, { onConflict: 'challenge_id,user_id' });

      if (badgeErr) throw badgeErr;

      // Success - Backend pairing takes care of everything else. Navigate to detail
      setIsJoinOpen(false);
      navigate(`/challenges/${selectedChallengeToJoin.id}`);
    } catch (err: any) {
      console.error('[ChallengeLobby] Failed to join challenge:', err);
      setError(err.message || 'Could not join challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Banner with Title and CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-purple-900/10 pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Swords className="w-8 h-8 text-blue-500" />
              1v1 Challenge Arena
            </h1>
            <p className="text-sm text-zinc-400">Challenge any player now. Select entry fee, pick your badge, and wait for matchups.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Challenge
          </button>
        </div>

        <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse inline-block" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">My Active Challenges</span>
          </div>

          {activeLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-zinc-950 rounded-3xl border border-zinc-800/80">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 animate-pulse">Loading active challenges...</p>
            </div>
          ) : activeError ? (
            <div className="text-center py-6 bg-zinc-950 rounded-3xl border border-red-500/20 text-red-400">
              <p className="text-xs font-bold uppercase tracking-wider">{activeError}</p>
            </div>
          ) : activeChallenges.length === 0 ? (
            <div className="text-center py-10 bg-zinc-950 rounded-3xl border border-zinc-800 border-dashed">
              <p className="text-sm text-zinc-500">No active challenges</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeChallenges.map((match) => {
                const myBadgeId = match.my_role === 'player1' ? match.player1_badge_id : match.player2_badge_id;
                const myUsername = match.my_role === 'player1' ? match.player1_username : match.player2_username;

                return (
                  <div key={match.match_id} className="bg-zinc-950 rounded-3xl border border-zinc-800/80 p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                      {/* Players & VS section */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                        {/* VS Separator with both badges facing each other */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <PlayerBadge 
                              badgeId={myBadgeId} 
                              username={myUsername || 'You'} 
                              size="md"
                              className="w-12 h-12 ring-2 ring-blue-500/20"
                            />
                            <div className="hidden sm:block">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">You</span>
                              <span className="text-sm font-black text-white italic truncate max-w-[100px] block">
                                {myUsername || 'You'}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-black text-zinc-400 italic">
                            VS
                          </span>

                          <div className="flex items-center gap-2">
                            <PlayerBadge 
                              badgeId={match.opponent_badge_id} 
                              username={match.opponent_username || 'Opponent'} 
                              size="md"
                              className="w-12 h-12 ring-2 ring-red-500/20"
                            />
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Opponent</span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-black text-white italic truncate max-w-[120px] block">
                                  {match.opponent_username || 'Opponent'}
                                </span>
                                {match.opponent_country && (
                                  <span className="text-xs" title={match.opponent_country}>🌐</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Opponent Legacy Score */}
                        {match.opponent_legacy_score !== null && match.opponent_legacy_score !== undefined && match.opponent_legacy_score > 0 && (
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Opponent Score</span>
                            <span className="flex items-center gap-1 text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mt-0.5">
                              🏆 {match.opponent_legacy_score}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status / Countdown / Paid info */}
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Match Status Pill */}
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Status</span>
                          {match.match_status === 'pending' ? (
                            <span className="px-2.5 py-1 text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full uppercase tracking-wider">
                              Waiting to Start
                            </span>
                          ) : match.match_status === 'active' ? (
                            <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase tracking-wider">
                              In Progress
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-black bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full uppercase tracking-wider">
                              {match.match_status || 'Unknown'}
                            </span>
                          )}
                        </div>

                        {/* Result Verification Status */}
                        {match.match_status === 'active' && (
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Verification</span>
                            <span className={cn(
                              "text-xs font-black uppercase tracking-wide",
                              match.result_verification_status === 'disputed' ? "text-red-500" :
                              match.result_verification_status === 'pending' ? "text-amber-500" : "text-blue-400"
                            )}>
                              {
                                {
                                  none: 'Awaiting Result',
                                  pending: 'Result Submitted',
                                  disputed: 'Disputed'
                                }[match.result_verification_status as string] || 'Awaiting Result'
                              }
                            </span>
                          </div>
                        )}

                        {/* Entry Fee / Paid information */}
                        {match.entry_type === 'paid' && (
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Prize Pool</span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                              {match.prize_pool} {match.currency || 'USD'}
                            </span>
                          </div>
                        )}

                        {/* auto_cancel_at Countdown */}
                        {match.match_status === 'pending' && match.auto_cancel_at && (
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Time Remaining</span>
                            <div className="flex items-center gap-1.5 text-xs font-mono font-black text-red-400 mt-0.5">
                              <Timer className="w-3.5 h-3.5 text-red-500" />
                              <ExpiresCountdown autoCancelAt={match.auto_cancel_at} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Go to Match button / actions */}
                      <div className="flex items-center gap-2">
                        {match.conversation_id && (
                          <button
                            type="button"
                            onClick={() => navigate(`/challenges/${match.challenge_id}/chat`)}
                            className="px-4 py-2.5 bg-blue-950/40 hover:bg-blue-950/80 text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-900/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(`/challenges/${match.challenge_id}`, { state: { match_id: match.match_id } })}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer text-center"
                        >
                          Go to Match
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('lobby')}
            className={cn(
              "px-6 py-3 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer",
              activeTab === 'lobby'
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Lobby List ({challenges.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-6 py-3 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer",
              activeTab === 'history'
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            My History
          </button>
        </div>

        {activeTab === 'lobby' ? (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">Syncing Challenge Lobby...</p>
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950 rounded-3xl border border-zinc-800 border-dashed space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-600">
                  <Flame className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-white uppercase italic tracking-tighter">Lobby is Empty</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">Be the first to create an open 1v1 challenge and wait for others to join.</p>
                </div>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-4 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Create Open Challenge
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {challenges.map((item) => {
                  const isCreator = item.created_by === user?.id;
                  const isFree = item.entry_type === 'free';

                  return (
                    <div 
                      key={item.id} 
                      className="bg-zinc-950 rounded-3xl border border-zinc-800/80 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <PlayerBadge 
                            badgeId={item.creator_badge_id} 
                            username={item.creator_username || 'Creator'} 
                            size="md"
                            className="w-12 h-12"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-white italic">{item.creator_username || 'Anonymous'}</span>
                              {item.creator_country && (
                                <span className="text-xs" title={item.creator_country}>🌐</span>
                              )}
                              {item.creator_legacy_score !== null && item.creator_legacy_score > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                  🏆 {item.creator_legacy_score}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 font-medium">
                              {item.title || "Ready for battle!"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {isFree ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                              FREE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                              PAID – ${item.entry_fee}
                            </span>
                          )}
                          {item.rematch_of_challenge_id && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                              🔁 Rematch
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-zinc-900 mt-4 pt-4 flex items-center justify-between">
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {isCreator ? (
                          <button
                            onClick={() => navigate(`/challenges/${item.id}`)}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            My Lobby →
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenJoinModal(item)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/15 cursor-pointer"
                          >
                            JOIN BATTLE →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">Syncing Match History...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950 rounded-3xl border border-zinc-800 border-dashed">
                <p className="text-sm text-zinc-500">You haven't participated in any 1v1 challenges yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((hist) => {
                  const isPlayer1 = hist.player1_id === user?.id;
                  const myScore = isPlayer1 ? hist.player1_score : hist.player2_score;
                  const oppScore = isPlayer1 ? hist.player2_score : hist.player1_score;
                  const oppUsername = isPlayer1 ? hist.player2_username : hist.player1_username;
                  const oppBadge = isPlayer1 ? hist.player2_badge_id : hist.player1_badge_id;
                  const isWin = hist.winner_id === user?.id;
                  const isDraw = hist.winner_id === null && myScore !== null;
                  const isPending = hist.status !== 'completed' && hist.status !== 'cancelled' && hist.status !== 'disputed';

                  return (
                    <div 
                      key={hist.challenge_id}
                      onClick={() => navigate(`/challenges/${hist.challenge_id}`)}
                      className="bg-zinc-950 hover:bg-zinc-900/60 transition-all border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <PlayerBadge 
                          badgeId={oppBadge} 
                          username={oppUsername || 'Opponent'} 
                          size="sm"
                          className="w-10 h-10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">vs</span>
                            <span className="text-sm font-bold text-white">{oppUsername || 'Opponent'}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            {new Date(hist.played_at).toLocaleDateString()} at {new Date(hist.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {myScore !== null && oppScore !== null ? (
                            <span className="font-mono text-sm font-black text-white bg-zinc-900 px-2 py-1 rounded">
                              {myScore} – {oppScore}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              {isPending ? 'LIVE' : hist.status.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          {isPending ? (
                            <span className="bg-zinc-800 text-zinc-400 text-[8px] font-bold px-2 py-0.5 rounded uppercase">Pending</span>
                          ) : isWin ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black px-2 py-0.5 rounded uppercase">WIN</span>
                          ) : isDraw ? (
                            <span className="bg-zinc-800 text-zinc-400 text-[8px] font-bold px-2 py-0.5 rounded uppercase">DRAW</span>
                          ) : (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black px-2 py-0.5 rounded uppercase">LOSS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Challenge Modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 max-h-[calc(100vh-2rem)] md:max-h-[85vh] flex flex-col relative shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-blue-500" />
                    <h3 className="font-black text-lg text-white uppercase italic tracking-tight">Create Challenge</h3>
                  </div>
                  <button 
                    onClick={() => setIsCreateOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateChallenge} className="space-y-4 overflow-y-auto flex-1 pr-1.5 -mr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">Challenge Title (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Winner gets bragging rights!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">Entry Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setEntryType('free'); setEntryFee(0); }}
                        className={cn(
                          "py-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all cursor-pointer",
                          entryType === 'free'
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400"
                        )}
                      >
                        FREE ENTRY
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEntryType('paid'); setEntryFee(5); }}
                        className={cn(
                          "py-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all cursor-pointer",
                          entryType === 'paid'
                            ? "border-amber-500 bg-amber-500/10 text-amber-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400"
                        )}
                      >
                        PAID ENTRY
                      </button>
                    </div>
                  </div>

                  {entryType === 'paid' && (
                    <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 space-y-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Entry Fee ($)</label>
                        <input 
                          type="number"
                          min="1"
                          max="1000"
                          value={entryFee || ''}
                          onChange={(e) => setEntryFee(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-bold"
                          required
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Your Wallet Balance:</span>
                        <span className={cn("font-bold", walletBalance >= entryFee ? "text-emerald-400" : "text-red-400")}>
                          ${walletBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Badge Picker Selector */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">Choose your Arena Identity (Badge)</label>
                    {badgesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
                      </div>
                    ) : availableBadges.length === 0 ? (
                      <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">No team badges available. Create a standard team badge first.</p>
                    ) : (
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        {availableBadges.map((badge) => {
                          const isSel = selectedBadgeId === badge.badge_id;
                          return (
                            <button
                              key={badge.badge_id}
                              type="button"
                              onClick={() => setSelectedBadgeId(badge.badge_id)}
                              className={cn(
                                "aspect-square rounded-xl flex items-center justify-center p-1.5 border-2 transition-all cursor-pointer relative",
                                isSel ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
                              )}
                            >
                              <PlayerBadge 
                                badgeId={badge.badge_id} 
                                username={badge.badge_id} 
                                size="sm"
                                className="w-full h-full"
                              />
                              {isSel && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-medium">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || badgesLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        CREATING CHALLENGE...
                      </>
                    ) : (
                      'CREATE & WAIT FOR OPPONENT'
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Join Challenge Modal */}
        <AnimatePresence>
          {isJoinOpen && selectedChallengeToJoin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 max-h-[calc(100vh-2rem)] md:max-h-[85vh] flex flex-col relative shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-blue-500" />
                    <h3 className="font-black text-lg text-white uppercase italic tracking-tight">Join Challenge</h3>
                  </div>
                  <button 
                    onClick={() => setIsJoinOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-1.5 -mr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase">CHALLENGER</p>
                      <p className="text-sm font-black text-white italic">{selectedChallengeToJoin.creator_username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase">ENTRY FEE</p>
                      <p className="text-sm font-bold text-amber-400">
                        {selectedChallengeToJoin.entry_type === 'free' ? 'FREE' : `$${selectedChallengeToJoin.entry_fee}`}
                      </p>
                    </div>
                  </div>

                  {selectedChallengeToJoin.entry_type === 'paid' && (
                    <div className="flex justify-between items-center text-xs p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                      <span className="text-zinc-500">Your Wallet Balance:</span>
                      <span className={cn("font-bold", walletBalance >= selectedChallengeToJoin.entry_fee ? "text-emerald-400" : "text-red-400")}>
                        ${walletBalance.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Badge Picker Selector */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">Choose your Arena Identity (Badge)</label>
                    {badgesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
                      </div>
                    ) : availableBadges.length === 0 ? (
                      <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">No team badges available.</p>
                    ) : (
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        {availableBadges.map((badge) => {
                          const isSel = joinBadgeId === badge.badge_id;
                          return (
                            <button
                              key={badge.badge_id}
                              type="button"
                              onClick={() => setJoinBadgeId(badge.badge_id)}
                              className={cn(
                                "aspect-square rounded-xl flex items-center justify-center p-1.5 border-2 transition-all cursor-pointer relative",
                                isSel ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
                              )}
                            >
                              <PlayerBadge 
                                badgeId={badge.badge_id} 
                                username={badge.badge_id} 
                                size="sm"
                                className="w-full h-full"
                              />
                              {isSel && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-medium">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleJoinChallenge}
                    disabled={submitting || badgesLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        JOINING ARENA...
                      </>
                    ) : (
                      'CONFIRM ENTRY & PLAY NOW'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
