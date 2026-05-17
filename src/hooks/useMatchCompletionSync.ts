import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to synchronize UI components with match completions within a tournament.
 * Emits a refresh trigger when any match moves to a terminal state.
 */
export function useMatchCompletionSync(tournamentId: string | undefined) {
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase.channel(`match-sync-${tournamentId}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`
      }, (payload: any) => {
        const { new: newMatch, old: oldMatch } = payload;
        
        // Trigger condition: Match status changed to 'completed'
        // OR verification status changed to 'matched' or 'verified'
        const hasCompleted = newMatch.status === 'completed' && oldMatch.status !== 'completed';
        const hasVerified = (newMatch.verification_status === 'matched' || newMatch.verification_status === 'verified') && 
                            (oldMatch.verification_status !== 'matched' && oldMatch.verification_status !== 'verified');

        if (hasCompleted || hasVerified) {
          console.log(`[useMatchCompletionSync] Terminal state detected for match ${newMatch.id}. Triggering global sector refresh...`);
          setRefreshCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { refreshCount };
}
