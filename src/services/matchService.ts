import { ensureAuthenticated, supabase } from '../lib/supabase';
import { Match } from '../types/database';

export const matchService = {
  async getByTournament(tournamentId: string) {
    try {
      await ensureAuthenticated();
      // Ensure we explicitly fetch group_name and stage for group-based tournaments
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *,
          group_name,
          stage,
          tournaments:tournament_id(name, status, type),
          player1:profiles!matches_player1_fkey(id, username, avatar_url),
          player2:profiles!matches_player2_fkey(id, username, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('stage', { ascending: false }) // 'playoffs' vs 'main'
        .order('group_name', { ascending: true, nullsFirst: false })
        .order('round', { ascending: true })
        .order('match_order', { ascending: true });
      
      if (error) {
        console.error('[matchService] Error in getByTournament:', error);
        return [];
      }
      return data as any[];
    } catch (err: any) {
      console.error('[matchService] Critical failure in getByTournament:', err);
      return [];
    }
  },

  async getById(id: string) {
    try {
      await ensureAuthenticated();
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments:tournament_id(*), 
          player1:profiles!matches_player1_fkey(*), 
          player2:profiles!matches_player2_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as any;
    } catch (err) {
      console.error('[matchService] Critical failure in getById:', err);
      throw err;
    }
  },

  async getUserMatches(userId: string) {
    try {
      // Ensure session is hydrated for RLS propagation
      await supabase.auth.getSession();
      
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments:tournament_id(*), 
          player1:profiles!matches_player1_fkey(id, username, avatar_url), 
          player2:profiles!matches_player2_fkey(id, username, avatar_url)
        `)
        .or(`player1.eq.${userId},player2.eq.${userId}`)
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as any[];
    } catch (err: any) {
      console.warn('[matchService] Critical failure in getUserMatches:', err);
      return [];
    }
  },

  async getConversations(userId: string) {
    try {
      // Query conversation participants table first to respect RLS
      const { data: participants, error: partError } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);
      
      if (partError) throw partError;
      if (!participants || participants.length === 0) return [];

      const convIds = participants.map((p: any) => p.conversation_id);

      const { data: conversations, error } = await (supabase as any)
        .from('match_conversations')
        .select(`
          *,
          matches:match_id (
            id,
            round,
            player1:profiles!matches_player1_fkey (id, username, avatar_url),
            player2:profiles!matches_player2_fkey (id, username, avatar_url),
            tournaments (name)
          )
        `)
        .in('id', convIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch last message and unread count for each using v_messages_with_sender (Security Invoker)
      const conversationsWithDetails = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          // Last message from view
          let { data: lastMessage } = await (supabase as any)
            .from('v_messages_with_sender')
            .select('content, created_at, sender_id, username')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Safe fallback direct query to the messages table if the view returns nothing
          if (!lastMessage) {
            const { data: rawMsg } = await (supabase as any)
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (rawMsg) {
              lastMessage = {
                content: rawMsg.content,
                created_at: rawMsg.created_at,
                sender_id: rawMsg.sender_id,
                username: 'Player'
              };
            }
          }

          // Unread count
          const { count } = await (supabase as any)
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .not('read_by', 'cs', `["${userId}"]`);

          return {
            ...conv,
            lastMessage,
            unreadCount: count || 0
          };
        })
      );

      return conversationsWithDetails;
    } catch (err) {
      console.error('[matchService] Fatal in getConversations:', err);
      return [];
    }
  },

  async submitResult(matchId: string, score1: number, score2: number, screenshotUrl: string | null) {
    await ensureAuthenticated();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Check if a match_results row already exists for this (match_id, submitted_by) that is not rejected.
    const { data: existingResults, error: checkError } = await (supabase as any)
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .eq('submitted_by', user.id)
      .neq('status', 'rejected');

    if (checkError) {
      throw new Error(`Failed to check existing submissions: ${checkError.message}`);
    }

    const existingRow = existingResults && existingResults.length > 0 ? existingResults[0] : null;

    if (existingRow) {
      if (existingRow.screenshot_url === null && screenshotUrl) {
        // PATCH that row to set screenshot_url = uploadData.path
        const { error: patchError } = await (supabase as any)
          .from('match_results')
          .update({ screenshot_url: screenshotUrl })
          .eq('id', existingRow.id);

        if (patchError) {
          throw new Error(`Failed to update screenshot: ${patchError.message}`);
        }
      }
      return { success: true, message: "Screenshot updated successfully for your existing submission." };
    } else {
      // If no row exists, INSERT with all required fields including screenshot_url.
      // We do this via the secure RPC (or direct upsert fallback).
      const { data, error } = await (supabase as any).rpc('submit_match_result', {
        p_match_id: matchId,
        p_submitter_id: user.id,
        p_player1_score: score1,
        p_player2_score: score2,
        p_screenshot_url: screenshotUrl || null
      });

      if (error) {
        // Fallback upsert
        const { error: insertError } = await (supabase as any)
          .from('match_results')
          .upsert({
            match_id: matchId,
            submitted_by: user.id,
            player1_score: score1,
            player2_score: score2,
            screenshot_url: screenshotUrl || null,
            status: 'submitted',
            submission_attempt: 1
          }, {
            onConflict: 'match_id,submitted_by'
          });

        if (insertError) {
          throw new Error(`Database submission error: ${insertError.message} (RPC error: ${error.message})`);
        }
        return { success: true };
      }

      if (data?.error) {
        const customErr: any = new Error(data.error);
        if (data.screenshot_required) {
          customErr.screenshot_required = true;
        }
        throw customErr;
      }

      return data;
    }
  },

  async getMatchVerificationState(matchId: string) {
    const { data, error } = await (supabase as any).rpc('get_match_verification_state', {
      p_match_id: matchId,
    });
    if (error) throw error;
    return data;
  },

  async getDisputedMatches(adminId: string) {
    const { data, error } = await (supabase as any).rpc('get_disputed_matches', {
      p_admin_id: adminId,
    });
    if (error) throw error;
    return data;
  },

  async resolveDispute(params: {
    adminId: string;
    matchId: string;
    winningSubId?: string;
    overrideScore1?: number;
    overrideScore2?: number;
    adminNotes?: string;
  }) {
    const rpcParams: any = {
      p_admin_id: params.adminId,
      p_match_id: params.matchId,
      p_admin_notes: params.adminNotes,
    };

    if (params.winningSubId) {
      rpcParams.p_winning_sub_id = params.winningSubId;
    } else {
      rpcParams.p_override_score1 = params.overrideScore1;
      rpcParams.p_override_score2 = params.overrideScore2;
    }

    const { data, error } = await (supabase as any).rpc('admin_resolve_dispute', rpcParams);
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getExistingSubmission(matchId: string, userId: string) {
    const { data: existing, error: existError } = await (supabase as any)
      .from('v_match_results')
      .select('*')
      .eq('match_id', matchId)
      .eq('submitted_by', userId)
      .not('status', 'in', '("rejected","disputed")')
      .maybeSingle();

    if (existError) {
      console.error('[matchService] Error fetching existing submission:', existError);
      return null;
    }
    return existing;
  },

  async getConversationId(matchId: string) {
    try {
      console.log(`[matchService] Initializing conversation for match: ${matchId}`);
      
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        console.error('[matchService] User not authenticated', userErr);
        return null;
      }

      const sessionData = await (supabase.auth as any).getSession();
      const accessToken = sessionData.data.session?.access_token;
      
      if (!accessToken) {
        console.error('[matchService] Access token missing');
        return null;
      }
      
      // Determine function URL
      let functionUrl: string;
      try {
        functionUrl = (supabase.functions as any).getUrl('createConversation');
      } catch (e) {
        const baseUrl = (supabase as any).functions?.url || `${(supabase as any).supabaseUrl}/functions/v1`;
        functionUrl = `${baseUrl}/createConversation`;
      }
      
      const url = new URL(functionUrl);
      url.searchParams.set('match_id', matchId);
      
      console.log(`[matchService] Establishing comms via Edge Function: ${url.toString()}`);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const payload = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        console.warn(`[matchService] Edge function failed (${res.status}), attempting DB fallback...`);
        throw new Error(payload?.message || `Edge function error (${res.status})`);
      }
      
      const conversationId = payload.conversation_id || payload.id;
      return { id: conversationId, ...payload };
    } catch (err) {
      console.warn('[matchService] Communication handshake failed, checking database records...', err);
      
      // 1. Check if conversation exists
      const { data: conv, error: convError } = await (supabase as any)
        .from('match_conversations')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (convError) console.error('[matchService] Conversation lookup error:', convError);

      // 2. Fetch match info for opponent lookup and tournament ID
      const { data: currentMatch } = await (supabase as any)
        .from('matches')
        .select('tournament_id, player1, player2')
        .eq('id', matchId)
        .maybeSingle();
      
      const { data: { user } } = await supabase.auth.getUser();

      let finalConv = conv;
      if (!conv && currentMatch && user) {
        console.warn('[matchService] No conversation record found. Manual initialization...');
        try {
          // Requirement: Use tournament_id if available, as the schema might require it
          const insertPayload: any = { match_id: matchId };
          
          if (currentMatch.tournament_id) {
            insertPayload.tournament_id = currentMatch.tournament_id;
          } else {
            console.error('[matchService] Match is missing tournament_id. This conversation might fail to save due to NOT NULL constraint on tournament_id.');
            // Attempt to find any active tournament as a fallback for stand-alone matches if schema allows
          }

          const { data: createdConv, error: createError } = await (supabase as any)
            .from('match_conversations')
            .insert(insertPayload)
            .select()
            .maybeSingle();
          
          if (!createError && createdConv) {
            finalConv = createdConv;
            
            // Try to add participants explicitly
            if (currentMatch.player1 || currentMatch.player2) {
              const participants = [];
              if (currentMatch.player1) participants.push({ conversation_id: finalConv.id, user_id: currentMatch.player1 });
              if (currentMatch.player2 && currentMatch.player2 !== currentMatch.player1) {
                participants.push({ conversation_id: finalConv.id, user_id: currentMatch.player2 });
              }
              
              if (participants.length > 0) {
                console.log('[matchService] Attempting to sync participants:', participants.length);
                const { error: partErr } = await (supabase as any).from('conversation_participants').insert(participants);
                if (partErr) {
                  console.warn('[matchService] Participant sync failed (likely RLS or recursion):', partErr.message);
                  // Non-fatal: if this fails, the match-level RLS should still allow the players to chat
                }
              }
            }
          } else if (createError) {
            console.error('[matchService] Failed to create conversation record:', createError);
          }
        } catch (createErr) {
          console.error('[matchService] Fallback creation exception:', createErr);
        }
      }

      if (!finalConv) return null;

      let opponent = null;
      if (currentMatch && user) {
        const opponentId = currentMatch.player1 === user.id ? currentMatch.player2 : currentMatch.player1;
        if (opponentId) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', opponentId)
            .maybeSingle();
          opponent = profile;
        }
      }

      return { 
        id: (finalConv as any).id,
        conversation_id: (finalConv as any).id,
        match_id: matchId,
        opponent 
      };
    }
  },

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    try {
      // 1. Check participants table
      const { data, error } = await (supabase as any)
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data && !error) return true;

      // 2. Fallback: Check match membership for this conversation
      // This is more robust as it relies on the match itself
      const { data: convData } = await (supabase as any)
        .from('match_conversations')
        .select('match_id')
        .eq('id', conversationId)
        .maybeSingle();
      
      if (convData?.match_id) {
        const { data: matchData } = await (supabase as any)
          .from('matches')
          .select('player1, player2')
          .eq('id', convData.match_id)
          .maybeSingle();
        
        if (matchData && (matchData.player1 === userId || matchData.player2 === userId)) {
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('[matchService] participant check failed:', err);
      return false;
    }
  },

  async loadMessages(conversationId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('v_messages_with_sender')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((m: any) => ({
        ...m,
        sender: {
          id: m.sender_id,
          username: m.username,
          avatar_url: m.avatar_url
        }
      }));
    } catch (err) {
      console.error('[matchService] Critical failure in loadMessages:', err);
      return [];
    }
  },

  async markAsRead(conversationId: string, userId: string) {
    try {
      await ensureAuthenticated();
      // Get all messages from this conversation not sent by user and not yet read by user
      const { data: unreadMessages } = await (supabase as any)
        .from('messages')
        .select('id, read_by')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .not('read_by', 'cs', `["${userId}"]`);

      if (!unreadMessages || unreadMessages.length === 0) return;

      // Update each message (Supabase doesn't support easy bulk JSONB update with current client syntax for array union)
      // We'll perform it in batches or just let RLS handle it if we have a function.
      // For now, simple loop for small amounts of messages
      await Promise.all(
        unreadMessages.map(async (msg: any) => {
          const currentReadBy = Array.isArray(msg.read_by) ? msg.read_by : [];
          if (!currentReadBy.includes(userId)) {
            await (supabase as any)
              .from('messages')
              .update({ read_by: [...currentReadBy, userId] })
              .eq('id', msg.id);
          }
        })
      );
    } catch (err) {
      console.error('[matchService] Error marking as read:', err);
    }
  },

  async sendMessage(conversation_id: string, message_type: string, content: string) {
    try {
      console.log('[matchService] PIPELINE START: Preparing message insert', { conversation_id, content, message_type });
      
      // Requirement 1: Retrieve authenticated user using getUser()
      await ensureAuthenticated();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      
      if (authError || !user) {
        console.error('[matchService] Auth retrieval failed or no user session:', authError);
        throw new Error('Authentication required: Failed to retrieve valid user ID from Supabase session.');
      }

      console.log('[matchService] Authenticated user confirmed:', user.id);

      // Requirement 2: Insert payload MUST use user.id (UUID), NOT "auth.uid()" literal string
      const payload = {
        conversation_id,
        sender_id: user.id, // REAL UUID
        content,
        message_type: message_type || 'text',
        read_by: [] // Ensure we provide a default for this column
      };

      console.log('[matchService] SUBMITTING INSERT:', payload);

      // Simplify select to avoid relationship hint issues on insert callback
      const { data, error } = await (supabase as any)
        .from('messages')
        .insert(payload)
        .select()
        .maybeSingle();
      
      if (error) {
        // Requirement 4: Explicit error logging
        console.error('[matchService] CRITICAL: Message insert failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Handle RLS failures specifically
        if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
          throw new Error(`PERMISSION DENIED: You are not authorized to send messages to this channel. Verify participant status.`);
        }
        throw new Error(`Insert failed: ${error.message} (Code: ${error.code})`);
      }
      
      if (!data) {
        console.warn('[matchService] Insert returned no data (likely RLS SELECT restriction)');
        // Fallback for RLS that allows INSERT but not immediate SELECT back
        return {
          id: `msg-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
          sender: { username: 'You' }
        };
      }

      // Add sender info back if we have it (since we did a simple select)
      const dataWithSender = {
        ...data,
        sender: { id: user.id, username: 'You' }
      };

      console.log('[matchService] PIPELINE SUCCESS: Message created in DB', data.id);
      return dataWithSender;
    } catch (err: any) {
      console.error('[matchService] PIPELINE FATAL:', err);
      throw err;
    }
  },

  async createMatch(match: any) {
    const { data, error } = await (supabase as any)
      .from('matches')
      .insert(match)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMatch(id: string, updates: Partial<Match>) {
    const { data, error } = await (supabase as any)
      .from('matches')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async submitNoShowReport(matchId: string, screenshotUrl: string, notes: string | null) {
    const { data, error } = await (supabase as any).rpc('submit_no_show_report', {
      p_match_id: matchId,
      p_screenshot_url: screenshotUrl,
      p_notes: notes
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async verifyResult(matchId: string, winnerId: string, score1: number, score2: number) {
    const { data, error } = await (supabase as any).rpc('verify_match_result_old', {
      p_match_id: matchId,
      p_winner_id: winnerId,
      p_score1: score1,
      p_score2: score2
    } as any);
    if (error) throw error;
    return data;
  },

  async adminVerifyResult(resultId: string, verifierId: string, action: 'approve' | 'reject', adminNotes?: string) {
    const { data, error } = await (supabase as any).rpc('verify_match_result', {
      p_result_id: resultId,
      p_verifier_id: verifierId,
      p_action: action,
      p_admin_notes: adminNotes
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async scheduleMatch(matchId: string, scheduledAt: string, adminId: string) {
    const { data, error } = await (supabase as any).rpc('schedule_match', {
      p_match_id: matchId,
      p_scheduled_at: scheduledAt,
      p_admin_id: adminId
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async batchScheduleMatches(matchIds: string[], scheduledAt: string, adminId: string) {
    const { data, error } = await (supabase as any).rpc('batch_schedule_matches', {
      p_match_ids: matchIds,
      p_scheduled_at: scheduledAt,
      p_admin_id: adminId
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async transitionScheduledMatches() {
    const { data, error } = await (supabase as any).rpc('transition_scheduled_matches');
    if (error) throw error;
    return data;
  },

  async getMatchResult(matchId: string) {
    const { data, error } = await (supabase as any)
      .from('v_match_results')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'submitted')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async generateFixtures(tournamentId: string, type: string) {
    let rpcName = 'generate_fixtures';
    
    // Exact mapping based on backend PDF capabilities
    if (type === 'knockout') {
      rpcName = 'generate_knockout_fixtures';
    } else if (type === 'swiss') {
      rpcName = 'fn_generate_swiss_round';
    } else if (type === 'group_stage' || type === 'hybrid') {
      // fn_generate_group_stage is the robust entry point for group + playoff setup
      rpcName = 'fn_generate_group_stage';
    } else if (type === 'league') {
      rpcName = 'generate_group_fixtures';
    }

    const { data, error } = await (supabase as any).rpc(rpcName, {
      p_tournament_id: tournamentId
    });
    
    if (error) {
      console.error(`[matchService] ${rpcName} RPC error:`, error);
      
      // Fallback for standard generate_fixtures if specialized fails (safety)
      if (rpcName !== 'generate_fixtures') {
        console.warn(`[matchService] Falling back to generic generate_fixtures for ${type}`);
        const retry = await (supabase as any).rpc('generate_fixtures', {
          p_tournament_id: tournamentId
        });
        if (retry.error) throw retry.error;
        return retry.data;
      }
      
      throw error;
    }
    return data;
  },

  async qualifyAndGeneratePlayoffs(tournamentId: string) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('fn_qualify_and_generate_playoffs', {
      p_tournament_id: tournamentId
    });
    if (error) {
      console.error('[matchService] qualifyAndGeneratePlayoffs RPC error:', error);
      throw error;
    }
    return data;
  },

  async advanceBracket(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('generate_next_round', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data;
  },

  async getUserStats(userId: string) {
    const { data, error } = await (supabase as any)
      .from('matches')
      .select('status, winner')
      .or(`player1.eq.${userId},player2.eq.${userId}`)
      .eq('status', 'completed');
    
    if (error) throw error;
    
    const records = (data || []) as any[];
    const totalMatches = records.length;
    const wins = records.filter(m => m.winner === userId).length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    
    return {
      totalMatches,
      wins,
      winRate
    };
  },

  async getFixturesWithBadges(tournamentId: string) {
    const { data, error } = await supabase
      .from('v_fixtures_with_badges' as any)
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('stage', { ascending: true })
      .order('group_name', { ascending: true, nullsFirst: false })
      .order('round', { ascending: true });
    
    if (error) throw error;
    const fixturesList = (data || []) as any[];
    const seen = new Set();
    const uniqueFixtures = [];
    for (const f of fixturesList) {
      if (!f) continue;
      const id = f.match_id || f.id;
      if (id) {
        if (!seen.has(id)) {
          seen.add(id);
          uniqueFixtures.push(f);
        }
      } else {
        uniqueFixtures.push(f);
      }
    }
    return uniqueFixtures;
  },

  async getStandingsWithBadges(tournamentId: string) {
    const { data, error } = await supabase
      .from('v_standings_with_badges' as any)
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false })
      .order('goal_difference', { ascending: false });
    
    if (error) throw error;
    return (data || []) as any[];
  }
};
