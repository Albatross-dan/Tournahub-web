import { ensureAuthenticated, supabase } from '../lib/supabase';
import { Tournament } from '../types/database';
import { getPublicIdentity } from '../lib/utils';

export const tournamentService = {
  async getAll(status?: string | string[], limit?: number, columns: string = '*') {
    try {
      // Proactive session check to ensure client-side headers are populated
      await ensureAuthenticated();

      // Direct table query is safer under strict RLS
      const targetTable = 'tournaments';
      let query = (supabase as any).from(targetTable).select(columns);
      
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
        console.warn('[tournamentService] Table query failed, falling back to view:', error);
        // Fallback to view
        const { data: viewData, error: viewError } = await (supabase as any)
          .from('v_tournaments_with_creator')
          .select(columns)
          .order('created_at', { ascending: false });
          
        if (viewError) throw viewError;
        return viewData || [];
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
          ['registered', 'approved', 'checked_in', 'pending', 'confirmed', 'waitlisted'].includes(r.status || '')
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
        const { data: viewData, error: viewError } = await (supabase as any)
          .from('v_tournaments_with_creator')
          .select(`
            *,
            tournament_settings!left(*)
          `)
          .eq('id', id)
          .single();
        if (viewError) throw viewError;
        return viewData;
      }
      return data;
    } catch (err) {
      console.error('[tournamentService] Critical failure in getById:', err);
      throw err;
    }
  },

  async create(tournament: any) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any)
      .from('tournaments')
      .insert(tournament)
      .select('id')
      .single();
    
    if (error) {
      console.error('Supabase insert error details:', error);
      // Log more context if it's a timeout
      if (error.message?.includes('database timed out') || error.message?.includes('connection timeout')) {
        console.error('[tournamentService] DATABASE TIMEOUT during create. This usually indicates complex RLS policies or slow triggers on the server.');
      }
      throw error;
    }
    return data;
  },

  async update(id: string, updates: Partial<Tournament>) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any)
      .from('tournaments')
      .update(updates as any)
      .eq('id', id)
      .select('id')
      .single();
    
    if (error) {
      if (error.message?.includes('database timed out') || error.message?.includes('connection timeout')) {
        console.error('[tournamentService] DATABASE TIMEOUT during update.');
      }
      throw error;
    }
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
    await ensureAuthenticated();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be signed in to register.');

    try {
      console.log(`[tournamentService] Attempting registration for tournament ${tournamentId} with badge ${badgeId}`);
      
      // Ensure profile exists first (proactive sync)
      const { data: ownProfile } = await (supabase as any).from('profiles').select('id, username').eq('id', user.id).maybeSingle();
      if (!ownProfile) {
        const metadataUsername = user.user_metadata?.username;
        const baseUsername = user.email?.split('@')[0] || 'user';
        const finalUsername = metadataUsername || `${baseUsername}_${user.id.slice(0, 4)}`;
        
        await (supabase as any).from('profiles').insert({
          id: user.id,
          username: finalUsername,
          role: 'user'
        });
      }

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
          .from('v_registrations_with_users')
          .select('*, tournament_badge_selections(badge_id)')
          .eq('tournament_id', tournamentId)
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (reg) {
          const badgeSelections = (reg as any).tournament_badge_selections;
          const badgeId = Array.isArray(badgeSelections) ? badgeSelections[0]?.badge_id : badgeSelections?.badge_id;
          return {
            registered: true,
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
      .from('v_registrations_with_users')
      .select('*')
      .eq('tournament_id', tournamentId)
      .in('status', ['registered', 'approved', 'checked_in', 'pending', 'confirmed', 'waitlisted']);
      
    if (error) throw error;
    
    // Return only the most recent unique registration for each user
    const unique = (data || []).reduce((acc: any[], current: any) => {
      const userId = current.user_id;
      // Also consider using current.id as fallback if user_id is missing
      const existing = acc.find(r => r.user_id === userId || (userId === null && r.id === current.id));
      
      // Flatten profile info (already joined in view)
      const flattened = {
        ...current,
        // username and avatar_url already in v_registrations_with_users
        username: current.username || 'User',
      };

      if (!existing) {
        acc.push(flattened);
      } else if (new Date(current.created_at) > new Date(existing.created_at)) {
        // Keep the newer one if somehow two exist
        const idx = acc.indexOf(existing);
        acc[idx] = flattened;
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
    const seenUsernames = new Set();
    const leaderboard = leaderboardRaw.filter((p: any) => {
      const username = p.username;
      if (!username || seenUsernames.has(username)) return false;
      seenUsernames.add(username);
      return true;
    });
    
    return leaderboard as any[];
  },

  async getRegisteredPlayers(tournamentId: string) {
    try {
      // 1. Fetch from RPC for specialized data (badges etc)
      const { data, error } = await (supabase as any).rpc('get_tournament_registered_players', {
        p_tournament_id: tournamentId
      });
      
      const rpcPlayers = data?.players || (Array.isArray(data) ? data : []);
      
      // 2. Fetch all registrations manually to ensure we didn't miss anyone
      const manualRegs = await this.getRegistrations(tournamentId);
      
      // 3. Merge them, preferring RPC data for duplicate entries
      const merged = [...manualRegs];
      rpcPlayers.forEach((rpcP: any) => {
        const userId = rpcP.user_id || rpcP.id;
        const idx = merged.findIndex(m => (m.user_id || m.id) === userId);
        
        // Ensure RPC data also has flattened fields
        const flattenedRpc = {
          ...rpcP,
          username: getPublicIdentity(rpcP)
        };

        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...flattenedRpc };
        } else {
          merged.push(flattenedRpc);
        }
      });
      
      return merged;
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
