import { useState, useRef } from 'react';
import { matchService } from '../services/matchService';

export function useSubmitResult(matchId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const submittingRef = useRef(false);

  const submit = async (score1: number, score2: number, screenshotPath: string | null) => {
    if (submittingRef.current) return;
    
    // Validation
    if (score1 < 0 || score2 < 0) {
      setSubmitError('Scores cannot be negative');
      return;
    }

    if (!screenshotPath) {
      setSubmitError('Screenshot is required');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await matchService.submitResult(matchId, score1, score2, screenshotPath);
      setSubmitResult(response);
      return response;
    } catch (err: any) {
      const msg = err.message || 'Failed to submit result';
      setSubmitError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return { submit, isSubmitting, submitError, submitResult };
}
