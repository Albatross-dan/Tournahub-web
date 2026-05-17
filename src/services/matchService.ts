import { supabase } from '../lib/supabase';
import { Match } from '../types/database';

export const matchService = {
  async getByTournament(tournamentId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *,
          tournaments(*) as tournament,
          player1:profiles!matches_player1_fkey(id, username, avatar_url),
          player2:profiles!matches_player2_fkey(id, username, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('bracket_slot', { ascending: true })
        .order('match_order', { ascending: true });
      
      if (error) {
        const { data: simpleData, error: simpleError } = await (supabase as any)
          .from('matches')
          .select(`
            *,
            tournaments(*) as tournament,
            player1:profiles!matches_player1_fkey(id, username, avatar_url),
            player2:profiles!matches_player2_fkey(id, username, avatar_url)
          `)
          .eq('tournament_id', tournamentId)
          .order('round', { ascending: true });
        
        if (simpleError) {
          const { data: noProfilesData, error: noProfilesError } = await (supabase as any)
            .from('matches')
            .select('*, tournaments(*) as tournament')
            .eq('tournament_id', tournamentId)
            .order('round', { ascending: true });
          
          if (noProfilesError) throw noProfilesError;
          
          if (noProfilesData && (noProfilesData as any[]).length > 0) {
            const playerIds = Array.from(new Set(
              (noProfilesData as any[]).flatMap(m => [m.player1, m.player2]).filter(Boolean)
            ));
            
            if (playerIds.length > 0) {
              const { data: profileData } = await (supabase as any)
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', playerIds);
              
              const profileMap = (profileData || []).reduce((acc: any, p: any) => {
                acc[p.id] = p;
                return acc;
              }, {});

              return (noProfilesData as any[]).map(m => ({
                ...m,
                player1: profileMap[m.player1] || m.player1,
                player2: profileMap[m.player2] || m.player2
              }));
            }
          }
          return noProfilesData as any[];
        }
        return simpleData as any[];
      }
      return data as any[];
    } catch (err: any) {
      console.error('[matchService] Critical failure in getByTournament:', err);
      return [];
    }
  },

  async getById(id: string) {
    try {
      // 1. Try most descriptive join
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments(*) as tournament, 
          player1:profiles!matches_player1_fkey(*), 
          player2:profiles!matches_player2_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (!error && data) return data as any;

      // 2. Try simpler joins if fallback 1 failed
      const { data: simpleData, error: simpleError } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments(*) as tournament, 
          player1:profiles(id, username, avatar_url), 
          player2:profiles(id, username, avatar_url)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (!simpleError && simpleData) return simpleData as any;

      // 3. Absolute fallback: No joins for profiles, link manually
      const { data: rawData, error: rawError } = await (supabase as any)
        .from('matches')
        .select('*, tournaments(*) as tournament')
        .eq('id', id)
        .maybeSingle();

      if (rawError) throw rawError;
      if (!rawData) return null;

      const playerIds = [rawData.player1, rawData.player2].filter(Boolean);
      if (playerIds.length > 0) {
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', playerIds);
        
        const profileMap = (profileData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        return {
          ...rawData,
          player1: profileMap[rawData.player1] || { id: rawData.player1 },
          player2: profileMap[rawData.player2] || { id: rawData.player2 }
        };
      }

      return rawData;
    } catch (err) {
      console.error('[matchService] Critical failure in getById:', err);
      throw err;
    }
  },

  async getUserMatches(userId: string) {
    try {
      // 1. Try primary join with hinted foreign keys
      const { data, error } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments(*) as tournament, 
          player1:profiles!matches_player1_fkey(id, username, avatar_url), 
          player2:profiles!matches_player2_fkey(id, username, avatar_url)
        `)
        .or(`player1.eq.${userId},player2.eq.${userId}`)
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      
      if (!error && data) return data as any[];

      // 2. Try simpler join if hint fails
      const { data: secondTry, error: secondError } = await (supabase as any)
        .from('matches')
        .select(`
          *, 
          tournaments(*) as tournament, 
          player1:profiles(id, username, avatar_url), 
          player2:profiles(id, username, avatar_url)
        `)
        .or(`player1.eq.${userId},player2.eq.${userId}`)
        .order('scheduled_at', { ascending: true, nullsFirst: false });

      if (!secondError && secondTry) return secondTry as any[];

      // 3. Manual join (slow but robust)
      const { data: rawMatches, error: rawError } = await (supabase as any)
        .from('matches')
        .select('*, tournaments(*) as tournament')
        .or(`player1.eq.${userId},player2.eq.${userId}`)
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      
      if (rawError) throw rawError;
      if (!rawMatches || rawMatches.length === 0) return [];

      const playerIds = Array.from(new Set(
        rawMatches.flatMap((m: any) => [m.player1, m.player2]).filter(Boolean)
      ));

      if (playerIds.length === 0) return rawMatches;

      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', playerIds);

      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      return rawMatches.map((m: any) => ({
        ...m,
        player1: profileMap[m.player1] || { id: m.player1 },
        player2: profileMap[m.player2] || { id: m.player2 }
      }));
    } catch (err: any) {
      console.error('[matchService] Critical failure in getUserMatches:', err);
      return [];
    }
  },

  async getConversations(userId: string) {
    try {
      console.log(`[matchService] Starting conversation fetch for user: ${userId}`);
      // 1. Fetch conversations with match info
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[matchService] Conversation fetch error:', error);
        // Fallback for missing join or relationship
        const { data: simpleData, error: simpleError } = await (supabase as any)
          .from('match_conversations')
          .select('*, matches:match_id(*)')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        return simpleData || [];
      }

      if (!conversations || conversations.length === 0) {
        console.warn('[matchService] Query returned zero conversations for user. Checking match activity...');
        return [];
      }

      console.log(`[matchService] Processing ${conversations.length} conversations...`);

      // 2. Fetch last message and unread count for each
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv: any) => {
          // Last message
          const { data: lastMessage } = await (supabase as any)
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

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

      console.log('[matchService] Conversation list prepared success');
      return conversationsWithDetails;
    } catch (err) {
      console.error('[matchService] Fatal in getConversations:', err);
      return [];
    }
  },

  async submitResult(matchId: string, score1: number, score2: number, screenshotUrl: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data, error } = await (supabase as any).rpc('submit_match_result', {
      p_submitter_id: user.id,
      p_match_id: matchId,
      p_score1: score1,
      p_score2: score2,
      p_screenshot_url: screenshotUrl
    });
    
    if (error) {
      console.error('[matchService] submitResult RPC error details:', error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
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
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .eq('submitted_by', userId)
      .not('status', 'in', '("rejected","disputed")')
      .maybeSingle();

    if (error) {
      console.error('[matchService] Error fetching existing submission:', error);
      return null;
    }
    return data;
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
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, username, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.warn('[matchService] loadMessages join failed, trying simpler query:', error.message);
        
        // Try fallback: join without specific hint
        const { data: secondTry, error: secondError } = await (supabase as any)
          .from('messages')
          .select('*, profiles(id, username, avatar_url)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
          
        if (secondError) {
          console.warn('[matchService] loadMessages second join failed, fetching raw and linking:', secondError.message);
          
          // Absolute fallback: fetch messages without join and manual link
          const { data: rawMessages, error: rawError } = await (supabase as any)
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
          if (rawError) throw rawError;
          
          if (!rawMessages || rawMessages.length === 0) return [];
          
          const senderIds = Array.from(new Set(rawMessages.map((m: any) => m.sender_id)));
          const { data: profiles } = await (supabase as any)
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', senderIds);
            
          const profileMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
          
          return rawMessages.map((m: any) => ({
            ...m,
            sender: profileMap[m.sender_id] || { id: m.sender_id, username: 'User' }
          }));
        }
        
        return (secondTry as any[]).map(m => ({
          ...m,
          sender: m.profiles || { id: m.sender_id, username: 'User' }
        }));
      }
      
      return data as any[];
    } catch (err) {
      console.error('[matchService] Critical failure in loadMessages:', err);
      return [];
    }
  },

  async markAsRead(conversationId: string, userId: string) {
    try {
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
      .from('match_results')
      .select(`
        id, player1_score, player2_score, screenshot_url,
        status, admin_notes, submission_attempt, created_at,
        submitter:profiles!submitted_by(id, username, avatar_url)
      `)
      .eq('match_id', matchId)
      .eq('status', 'submitted')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async generateFixtures(tournamentId: string, _type: string) {
    const { data, error } = await (supabase as any).rpc('generate_knockout_fixtures', {
      p_tournament_id: tournamentId
    } as any);
    
    if (error) {
      console.error('[matchService] generateFixtures RPC error:', error);
      throw error;
    }
    return data;
  },

  async advanceBracket(tournamentId: string) {
    const { data, error } = await (supabase as any).rpc('advance_bracket', {
      p_tournament_id: tournamentId
    } as any);
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
      .order('round', { ascending: true });
    
    if (error) throw error;
    return (data || []) as any[];
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
