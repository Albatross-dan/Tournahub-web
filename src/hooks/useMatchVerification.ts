import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { matchResultService } from '../services/matchResultService';
import { MatchVerificationState, ResultSubmission } from '../types/verification.types';

export function useMatchVerification(matchId: string, currentUserId: string) {
  const [verificationState, setVerificationState] = useState<MatchVerificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const data = await matchResultService.getVerificationState(matchId);
      setVerificationState(data);
      if (data.verification_status === 'matched') {
        setAutoVerified(true);
      }
    } catch (err: any) {
      console.error('[useMatchVerification] Error refreshing state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    refreshState();

    const channel = supabase
      .channel(`match_verification_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          refreshState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refreshState]);

  const submitResult = async (score1: number, score2: number, screenshotUrl?: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const response = await matchResultService.submitResult({
        matchId,
        submitterId: currentUserId,
        score1,
        score2,
        screenshotUrl
      });

      if (response.error) {
        setSubmitError(response.error);
      } else {
        setSubmitSuccess(true);
        if (response.verification_status === 'matched') {
          setAutoVerified(true);
        }
        await refreshState();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUserSubmission = verificationState?.submissions.find(
    (s: ResultSubmission) => s.submitted_by === currentUserId
  );

  return {
    verificationState,
    isLoading,
    isSubmitting,
    submitError,
    submitSuccess,
    autoVerified,
    currentUserSubmission,
    hasCurrentUserSubmitted: !!currentUserSubmission,
    submitResult,
    refreshState
  };
}
