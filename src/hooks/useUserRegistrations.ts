import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to retrieve and cache the current user's direct tournament registration IDs.
 * Utilizes TanStack Query for caching and Supabase Realtime for instant synchronization.
 */
export function useUserRegistrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheKey = ['userRegistrations', user?.id || 'anonymous'];

  const fetchUserRegistrations = async (): Promise<Set<string>> => {
    if (!user?.id) return new Set<string>();
    
    console.log(`[Query Cache] Fetching registrations for user: ${user.id}`);
    const { data, error } = await (supabase as any)
      .from('registrations')
      .select('tournament_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('[useUserRegistrations Cache] Error loading user registrations:', error);
      throw error;
    }

    const ids = new Set((data as any[])?.map(r => r.tournament_id).filter(Boolean) || []);
    return ids;
  };

  const { data: userRegistrations = new Set<string>(), status: queryStatus } = useQuery({
    queryKey: cacheKey,
    queryFn: fetchUserRegistrations,
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds staleTime
    gcTime: 1000 * 60 * 60 * 2, // 2 hours garbage collection
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  // Maintain immediate postgres changes subscription
  useEffect(() => {
    if (!user?.id) return;

    const channelId = `realtime-user-regs-${user.id}-${Math.random().toString(36).substring(7)}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Realtime Sync] User registration changed in DB. Invalidating user registrations query...');
          queryClient.invalidateQueries({ queryKey: cacheKey });
          // Also invalidate tournaments to update player status
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, cacheKey]);

  const isLoading = queryStatus === 'pending' && userRegistrations.size === 0;

  return { 
    userRegistrations, 
    loading: isLoading 
  };
}
