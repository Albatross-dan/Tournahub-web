import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tournament } from '../types/database';
import { tournamentService } from '../services/tournamentService';

export function useRealtimeTournaments(status?: string | string[], limit?: number, columns?: string) {
  const [tournaments, setTournaments] = useState<(Tournament & { registrations_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const statusKey = Array.isArray(status) ? [...status].sort().join(',') : (status || 'all');

  useEffect(() => {
    const fetchInitial = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      
      const timeoutId = setTimeout(() => {
        if (!isBackground) {
          setLoading(false);
          console.warn(`[useRealtimeTournaments] Initial fetch timed out for ${statusKey}`);
        }
      }, 10000);
      
      try {
        console.log(`[useRealtimeTournaments] Fetching initial for ${statusKey}, limit: ${limit}`);
        const data = await tournamentService.getAll(status, limit, columns);
        console.log(`[useRealtimeTournaments] Success for ${statusKey}:`, data?.length, 'items');
        setTournaments(data as (Tournament & { registrations_count: number })[] || []);
      } catch (err) {
        console.error(`[useRealtimeTournaments] Error for ${statusKey}:`, err);
      } finally {
        clearTimeout(timeoutId);
        if (!isBackground) setLoading(false);
      }
    };

    fetchInitial(false);

    const channelName = `tournaments-${statusKey}-${limit || 'all'}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        (payload) => {
          const matchesStatus = (t: any) => {
            if (!status || status === 'all') return true;
            if (Array.isArray(status)) return status.includes(t.status);
            return t.status === status;
          };

          if (payload.eventType === 'INSERT') {
            const newTourney = payload.new as Tournament;
            if (matchesStatus(newTourney)) {
              // For inserts, we re-fetch to ensure we get the registrations_count correctly
              // or we could just append if we don't care about the count immediately
              fetchInitial(true);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTourney = payload.new as Tournament;
            setTournaments((prev) => {
              const existing = prev.find(t => t.id === updatedTourney.id);
              
              // Helper to extract count from various possible payload shapes
              const getCount = (obj: any) => {
                if (!obj) return existing?.registrations_count ?? 0;
                
                const countData = obj.registrations_count ?? obj.registrations ?? obj.tournament_players;
                if (Array.isArray(countData)) {
                  if (typeof countData[0] === 'number') return countData[0];
                  return countData[0]?.count ?? 0;
                }
                if (typeof countData === 'object' && countData !== null) return countData.count ?? 0;
                if (typeof countData === 'number') return countData;
                return existing?.registrations_count ?? 0;
              };

              const merged = {
                ...existing,
                ...updatedTourney,
                registrations_count: getCount(updatedTourney)
              } as any;

              if (existing) {
                if (matchesStatus(updatedTourney)) {
                  return prev.map((t) => (t.id === updatedTourney.id ? merged : t));
                } else {
                  return prev.filter((t) => t.id !== updatedTourney.id);
                }
              } else {
                if (matchesStatus(updatedTourney)) {
                   return [merged, ...prev];
                }
                return prev;
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setTournaments((prev) => prev.filter((t) => t.id !== payload.old.id));
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
        () => {
          // Re-fetch all to get latest counts from backend source of truth
          // Use background mode to avoid showing loading spinner to everyone
          fetchInitial(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusKey, limit, columns]);

  return { tournaments, loading };
}

export function useRealtimeTournament(id: string | undefined) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchInitial = async () => {
      setLoading(true);
      const timeoutId = setTimeout(() => {
        setLoading(false);
        console.warn(`[useRealtimeTournament] Fetch details timed out for ${id}`);
      }, 10000);
      
      try {
        console.log('Fetching tournament details for id:', id);
        const data = await tournamentService.getById(id);
        setTournament(data);
      } catch (err: any) {
        console.error('Error fetching tournament in hook:', err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`tournament-detail-${id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setTournament(payload.new as Tournament);
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
          setTournament(null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { tournament, loading };
}
