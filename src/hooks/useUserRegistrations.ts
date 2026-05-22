import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useUserRegistrations() {
  const { user, refetchSignal } = useAuth();
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setUserRegistrations(new Set());
      setLoading(false);
      return;
    }

    loadUserRegistrations();

    const channel = supabase
      .channel(`user-registrations-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUserRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchSignal]);

  async function loadUserRegistrations() {
    try {
      const { data, error } = await (supabase as any)
        .from('registrations')
        .select('tournament_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      const ids = new Set((data as any[])?.map(r => r.tournament_id).filter(Boolean) || []);
      setUserRegistrations(ids);
    } catch (err) {
      console.error('Error loading user registrations:', err);
    } finally {
      setLoading(false);
    }
  }

  return { userRegistrations, loading };
}
