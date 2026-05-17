import { supabase } from '../lib/supabase';
import { Tournament } from '../types/database';

export const tournamentService = {
  async getAll(status?: string | string[], limit?: number, columns: string = '*') {
    try {
      let query = (supabase as any).from('tournaments').select(columns);
      
      if (status && status !== 'all') {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }
      
      query = query.order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: tournaments, error } = await query;
      
      if (error) {
        console.error('[tournamentService] Error fetching tournaments:', error);
        return [];
      }
      
      if (!tournaments || (tournaments as any[]).length === 0) return [];

      // Fetch registration counts for these tournaments
      const tournamentIds = (tournaments as any[]).map(t => t.id);
      const { data: allRegs, error: regsError } = await (supabase as any)
        .from('registrations')
        .select('tournament_id, status')
        .in('tournament_id', tournamentIds);

      if (regsError) {
        console.error('[tournamentService] Error fetching registrations for counts:', regsError);
        return (tournaments as any[]).map(t => ({ ...t, registrations_count: 0 }));
      }

      return (tournaments as any[]).map(t => {
        const matchingRegs = (allRegs as any[])?.filter(r => r.tournament_id === t.id) || [];
        const count = matchingRegs.filter(r => 
          ['registered', 'approved', 'checked_in', 'waitlisted'].includes(r.status || '')
        ).length;
        
        return {
          ...t,
          registrations_count: count
        };
      });
    } catch (err) {
      console.error('[tournamentService] Critical failure in getAll:', err);
      return [];
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .select(`
          *,
          tournament_settings!left(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        const { data: simpleData, error: simpleError } = await (supabase as any)
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();
        if (simpleError) throw simpleError;
        return simpleData;
      }
      return data;
    } catch (err) {
      console.error('[tournamentService] Critical failure in getById:', err);
      throw err;
    }
  },

  async create(tournament: any) {
    const { data, error } = await (supabase as any)
      .from('tournaments')
      .insert(tournament)
      .select();
    
    if (error) {
      console.error('Supabase insert error details:', error);
      throw error;
    }
    return data ? data[0] : null;
  },

  async update(id: string, updates: Partial<Tournament>) {
    const { data, error } = await (supabase as any)
      .from('tournaments')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    try {
      console.log(`[tournamentService] Initiating purge for tournament: ${id}`);
      
      const { error } = await (supabase as any).rpc('purge_tournament', {
        p_tournament_id: id,
      });

      if (error) {
        console.error('[tournamentService] Purge RPC failed:', error);
        
        // Handle specific error message from backend if it returns the constraint message
        if (error.message?.includes('wallet or financial records')) {
           throw new Error('This tournament contains protected financial history and cannot be permanently deleted.');
        }
        
        throw error;
      }
      
      console.log(`[tournamentService] Tournament ${id} eradicated successfully.`);
    } catch (err: any) {
      console.error('[tournamentService] Critical failure during tournament purge:', err);
      throw err;
    }
  },

  async register(tournamentId: string, badgeId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be signed in to register.');

    try {
      console.log(`[tournamentService] Attempting registration for tournament ${tournamentId} with badge ${badgeId}`);
      
      const { data, error } = await (supabase as any).rpc('register_for_tournament', { 
        p_tournament_id: tournamentId,
        p_user_id: user.id,
        p_badge_id: badgeId
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already registered')) {
          return { success: true, status: 'registered', already_registered: true };
        }
        console.error('[tournamentService] Registration RPC failed:', error);
        
        if (error.message?.toLowerCase().includes('balance')) {
          throw new Error('insufficient_balance');
        }
        
        throw new Error(error.message || 'Registration failed');
      }

      const result = data as any;
      if (result?.success === false) {
        if (result.error?.toLowerCase().includes('already registered') || result.message?.toLowerCase().includes('already registered')) {
           return { success: true, status: result.status || 'registered', already_registered: true };
        }
        const err = new Error(result.error || 'Registration rejected');
        (err as any).code = result.code;
        throw err;
      }

      return { 
        success: true, 
        status: result?.status || 'registered',
        data: result
      };
    } catch (err: any) {
      console.error('[tournamentService] Registration process caught error:', err);
      throw err;
    }
  },

  async getRegistrationStatus(tournamentId: string, userId?: string) {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      targetUserId = user.id;
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_registration_status', {
        p_tournament_id: tournamentId,
        p_user_id: targetUserId
      } as any);

      if (error) {
        const { data: reg } = await (supabase as any)
          .from('registrations')
          .select('*, tournament_badge_selections(badge_id)')
          .eq('tournament_id', tournamentId)
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (reg) {
          const badgeSelections = (reg as any).tournament_badge_selections;
          const badgeId = Array.isArray(badgeSelections) ? badgeSelections[0]?.badge_id : badgeSelections?.badge_id;
          return {
            registered: true,
            waitlisted: (reg as any).status === 'waitlisted',
            user_status: (reg as any).status,
            registration_id: (reg as any).id,
            has_badge: !!badgeId,
            badge_id: badgeId
          };
        }
        return null;
      }
      return data;
    } catch (err) {
      console.error('[tournamentService] get_registration_status failed:', err);
      return null;
    }
  },

  async cancelRegistration(tournamentId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    try {
      const { data, error } = await (supabase as any).rpc('cancel_registration', {
        p_user_id: user.id,
        p_tournament_id: tournamentId
      } as any);

      if (error) {
         throw new Error(error.message || (data as any)?.error || 'Cancellation failed');
      }
      return { 
        success: (data as any)?.success ?? true, 
        refund_issued: (data as any)?.refund_issued,
        slot_filled: (data as any)?.slot_filled,
        data 
      };
    } catch (err: any) {
      console.error('[tournamentService] cancel_registration failed:', err);
      throw err;
    }
  },

  async closeRegistration(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('close_registration', { 
      p_tournament_id: tournamentId 
    } as any);
    if (error) throw error;
    return data;
  },

  async distributePrizes(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('distribute_prizes', { 
      p_tournament_id: tournamentId 
    } as any);
    if (error) throw error;
    return data;
  },

  async getRegistrations(tournamentId: string) {
    const { data, error } = await (supabase as any)
      .from('registrations')
      .select('*, profiles(*)')
      .eq('tournament_id', tournamentId)
      .in('status', ['registered', 'approved', 'checked_in', 'waitlisted']);
      
    if (error) throw error;
    
    // Return only the most recent unique registration for each user
    const unique = (data || []).reduce((acc: any[], current: any) => {
      const userId = current.user_id;
      const existing = acc.find(r => r.user_id === userId);
      if (!existing) {
        acc.push(current);
      } else if (new Date(current.created_at) > new Date(existing.created_at)) {
        // Keep the newer one if somehow two exist
        const idx = acc.indexOf(existing);
        acc[idx] = current;
      }
      return acc;
    }, []);
    
    return unique as any;
  },

  async getLeaderboard(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('get_tournament_leaderboard_with_prizes', { 
      p_tournament_id: tournamentId 
    } as any);
    if (error) throw error;
    
    // Handle both direct array or wrapped object { leaderboard: [] }
    const leaderboardRaw = Array.isArray(data) ? data : (data?.leaderboard || []);
    
    // Deduplicate leaderboard results just in case
    const seenIds = new Set();
    const leaderboard = leaderboardRaw.filter((p: any) => {
      const id = p.user_id || p.id;
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    
    return leaderboard as any[];
  },

  async getRegisteredPlayers(tournamentId: string) {
    try {
      const { data, error } = await (supabase as any).rpc('get_tournament_registered_players', {
        p_tournament_id: tournamentId
      });
      
      const players = data?.players || (Array.isArray(data) ? data : []);
      
      if (error || players.length === 0) {
        console.warn('[tournamentService] RPC returned no players, falling back to manual fetch');
        return this.getRegistrations(tournamentId);
      }
      return players;
    } catch (err) {
      console.error('[tournamentService] getRegisteredPlayers failed:', err);
      return this.getRegistrations(tournamentId);
    }
  },

  async getFixturesWithBadges(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('get_tournament_fixtures_with_badges', {
      p_tournament_id: tournamentId
    });
    if (error) {
      console.error('[tournamentService] getFixturesWithBadges failed:', error);
      throw error;
    }
    return data?.fixtures || [];
  },

  async listBadgesForPicker(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('list_badges_for_tournament_picker', {
      p_tournament_id: tournamentId
    });
    if (error) {
      console.warn('[tournamentService] list_badges_for_tournament_picker failed, trying old available badges RPC');
      return this.listAvailableBadges(tournamentId);
    }
    return data || [];
  },

  async listAvailableBadges(tournamentId: string) {
    // Legacy support
    const { data, error } = await (supabase as any).rpc('list_available_badges_for_tournament', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data || [];
  },

  async getMyBadge(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('get_my_badge_for_tournament', {
      p_tournament_id: tournamentId
    });
    if (error) {
      console.warn('[tournamentService] get_my_badge_for_tournament failed:', error);
      return { has_badge: false, badge_id: null };
    }
    return data || { has_badge: false, badge_id: null };
  },

  async selectBadge(tournamentId: string, badgeId: string, replace: boolean = false) {
    const { data, error } = await (supabase as any).rpc('select_badge_for_tournament', {
      p_tournament_id: tournamentId,
      p_badge_id: badgeId,
      p_replace: replace
    });
    
    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'Failed to select badge');
    }
    
    return data;
  }
};
