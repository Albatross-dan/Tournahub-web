import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Tournament } from '../types/database';
import { tournamentService } from '../services/tournamentService';

/**
 * Custom hook with TanStack Query and Supabase Realtime synchronization.
 * Fetches and caches tournament listings with background revalidation.
 */
export function useRealtimeTournaments(status?: string | string[], limit?: number, columns?: string) {
  const queryClient = useQueryClient();
  const statusKey = Array.isArray(status) ? [...status].sort().join(',') : (status || 'all');
  const cacheKey = ['tournaments', statusKey, limit || 'all'];

  // Fetcher compliant with the tournament API
  const fetchTournaments = async () => {
    console.log(`[Query Cache] Fetching tournaments for key: ${statusKey}`);
    const res = await tournamentService.getAll(status, limit, columns);
    return res as (Tournament & { registrations_count?: number })[];
  };

  // React Query with smart caching policies
  const { data: tournaments = [], status: queryStatus, error, isFetching } = useQuery({
    queryKey: cacheKey,
    queryFn: fetchTournaments,
    staleTime: 1000 * 15, // 15 seconds staleTime
    gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  // Listen to Supabase Postgres changes and cleanly trigger query invalidations
  useEffect(() => {
    const channelId = `realtime-list-${statusKey}-${limit || 'all'}-${Math.random().toString(36).substring(7)}`;
    console.log(`[Realtime Sync] Plugging in tournament list channel: ${channelId}`);

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        async (payload) => {
          console.log(`[Realtime Sync] Tournament changed (${payload.eventType}). Invalidating list cache...`);
          
          // Invalidate listings
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });

          // If detail updated, invalidate specificity
          if (payload.new && (payload.new as any).id) {
            queryClient.invalidateQueries({ queryKey: ['tournament', (payload.new as any).id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations'
        },
        async (payload) => {
          console.log(`[Realtime Sync] Registration changed (${payload.eventType}). Invalidating list cache to update counts...`);
          
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });

          const tourId = (payload.new as any)?.tournament_id || (payload.old as any)?.tournament_id;
          if (tourId) {
            queryClient.invalidateQueries({ queryKey: ['tournament', tourId] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`[Realtime Sync] Closing tournament list channel: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [statusKey, limit, queryClient]);

  // Make sure we never block UI if we have cached tournaments from previous persistent load
  const isLoading = queryStatus === 'pending' && tournaments.length === 0;

  return { 
    tournaments, 
    loading: isLoading,
    isFetching,
    error
  };
}

/**
 * Custom hook with TanStack Query and Supabase Realtime synchronization.
 * Fetches and caches a specific tournament details with background revalidation.
 */
export function useRealtimeTournament(id: string | undefined) {
  const queryClient = useQueryClient();
  const cacheKey = ['tournament', id];

  const fetchTournament = async () => {
    if (!id) throw new Error('Tournament ID is undefined');
    console.log(`[Query Cache] Fetching tournament detail for: ${id}`);
    const res = await tournamentService.getById(id);
    return res as Tournament;
  };

  const { data: tournament = null, status: queryStatus, error, isFetching } = useQuery({
    queryKey: cacheKey,
    queryFn: fetchTournament,
    enabled: !!id,
    staleTime: 1000 * 5, // shorter staleTime for live tournament details page
    gcTime: 1000 * 60 * 60 * 4, // 4 hours details GC
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!id) return;

    const channelId = `realtime-detail-${id}-${Math.random().toString(36).substring(7)}`;
    console.log(`[Realtime Sync] Plugging in tournament details channel: ${channelId}`);

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('[Realtime Sync] Realtime detail update received. Updating local query state...');
          
          // Instant local cache merge before background query refreshes
          queryClient.setQueryData(cacheKey, (old: any) => {
            if (!old) return old;
            return {
              ...old,
              ...(payload.new as any),
            };
          });

          // Trigger invalidate & fetch in background
          queryClient.invalidateQueries({ queryKey: cacheKey });
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`
        },
        () => {
          console.log('[Realtime Sync] Tournament deleted. Revoking detail query cache...');
          queryClient.setQueryData(cacheKey, null);
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
      )
      .subscribe();

    return () => {
      console.log(`[Realtime Sync] Closing tournament details channel: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const isLoading = queryStatus === 'pending' && !tournament;

  return {
    tournament,
    loading: isLoading,
    isFetching,
    error
  };
}
