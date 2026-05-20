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

  const loadDisputes = useCallback(async () => {
    if (!adminId) return;
    setIsLoading(true);
    try {
      const { data: disputeData, error: disputeError } = await supabase.from('matches')
        .select(`
          *,
          player1:profiles!matches_player1_fkey(id, username, avatar_url),
          player2:profiles!matches_player2_fkey(id, username, avatar_url),
          tournaments:tournament_id(name)
        `)
        .in('result_verification_status', ['disputed', 'single_submission']);

      if (disputeError) throw disputeError;

      const disputesList = (disputeData || []).map((m: any) => ({
        ...m,
        match_id: m.id,
        tournament_name: m.tournaments?.name,
        player1_username: m.player1?.username,
        player2_username: m.player2?.username,
        verification_status: m.result_verification_status,
        required_action: m.result_verification_status === 'disputed' 
          ? 'pick_winner_or_override' 
          : 'approve_or_reject_single_submission'
      }));

      const totalCount = disputesList.length;
      setDisputes(disputesList);

      // Fetch expired/abandoned matches in the past which have no submissions yet or has not completed
      const { data: expiredData, error: expiredError } = await supabase.from('matches')
        .select(`
          id,
          tournament_id,
          scheduled_at,
          player1,
          player2,
          result_verification_status
        `)
        .neq('status', 'completed')
        .neq('status', 'verified')
        .lt('scheduled_at', new Date().toISOString());

      if (expiredError) throw expiredError;

      const disputeMatchIds = new Set(disputesList.map((m: any) => m.match_id || m.id));
      const abandonedList = (expiredData || []).filter((m: any) => !disputeMatchIds.has(m.id));

      setAbandonedMatches(abandonedList);
      setCount(totalCount + abandonedList.length);
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
          // If verification status changed, reload disputes
          const oldStatus = (payload.old as any)?.result_verification_status;
          const newStatus = (payload.new as any)?.result_verification_status;
          if (oldStatus !== newStatus) {
            loadDisputes();
          }
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
    singleSubmissionMatches: disputes.filter(d => d.verification_status === 'single_submission')
  };
}
