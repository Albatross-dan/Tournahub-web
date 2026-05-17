import { useState, useEffect, useRef, useCallback } from 'react';
import { matchService } from '../services/matchService';
import { supabase } from '../lib/supabase';

export function useMatchVerificationState(matchId: string) {
  const [state, setState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const serverTimeOffsetRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const data = await matchService.getMatchVerificationState(matchId);
      
      if (data && data.server_time) {
        // Compute serverTimeOffset = new Date(server_time) - Date.now()
        serverTimeOffsetRef.current = new Date(data.server_time).getTime() - Date.now();
      }
      
      setState(data);
      setError(null);
    } catch (err: any) {
      console.error('[useMatchVerificationState] Fetch failed:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchState(true);

    const channel = supabase.channel(`match-${matchId}`)
      .on('postgres_changes' as any, { 
        event: 'UPDATE', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => fetchState(), 200);
      })
      .on('postgres_changes' as any, { 
        event: 'INSERT', 
        table: 'match_results', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => fetchState(), 200);
      })
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchState]);

  return { 
    state, 
    isLoading, 
    error, 
    refetch: fetchState,
    serverTimeOffsetMs: serverTimeOffsetRef.current 
  };
}
