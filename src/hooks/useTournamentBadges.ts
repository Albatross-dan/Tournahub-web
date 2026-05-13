import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTournamentBadges(tournamentId: string | undefined) {
  const [badges, setBadges] = useState<Record<string, string>>({}); // user_id -> badge_image_url
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    async function loadBadges() {
      try {
        setLoading(true);
        // Fetch badge selections for this tournament
        // badge_id in this table is the filename (text)
        const { data, error } = await supabase
          .from('tournament_badge_selections')
          .select('user_id, badge_id')
          .eq('tournament_id', tournamentId);
          
        if (error) throw error;
        
        const badgeMap = (data || []).reduce((acc: Record<string, string>, item: any) => {
          acc[item.user_id] = item.badge_id;
          return acc;
        }, {});
        
        setBadges(badgeMap);
      } catch (err) {
        console.error('Error loading tournament badges:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBadges();

    // Subscribe to changes in badge selections for real-time updates
    const channel = supabase
      .channel(`tournament-badges-${tournamentId}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => loadBadges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { badges, loading };
}
