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
    const { error } = await (supabase as any).from('tournaments').delete().eq('id', id);
    if (error) throw error;
  },

  async register(tournamentId: string, badgeId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be signed in to register.');

    try {
      // 1. Attempt registration via RPC
      // Trying with 'badge_id' instead of 'p_badge_id' if needed, or falling back
      const { data, error } = await (supabase as any).rpc('register_for_tournament', { 
        p_user_id: user.id,
        p_tournament_id: tournamentId,
        p_badge_id: badgeId
      } as any);

      if (error) {
        console.warn('[tournamentService] Primary registration RPC failed, trying fallback:', error);
        
        // If the error is "function not found", it might be an older signature or separate steps are needed
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
           // Fallback: Register for tournament (base) and then insert badge selection
           // Assuming a base register_for_tournament exists or we handle it via direct insert if policy allows
           const { data: regData, error: regError } = await (supabase as any).from('registrations').insert({
             tournament_id: tournamentId,
             user_id: user.id,
             status: 'registered'
           }).select().single();

           if (regError) {
             if (regError.code === '23505') throw new Error('Already registered for this tournament.');
             throw regError;
           }

           // 2. Insert badge selection directly as per user request B
           const { error: badgeError } = await (supabase as any)
             .from('tournament_badge_selections')
             .insert({
               tournament_id: tournamentId,
               user_id: user.id,
               badge_id: badgeId
             });

           if (badgeError) {
             if (badgeError.code === '23505') throw new Error('This badge is already taken by another player in this tournament.');
             throw badgeError;
           }

           return { success: true, status: 'registered' };
        }
        
        // Handle unique constraint violation for badge selection (Postgres code 23505)
        if (error.code === '23505' || error.message?.includes('tournament_badge_selections') || error.message?.includes('badge_id')) {
          throw new Error('This badge is already taken by another player in this tournament.');
        }
        
        throw new Error(error.message || 'Registration failed');
      }

      // 2. Handle business logic success/failure from function return
      const result = data as any;
      if (result && result.success === false) {
        throw new Error(result.message || 'Registration rejected by arena system.');
      }

      return { 
        success: true, 
        status: result?.status || 'registered',
        data: result
      };
    } catch (err: any) {
      if (err.message?.includes('23505') || err.message?.includes('duplicate key')) {
        throw new Error('This badge is already taken by another player in this tournament.');
      }
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
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (reg) {
          return {
            registered: true,
            waitlisted: (reg as any).status === 'waitlisted',
            user_status: (reg as any).status,
            registration_id: (reg as any).id
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
      .eq('tournament_id', tournamentId);
    if (error) throw error;
    return data as any;
  }
};
