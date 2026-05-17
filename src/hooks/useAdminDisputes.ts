import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { matchResultService } from '../services/matchResultService';
import { DisputedMatch, ResolveDisputePayload } from '../types/verification.types';

export function useAdminDisputes(adminId: string) {
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    if (!adminId) return;
    setIsLoading(true);
    try {
      const result = await matchResultService.getDisputedMatches(adminId);
      const disputesList = result?.disputes || [];
      const totalCount = result?.count || 0;
      setDisputes(disputesList);
      setCount(totalCount);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
      setDisputes([]);
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
    disputedMatches: disputes.filter(d => d.verification_status === 'disputed'),
    singleSubmissionMatches: disputes.filter(d => d.verification_status === 'single_submission')
  };
}
