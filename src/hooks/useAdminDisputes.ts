import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { matchResultService } from '../services/matchResultService';
import { DisputedMatch, ResolveDisputePayload } from '../types/verification.types';

export function useAdminDisputes(adminId: string) {
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [count, setCount] = useState(0);
  const [abandonedMatches, setAbandonedMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cutoff] = useState(() => new Date().toISOString());

  const loadDisputes = useCallback(async () => {
    if (!adminId) return;
    setIsLoading(true);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc('get_disputed_matches', {
        p_admin_id: adminId
      });

      if (rpcError) throw rpcError;

      const rpcData = data as any;

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

      const disputedList = (rpcData?.disputed || rpcData?.disputes || []).map((m: any) => mapMatch(m, 'disputed'));
      const awaitingList = (rpcData?.awaiting || []).map((m: any) => mapMatch(m, 'single_submission'));
      const abandonedList = (rpcData?.abandoned || []).map((m: any) => mapMatch(m, 'abandoned'));
      const historyList = (rpcData?.history || []).map((m: any) => mapMatch(m, 'completed'));

      const combined = [...disputedList, ...awaitingList, ...abandonedList, ...historyList];

      setDisputes(combined);
      setAbandonedMatches(abandonedList);
      
      const totalAlerts = (rpcData?.disputed_count ?? disputedList.length) + 
                          (rpcData?.awaiting_count ?? awaitingList.length) + 
                          (rpcData?.abandoned_count ?? abandonedList.length);
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
    isLoading,
    isResolving,
    error,
    loadDisputes,
    resolveDispute,
    sendReminder,
    forceApprove,
    abandonedMatches,
    disputedMatches: disputes.filter(d => d.verification_status === 'disputed'),
    singleSubmissionMatches: disputes.filter(d => d.verification_status === 'single_submission' || d.verification_status === 'awaiting_admin_review')
  };
}
