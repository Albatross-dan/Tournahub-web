import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { matchResultService } from '../services/matchResultService';
import { DisputedMatch, ResolveDisputePayload } from '../types/verification.types';

export function useAdminDisputes(adminId: string) {
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [count, setCount] = useState(0);
  const [abandonedMatches, setAbandonedMatches] = useState<any[]>([]);
  const [noShowCount, setNoShowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cutoff] = useState(() => new Date().toISOString());

  const loadDisputes = useCallback(async () => {
    if (!adminId) return;
    setIsLoading(true);
    try {
      let pendingNoShowVal = 0;
      try {
        const { count: nsCount, error: nsErr } = await supabase
          .from('no_shows')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!nsErr && nsCount !== null) {
          pendingNoShowVal = nsCount;
        } else {
          const { count: fallbackCount } = await supabase
            .from('match_no_show_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');
          pendingNoShowVal = fallbackCount || 0;
        }
      } catch (e) {
        const { count: fallbackCount } = await supabase
          .from('match_no_show_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingNoShowVal = fallbackCount || 0;
      }

      // Query existing view v_match_verification_dashboard
      let dashboardMatches: any[] = [];
      try {
        const { data: dashData, error: dashErr } = await (supabase as any)
          .from('v_match_verification_dashboard')
          .select('*');

        if (dashErr) {
          console.error('[useAdminDisputes] Error selecting from v_match_verification_dashboard:', dashErr);
        } else if (dashData) {
          dashboardMatches = dashData.map((row: any) => {
            const matchId = row.match_id || row.id;

            const subs: any[] = [];
            if (row.sub_a_id) {
              subs.push({
                id: row.sub_a_id,
                username: row.sub_a_username || row.player1_username || 'Player 1',
                avatar_url: row.player1_avatar || null,
                score1: row.sub_a_score1,
                score2: row.sub_a_score2,
                player1_score: row.sub_a_score1,
                player2_score: row.sub_a_score2,
                screenshot_url: row.sub_a_screenshot || row.sub_a_screenshot_url || null,
                status: row.sub_a_status || 'submitted',
                created_at: row.sub_a_created_at || row.scheduled_at,
                admin_notes: row.sub_a_admin_notes
              });
            }
            if (row.sub_b_id) {
              subs.push({
                id: row.sub_b_id,
                username: row.sub_b_username || row.player2_username || 'Player 2',
                avatar_url: row.player2_avatar || null,
                score1: row.sub_b_score1,
                score2: row.sub_b_score2,
                player1_score: row.sub_b_score1,
                player2_score: row.sub_b_score2,
                screenshot_url: row.sub_b_screenshot || row.sub_b_screenshot_url || null,
                status: row.sub_b_status || 'submitted',
                created_at: row.sub_b_created_at || row.scheduled_at,
                admin_notes: row.sub_b_admin_notes
              });
            }

            let countdownState = row.countdown_state;
            if (!countdownState) {
              if (row.result_verification_status === 'abandoned' || subs.length === 0) {
                countdownState = 'abandoned';
              } else if (row.result_verification_status === 'awaiting_admin_review' || subs.length === 1) {
                countdownState = 'awaiting_review';
              } else if (row.result_verification_status === 'disputed' || subs.length === 2) {
                countdownState = 'disputed';
              } else {
                countdownState = 'needs_review';
              }
            }

            const verifStatus = row.result_verification_status || (
              countdownState === 'abandoned' ? 'abandoned' :
              countdownState === 'awaiting_review' ? 'awaiting_admin_review' :
              countdownState === 'disputed' ? 'disputed' : 'needs_review'
            );

            return {
              ...row,
              id: matchId,
              match_id: matchId,
              tournament_name: row.tournament_name || 'Tournament Match',
              tournament_type: row.tournament_type || 'Tournament',
              round: row.round,
              stage: row.stage,
              group_name: row.group_name,
              match_status: row.match_status,
              result_verification_status: verifStatus,
              verification_status: verifStatus,
              countdown_state: countdownState,
              scheduled_at: row.scheduled_at,
              play_window_end: row.play_window_end,
              submission_deadline: row.submission_deadline,
              player1_id: row.player1_id,
              player1_username: row.player1_username || 'TBD',
              player1_avatar: row.player1_avatar || null,
              player1: row.player1_id ? { id: row.player1_id, username: row.player1_username, avatar_url: row.player1_avatar } : null,
              player2_id: row.player2_id,
              player2_username: row.player2_username || 'TBD',
              player2_avatar: row.player2_avatar || null,
              player2: row.player2_id ? { id: row.player2_id, username: row.player2_username, avatar_url: row.player2_avatar } : null,
              winner_username: row.winner_username || null,
              submissions: subs,
              required_action: verifStatus === 'disputed' ? 'pick_winner_or_override' : 'approve_or_reject_single_submission'
            };
          });
        }
      } catch (dashException) {
        console.error('[useAdminDisputes] Exception querying v_match_verification_dashboard:', dashException);
      }

      // Legacy fallback RPC for completed/other lists
      let rpcData: any = {};
      try {
        const rpcResponse = await (supabase as any).rpc('get_disputed_matches', {
          p_admin_id: adminId
        });
        if (!rpcResponse.error && rpcResponse.data) {
          rpcData = rpcResponse.data;
        }
      } catch (e) {
        // Fallback ignored
      }

      setNoShowCount(pendingNoShowVal);

      const mapMatch = (m: any, defaultStatus: string) => {
        const isRpc = 'match_id' in m;
        const mId = isRpc ? m.match_id : m.id;
        const statusVal = m.verification_status || m.result_verification_status || defaultStatus;
        const player1Obj = isRpc ? { id: m.player1, username: m.player1_username } : m.player1;
        const player2Obj = isRpc ? { id: m.player2, username: m.player2_username } : m.player2;

        return {
          ...m,
          id: mId,
          match_id: mId,
          tournament_name: isRpc ? m.tournament_name : m.tournaments?.name,
          player1_username: isRpc ? m.player1_username : m.player1?.username,
          player2_username: isRpc ? m.player2_username : m.player2?.username,
          player1: player1Obj,
          player2: player2Obj,
          verification_status: statusVal,
          required_action: statusVal === 'disputed' 
            ? 'pick_winner_or_override' 
            : 'approve_or_reject_single_submission'
        };
      };

      const legacyDisputed = (rpcData?.disputed || rpcData?.disputes || []).map((m: any) => mapMatch(m, 'disputed'));
      const legacyAwaiting = (rpcData?.awaiting || []).map((m: any) => mapMatch(m, 'single_submission'));
      const legacyAbandoned = (rpcData?.abandoned || []).map((m: any) => mapMatch(m, 'abandoned'));
      const legacyHistory = (rpcData?.history || []).map((m: any) => mapMatch(m, 'completed'));

      // Merge dashboard matches with legacy matches avoiding duplicate IDs
      const existingIds = new Set(dashboardMatches.map(m => m.id));
      const extraLegacy = [...legacyDisputed, ...legacyAwaiting, ...legacyAbandoned, ...legacyHistory].filter(m => !existingIds.has(m.id));

      // Fetch 1v1 challenge disputes
      let challengeDisputesMapped: any[] = [];
      try {
        const { data: challengeMatchesData, error: chErr } = await supabase
          .from('challenge_matches')
          .select(`
            id,
            status,
            result_verification_status,
            score1,
            score2,
            result_deadline,
            player1_id,
            player2_id,
            challenge_id,
            challenges ( title, entry_type, prize_pool, currency ),
            player1:profiles!challenge_matches_player1_id_fkey (
              id, username, avatar_url
            ),
            player2:profiles!challenge_matches_player2_id_fkey (
              id, username, avatar_url
            ),
            challenge_match_results (
              id, submitted_by, player1_score, player2_score,
              screenshot_url, status, created_at
            )
          `)
          .in('status', ['disputed', 'in_progress'])
          .in('result_verification_status', ['disputed', 'pending'])
          .order('result_deadline', { ascending: true });

        const challengeMatches = challengeMatchesData as any[] | null;

        if (!chErr && challengeMatches && challengeMatches.length > 0) {
          challengeDisputesMapped = challengeMatches.map((c: any) => {
            const results = c.challenge_match_results || [];
            const subs = results.map((r: any) => {
              const isP1 = r.submitted_by === c.player1_id;
              const submitterProfile = isP1 ? c.player1 : c.player2;
              return {
                id: r.id,
                username: submitterProfile?.username || 'Unknown',
                avatar_url: submitterProfile?.avatar_url || null,
                score1: r.player1_score,
                score2: r.player2_score,
                player1_score: r.player1_score,
                player2_score: r.player2_score,
                screenshot_url: r.screenshot_url,
                status: r.status,
                created_at: r.created_at,
                is_canonical: r.is_active || false,
                disputed: r.disputed,
                dispute_reason: r.dispute_reason,
                admin_notes: r.admin_notes
              };
            });

            return {
              id: c.id,
              match_id: c.id,
              challenge_id: c.challenge_id,
              tournament_name: c.challenges?.title || '1v1 Challenge',
              tournament_type: '1v1',
              round: 1,
              stage: 'Challenge Match',
              verification_status: c.result_verification_status,
              match_status: c.status,
              player1_username: c.player1?.username || 'Unknown',
              player2_username: c.player2?.username || 'Unknown',
              player1: { id: c.player1_id, username: c.player1?.username },
              player2: { id: c.player2_id, username: c.player2?.username },
              winner_username: null,
              submissions: subs,
              is_challenge: true,
              required_action: c.result_verification_status === 'disputed' 
                ? 'pick_winner_or_override' 
                : 'approve_or_reject_single_submission'
            };
          });
        }
      } catch (err) {
        console.error('[useAdminDisputes] Exception fetching challenge disputes:', err);
      }

      const combined = [...dashboardMatches, ...extraLegacy, ...challengeDisputesMapped];

      setDisputes(combined);
      const abandonedCombined = combined.filter(m => m.countdown_state === 'abandoned' || m.verification_status === 'abandoned');
      setAbandonedMatches(abandonedCombined);
      
      const unresolvedCount = combined.filter(m => m.verification_status !== 'completed' && m.verification_status !== 'verified').length;
      const totalAlerts = unresolvedCount + pendingNoShowVal;
      setCount(totalAlerts);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
      setDisputes([]);
      setAbandonedMatches([]);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadDisputes();

    const channel = supabase
      .channel('admin_disputes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          const allowed = ['disputed', 'awaiting_admin_review', 'abandoned', 'single_submission'];
          const newStatus = (payload.new as any)?.result_verification_status;
          if (!newStatus || !allowed.includes(newStatus)) return;
          loadDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDisputes]);

  const resolveDispute = async (payload: ResolveDisputePayload) => {
    setIsResolving(true);
    try {
      await matchResultService.resolveDispute(payload);
      await loadDisputes();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve dispute');
      throw err;
    } finally {
      setIsResolving(false);
    }
  };

  const sendReminder = async (opponentId: string, matchId: string) => {
    try {
      await matchResultService.sendReminder({ opponentId, matchId });
    } catch (err: any) {
      console.error('[useAdminDisputes] Failed to send reminder:', err);
      throw err;
    }
  };

  const forceApprove = async (resultId: string, verifierId: string) => {
    setIsResolving(true);
    try {
      await matchResultService.verifyResult({
        verifierId,
        resultId,
        action: 'approve'
      });
      await loadDisputes();
    } catch (err: any) {
      setError(err.message || 'Failed to force approve');
      throw err;
    } finally {
      setIsResolving(false);
    }
  };

  return {
    disputes,
    count,
    noShowCount,
    isLoading,
    isResolving,
    error,
    loadDisputes,
    resolveDispute,
    sendReminder,
    forceApprove,
    abandonedMatches,
    disputedMatches: disputes.filter(d => d.verification_status === 'disputed' || d.verification_status === 'pending'),
    singleSubmissionMatches: disputes.filter(d => d.verification_status === 'single_submission' || d.verification_status === 'awaiting_admin_review')
  };
}
