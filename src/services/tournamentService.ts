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
      
      // Let's fetch registrations, standings, and matches in parallel to compile accurate, consistent counts
      const [regsRes, standingsRes, matchesRes] = await Promise.all([
        (supabase as any).from('registrations').select('tournament_id, status, user_id').in('tournament_id', tournamentIds),
        (supabase as any).from('standings').select('tournament_id, player_id').in('tournament_id', tournamentIds),
        (supabase as any).from('matches').select('tournament_id, player1, player2').in('tournament_id', tournamentIds)
      ]);

      const allRegs = regsRes.data || [];
      const allStandings = standingsRes.data || [];
      const allMatches = matchesRes.data || [];

      return (tournaments as any[]).map(t => {
        const uniqueUserIds = new Set<string>();

        // 1. Add active registrations
        allRegs
          .filter(r => r.tournament_id === t.id && ['registered', 'approved', 'checked_in', 'pending', 'confirmed', 'waitlisted'].includes(r.status || ''))
          .forEach(r => {
            if (r.user_id) uniqueUserIds.add(r.user_id);
          });

        // 2. Add players from standings
        allStandings
          .filter(s => s.tournament_id === t.id)
          .forEach(s => {
            const pId = s.player_id;
            if (pId) uniqueUserIds.add(pId);
          });

        // 3. Add players from matches (fixtures)
        allMatches
          .filter(m => m.tournament_id === t.id)
          .forEach(m => {
            if (m.player1 && m.player1 !== '00000000-0000-0000-0000-000000000000') {
              uniqueUserIds.add(m.player1);
            }
            if (m.player2 && m.player2 !== '00000000-0000-0000-0000-000000000000') {
              uniqueUserIds.add(m.player2);
            }
          });

        const count = uniqueUserIds.size;
        
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

  async create(tournament: any, doubleRoundRobin?: boolean) {
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

    // Insert or upsert settings
    if (data?.id) {
      const { error: settingsError } = await (supabase as any)
        .from('tournament_settings')
        .upsert({
          tournament_id: data.id,
          format: tournament.type || 'league',
          double_round_robin: doubleRoundRobin ?? false,
          points_win: 3,
          points_draw: 1,
          points_loss: 0
        }, { onConflict: 'tournament_id' });
      if (settingsError) {
        console.error('Error upserting tournament settings on create:', settingsError);
      }
    }

    return data;
  },

  async update(id: string, updates: Partial<Tournament>, doubleRoundRobin?: boolean) {
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

    if (doubleRoundRobin !== undefined) {
      const { error: settingsError } = await (supabase as any)
        .from('tournament_settings')
        .upsert({
          tournament_id: id,
          format: updates.type || 'league',
          double_round_robin: doubleRoundRobin,
          points_win: 3,
          points_draw: 1,
          points_loss: 0
        }, { onConflict: 'tournament_id' });
      if (settingsError) {
        console.error('Error upserting tournament settings on update:', settingsError);
      }
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
        
        await (supabase as any).from('profiles').upsert({
          id: user.id,
          username: finalUsername
        }, { onConflict: 'id' });
      }

      // Attempt 3-parameter RPC first, and fall back to 2-parameter if signature is not found
      let data = null;
      let error = null;

      try {
        const res = await (supabase as any).rpc('register_for_tournament', { 
          p_tournament_id: tournamentId,
          p_user_id: user.id,
          p_badge_id: badgeId
        });
        data = res.data;
        error = res.error;
      } catch (rpcErr: any) {
        error = rpcErr;
      }

      const isSignatureError = error && (
        (error as any).code === '42883' ||
        (error as any).code?.includes('PGRST111') ||
        (error as any).message?.toLowerCase().includes('does not exist') ||
        (error as any).message?.toLowerCase().includes('could not find') ||
        (error as any).message?.toLowerCase().includes('signature')
      );

      if (isSignatureError) {
        console.log('[tournamentService] 3-parameter register_for_tournament not found in database. Falling back to 1/2-parameter version.');
        const resFallback = await (supabase as any).rpc('register_for_tournament', { 
          p_tournament_id: tournamentId,
          p_user_id: user.id
        });
        
        data = resFallback.data;
        error = resFallback.error;

        if (!error) {
          const result = data as any;
          if (result && result.success !== false) {
            // Register succeeded with fallback, now select the badge
            try {
              console.log('[tournamentService] Fallback registration success, applying selected badge:', badgeId);
              await this.selectBadge(tournamentId, badgeId, true);
            } catch (badgeErr) {
              console.warn('[tournamentService] Optional post-registration badge selection failed (could be already selected/optional):', badgeErr);
            }
          }
        }
      }

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
      let rpcPlayers: any[] = [];
      try {
        const { data, error } = await (supabase as any).rpc('get_tournament_registered_players', {
          p_tournament_id: tournamentId
        });
        if (!error && data) {
          rpcPlayers = data.players || (Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('[tournamentService] get_tournament_registered_players RPC failed:', err);
      }
      
      // 2. Fetch manual registrations
      let manualRegs: any[] = [];
      try {
        manualRegs = await this.getRegistrations(tournamentId);
      } catch (err) {
        console.warn('[tournamentService] failed to fetch manual registrations from v_registrations_with_users:', err);
      }

      // 3. Fetch badge selections for this tournament to ensure we have the correct chosen badge
      const badgeMapByUserId: Record<string, string> = {};
      try {
        const { data: badgeData } = await supabase
          .from('tournament_badge_selections')
          .select('user_id, badge_id')
          .eq('tournament_id', tournamentId);
        
        if (badgeData) {
          badgeData.forEach((item: any) => {
            if (item.user_id && item.badge_id) {
              badgeMapByUserId[item.user_id] = item.badge_id;
            }
          });
        }
      } catch (err) {
        console.warn('[tournamentService] failed to fetch badge selections:', err);
      }

      // Use a Map to temporarily hold players by a unique identifier (ID first, username lowercased next)
      // Since some records might have only temporary IDs, we merge carefully
      const playersMap = new Map<string, any>();

      // A helper to register a player in the map and resolve their fields
      const addOrMergePlayer = (player: any) => {
        if (!player) return;
        
        // Find if they have a real UUID
        let uId = player.user_id || player.id;
        if (uId && typeof uId === 'string' && uId.startsWith('temp-')) {
          uId = null;
        }

        const usernameObj = player.username || player.profiles?.username || 'Contender';
        const usernameStr = (typeof usernameObj === 'string' ? usernameObj : 'Contender').trim();
        const usernameClean = usernameStr.toLowerCase();

        // Check if we already have this user in playersMap by:
        // a) UUID
        // b) Username (case-insensitive)
        let existingKey: string | null = null;
        if (uId && playersMap.has(uId)) {
          existingKey = uId;
        } else {
          // Search map for any record with matching lowercased username
          for (const [key, val] of playersMap.entries()) {
            if (val.username?.toLowerCase().trim() === usernameClean) {
              existingKey = key;
              break;
            }
          }
        }

        const existing = existingKey ? playersMap.get(existingKey) : null;

        // Resolve badge_id
        let resolvedBadgeId = player.badge_id || (existing ? existing.badge_id : null);
        if (uId && badgeMapByUserId[uId]) {
          resolvedBadgeId = badgeMapByUserId[uId];
        } else if (existing && existing.user_id && badgeMapByUserId[existing.user_id]) {
          resolvedBadgeId = badgeMapByUserId[existing.user_id];
        }

        const merged = {
          user_id: uId || (existing ? existing.user_id : null),
          id: uId || (existing ? existing.id : player.id) || (existing ? existing.user_id : null) || `temp-${Math.random()}`,
          username: usernameStr !== 'Contender' && usernameStr !== 'User' && usernameStr !== 'Anonymous' ? usernameStr : (existing ? existing.username : usernameStr),
          avatar_url: player.avatar_url || (existing ? existing.avatar_url : null),
          badge_id: resolvedBadgeId,
          status: player.status || (existing ? existing.status : 'registered'),
          registration_status: player.registration_status || player.status || (existing ? existing.registration_status : 'Registered')
        };

        const targetKey = merged.user_id || merged.username.toLowerCase();
        
        // If there was an existing record under a different key (e.g. temp- key when UUID is now found), delete old one
        if (existingKey && existingKey !== targetKey) {
          playersMap.delete(existingKey);
        }

        playersMap.set(targetKey, merged);
      };

      // Now add/merge players from all sources:
      
      // A. Add manual registrations
      (manualRegs || []).forEach(m => {
        addOrMergePlayer({
          user_id: m.user_id,
          id: m.id || m.user_id,
          username: m.username,
          avatar_url: m.avatar_url,
          badge_id: m.badge_id,
          status: m.status,
          registration_status: m.registration_status || m.status
        });
      });

      // B. Add RPC players
      (rpcPlayers || []).forEach(rpcP => {
        addOrMergePlayer({
          user_id: rpcP.user_id || rpcP.id,
          id: rpcP.id || rpcP.user_id,
          username: rpcP.username || getPublicIdentity(rpcP),
          avatar_url: rpcP.avatar_url,
          badge_id: rpcP.badge_id,
          status: rpcP.status,
          registration_status: rpcP.registration_status || rpcP.status
        });
      });

      // C. Extract from fixtures
      try {
        const fixtures = await this.getFixturesWithBadges(tournamentId);
        if (fixtures && fixtures.length > 0) {
          fixtures.forEach((f: any) => {
            if (f.player1 && f.player1 !== '00000000-0000-0000-0000-000000000000') {
              addOrMergePlayer({
                user_id: f.player1,
                id: f.player1,
                username: f.player1_username,
                avatar_url: f.player1_avatar,
                badge_id: f.player1_badge_id,
                status: 'registered',
                registration_status: 'Registered'
              });
            }
            if (f.player2 && f.player2 !== '00000000-0000-0000-0000-000000000000') {
              addOrMergePlayer({
                user_id: f.player2,
                id: f.player2,
                username: f.player2_username,
                avatar_url: f.player2_avatar,
                badge_id: f.player2_badge_id,
                status: 'registered',
                registration_status: 'Registered'
              });
            }
          });
        }
      } catch (fixtureErr) {
        console.warn('[tournamentService] Failed to extract tournament players from fixtures in getRegisteredPlayers:', fixtureErr);
      }

      // D. Extract from standings (group stage)
      try {
        const { data: standingsData } = await supabase
          .from('standings')
          .select('*, profiles(id, username, avatar_url)')
          .eq('tournament_id', tournamentId);
        
        if (standingsData && standingsData.length > 0) {
          standingsData.forEach((st: any) => {
            const uId = st.player_id || st.profiles?.id;
            if (uId || st.profiles?.username) {
              addOrMergePlayer({
                user_id: uId,
                id: uId,
                username: st.profiles?.username,
                avatar_url: st.profiles?.avatar_url,
                badge_id: st.badge_id || null,
                status: 'registered',
                registration_status: 'Registered'
              });
            }
          });
        }
      } catch (standingsErr) {
        console.warn('[tournamentService] Failed to extract tournament players from standings in getRegisteredPlayers:', standingsErr);
      }

      // Finally, clean up any generic/unknown usernames if they have no badge/no valid fields,
      // and ensure everyone has their correct badge_id from the badgeMapByUserId.
      const finalPlayers = Array.from(playersMap.values()).map(p => {
        let badgeId = p.badge_id;
        if (p.user_id && badgeMapByUserId[p.user_id]) {
          badgeId = badgeMapByUserId[p.user_id];
        }
        return {
          ...p,
          badge_id: badgeId
        };
      });

      return finalPlayers as any[];
    } catch (err) {
      console.error('[tournamentService] getRegisteredPlayers failed:', err);
      let fallbackMerged: any[] = [];
      try {
        fallbackMerged = await this.getRegistrations(tournamentId);
      } catch (rErr) {
        fallbackMerged = [];
      }
      return fallbackMerged;
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
    const fixturesList = Array.isArray(data) ? data : (data?.fixtures || []);
    const seen = new Set();
    const uniqueFixtures = [];
    for (const f of fixturesList) {
      if (!f) continue;
      
      const p1Id = f.player1 || f.player1_username || '';
      const p2Id = f.player2 || f.player2_username || '';
      const sortedPlayers = [p1Id, p2Id].sort().join('-');
      const matchKey = `${f.stage || ''}-${f.round || ''}-${f.group_name || ''}-${sortedPlayers}`;

      if (!seen.has(matchKey)) {
        seen.add(matchKey);
        uniqueFixtures.push(f);
      }
    }
    return uniqueFixtures;
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
