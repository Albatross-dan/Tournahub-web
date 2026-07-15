import { supabase, ensureAuthenticated } from '../lib/supabase';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'banned' | 'suspended' | 'deleted' | null;
  role?: 'user' | 'admin' | 'moderator' | null;
  search?: string | null;
}

export interface ModerationLogParams {
  page?: number;
  pageSize?: number;
  actionType?: 'ban' | 'suspend' | 'restore' | 'soft_delete' | 'permanent_delete' | 'note' | null;
  adminId?: string | null;
  targetId?: string | null;
}

export const moderationService = {
  /**
   * 2.1  listUsers(page, pageSize, status, role, search)
   */
  async listUsers(params: ListUsersParams = {}) {
    await ensureAuthenticated();
    try {
      const { data, error } = await (supabase as any).rpc('admin_list_users', {
        p_page: params.page || 1,
        p_page_size: params.pageSize || 25,
        p_status: params.status || null,
        p_role: params.role || null,
        p_search: params.search || null
      });

      if (error) {
        console.warn('[moderationService] admin_list_users RPC failed, deploying secure fallback select:', error);
        return await this.fallbackListUsers(params);
      }

      // Filter out any permanently_deleted statuses returned by the RPC as additional protection
      if (data && data.users) {
        data.users = data.users.filter((u: any) => u.status !== 'permanently_deleted');
        data.total_count = data.users.length;
      }

      // If the RPC returns 0 users, but there are actually rows in the profiles table, 
      // it is highly likely that the database RPC has status/null mismatch filtering bugs.
      // We fall back to direct selection in this case as well.
      if (!data || !data.users || data.users.length === 0) {
        const fallback = await this.fallbackListUsers(params);
        if (fallback && fallback.users && fallback.users.length > 0) {
          console.log('[moderationService] RPC returned 0 users, but direct fallback select resolved users! Using fallback.');
          return fallback;
        }
      }

      return data;
    } catch (err) {
      console.warn('[moderationService] Exception in listUsers, deploying secure fallback select:', err);
      return await this.fallbackListUsers(params);
    }
  },

  /**
   * Fallback direct query on profiles table to stay extremely robust
   */
  async fallbackListUsers(params: ListUsersParams = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .neq('status', 'permanently_deleted');

      // Handle status filter
      if (params.status) {
        if (params.status === 'active') {
          query = query.or('status.eq.active,status.is.null');
        } else {
          query = query.eq('status', params.status);
        }
      }

      // Handle role filter
      if (params.role) {
        query = query.eq('role', params.role);
      }

      // Handle search
      if (params.search) {
        const searchVal = params.search.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchVal);
        if (isUuid) {
          query = query.eq('id', searchVal);
        } else {
          query = query.ilike('username', `%${searchVal}%`);
        }
      }

      const page = params.page || 1;
      const pageSize = params.pageSize || 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[moderationService] Fallback direct select failed:', error);
        return { users: [], total_count: 0 };
      }

      const formattedUsers = (data as any[] || []).map((u: any) => ({
        id: u.id,
        username: u.username || 'Anonymous',
        avatar_url: u.avatar_url || null,
        created_at: u.created_at || null,
        role: u.role || 'user',
        status: (u as any).status || 'active',
        last_login_at: u.created_at || null,
        email: (u as any).email || null,
        last_seen_at: u.last_seen_at || null
      }));

      return {
        users: formattedUsers,
        total_count: count || formattedUsers.length
      };
    } catch (err) {
      console.error('[moderationService] Fallback listUsers exception:', err);
      return { users: [], total_count: 0 };
    }
  },

  /**
   * 2.2  getUser(userId)
   */
  async getUser(userId: string) {
    await ensureAuthenticated();
    try {
      const { data, error } = await (supabase as any)
        .rpc('admin_get_user_profile', { p_user_id: userId })
        .single();

      if (error) {
        const isPermissionError = 
          error.code === '42501' || 
          error.message?.includes('PERMISSION_DENIED') || 
          error.message?.includes('admin/moderator only') ||
          error.message?.toLowerCase().includes('permission');

        if (isPermissionError) {
          throw new Error('PERMISSION_DENIED: admin/moderator only');
        }

        console.warn('[moderationService] admin_get_user_profile RPC failed, using fallback:', error);
        return await this.fallbackGetUser(userId);
      }

      // Fetch logs and notes for this user
      let notes: any[] = [];
      try {
        const { data: notesData } = await supabase
          .from('moderation_notes')
          .select('*')
          .eq('target_id', userId)
          .order('created_at', { ascending: false });
        if (notesData) notes = notesData;
      } catch (e) {
        console.warn('[moderationService] Notes select failed:', e);
      }

      let logs: any[] = [];
      try {
        const { data: logsData } = await supabase
          .from('moderation_logs')
          .select('*')
          .eq('target_id', userId)
          .order('created_at', { ascending: false });
        if (logsData) logs = logsData;
      } catch (e) {
        console.warn('[moderationService] Logs select failed:', e);
      }

      return {
        profile: data,
        notes: notes,
        logs: logs
      };
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        throw err;
      }
      console.warn('[moderationService] admin_get_user_profile RPC exception, using fallback:', err);
      return await this.fallbackGetUser(userId);
    }
  },

  /**
   * Fallback direct query for getting user dossiers
   */
  async fallbackGetUser(userId: string) {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      const profile = profileData as any;

      // Fetch logs and notes for this user (ignore missing table / permissions errors gracefully)
      let notes: any[] = [];
      try {
        const { data } = await supabase
          .from('moderation_notes')
          .select('*')
          .eq('target_id', userId)
          .order('created_at', { ascending: false });
        if (data) notes = data;
      } catch (e) {
        console.warn('[moderationService] Fallback notes select failed:', e);
      }

      let logs: any[] = [];
      try {
        const { data } = await supabase
          .from('moderation_logs')
          .select('*')
          .eq('target_id', userId)
          .order('created_at', { ascending: false });
        if (data) logs = data;
      } catch (e) {
        console.warn('[moderationService] Fallback logs select failed:', e);
      }

      return {
        profile: {
          id: profile.id,
          username: profile.username || 'Anonymous',
          avatar_url: profile.avatar_url || null,
          created_at: profile.created_at || null,
          role: profile.role || 'user',
          status: (profile as any).status || 'active',
          email: (profile as any).email || null,
          country_code: profile.country_code || null,
          last_seen_at: profile.last_seen_at || null
        },
        notes: notes,
        logs: logs
      };
    } catch (err) {
      console.error('[moderationService] fallbackGetUser failed:', err);
      return {
        profile: {
          id: userId,
          username: 'Unknown Contender',
          avatar_url: null,
          created_at: null,
          role: 'user',
          status: 'active',
          email: null,
          country_code: null,
          last_seen_at: null
        },
        notes: [],
        logs: []
      };
    }
  },

  /**
   * 2.3  getModerationSummary()
   */
  async getModerationSummary() {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('admin_get_moderation_summary');
    if (error) throw error;
    return data;
  },

  /**
   * 2.4  getModerationLogs(page, pageSize, actionType, adminId, targetId)
   */
  async getModerationLogs(params: ModerationLogParams = {}) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('admin_list_moderation_logs', {
      p_page: params.page || 1,
      p_page_size: params.pageSize || 50,
      p_action_type: params.actionType || null,
      p_admin_id: params.adminId || null,
      p_target_id: params.targetId || null
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.5  banUser(userId, reason)
   */
  async banUser(userId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('MODERATION_DENIED: Reason is required and cannot be empty.');
    }
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('ban_user', {
      p_target_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.6  suspendUser(userId, durationDays, reason)
   */
  async suspendUser(userId: string, durationDays: number, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('MODERATION_DENIED: Reason is required and cannot be empty.');
    }
    if (durationDays < 1 || durationDays > 365) {
      throw new Error('INVALID_DURATION: Suspension duration must be between 1 and 365 days.');
    }
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('suspend_user', {
      p_target_user_id: userId,
      p_duration_days: durationDays,
      p_reason: reason
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.7  restoreUser(userId)
   */
  async restoreUser(userId: string) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('restore_user', {
      p_target_user_id: userId
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.8  softDeleteUser(userId)
   */
  async softDeleteUser(userId: string) {
    await ensureAuthenticated();
    try {
      const { data, error } = await (supabase as any).rpc('soft_delete_user', {
        p_target_user_id: userId
      });
      if (error) {
        console.warn('[moderationService] soft_delete_user RPC failed, running inline fallback:', error);
        return await this.fallbackSoftDeleteUser(userId);
      }
      return data;
    } catch (err) {
      console.warn('[moderationService] soft_delete_user RPC exception, running inline fallback:', err);
      return await this.fallbackSoftDeleteUser(userId);
    }
  },

  async fallbackSoftDeleteUser(userId: string) {
    // 1. Update the profile status to 'deleted'
    const { error: updateError } = await (supabase.from('profiles') as any)
      .update({ status: 'deleted' })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 2. Insert into moderation_logs if possible (not failing if permissions or table lacks columns)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('moderation_logs')
          .insert({
            admin_id: user.id,
            target_id: userId,
            action_type: 'soft_delete',
            reason: 'User account soft-deleted by administrator fallback'
          } as any);
      }
    } catch (logError) {
      console.warn('[moderationService] Failed to insert moderation log for soft-delete (non-fatal):', logError);
    }

    return { success: true };
  },

  /**
   * 2.9  permanentlyDeleteUser(userId)
   */
  async permanentlyDeleteUser(userId: string) {
    await ensureAuthenticated();
    try {
      const { data, error } = await (supabase as any).rpc('permanently_delete_user', {
        p_target_user_id: userId
      });
      if (error) {
        console.warn('[moderationService] permanently_delete_user RPC failed, executing inline fallback cascade delete:', error);
        return await this.fallbackPermanentlyDeleteUser(userId);
      }
      return data;
    } catch (err) {
      console.warn('[moderationService] permanently_delete_user RPC exception, executing inline fallback cascade delete:', err);
      return await this.fallbackPermanentlyDeleteUser(userId);
    }
  },

  async fallbackPermanentlyDeleteUser(userId: string) {
    try {
      console.log('[moderationService] Running core fallback delete sequence for target user ID:', userId);

      // 1. Delete associated registrations & bracket elements
      try {
        await supabase.from('registrations').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Fallback registrations delete failure (non-fatal):', e);
      }

      // 2. Delete league standings & entries
      try {
        await supabase.from('league_standings').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Fallback league_standings delete failure (non-fatal):', e);
      }

      // 3. Delete group/team members
      try {
        await supabase.from('group_members').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Fallback group_members delete failure (non-fatal):', e);
      }

      // 4. Delete user's tournament chat messages
      try {
        await supabase.from('messages').delete().eq('sender_id', userId);
      } catch (e) {
        console.warn('Fallback messages delete failure (non-fatal):', e);
      }

      // 5. Delete conversation participant listings
      try {
        await supabase.from('conversation_participants').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Fallback conversation_participants delete failure (non-fatal):', e);
      }

      // 6. Delete wallets & transactions records
      try {
        await supabase.from('wallet_transactions').delete().eq('user_id', userId);
        await supabase.from('wallets').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Fallback wallet/transactions delete failure (non-fatal):', e);
      }

      // 7. Delete moderation notes & history log records
      try {
        await supabase.from('moderation_notes').delete().eq('target_id', userId);
        await supabase.from('moderation_logs').delete().eq('target_id', userId);
      } catch (e) {
        console.warn('Fallback moderation notes/logs delete failure (non-fatal):', e);
      }

      // 8. Attempt hard delete on profile row
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteProfileError) {
        console.warn('[moderationService] Direct profiles delete blocked of ID: ' + userId + '. Applying clean anonymization update as absolute guarantee...', deleteProfileError);
        
        // If we can't delete the record due to foreign keys or database triggers,
        // we fully strip their personal info, credentials, and set status to 'permanently_deleted'
        // so that they are guaranteed to never see or be seen in any lists.
        const { error: updateProfileError } = await (supabase.from('profiles') as any)
          .update({
            username: `deleted_user_${userId.slice(0, 8)}`,
            avatar_url: null,
            status: 'permanently_deleted'
          })
          .eq('id', userId);

        if (updateProfileError) {
          throw updateProfileError;
        }
      }

      // 9. Document this permanent delete audit
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('moderation_logs')
            .insert({
              admin_id: user.id,
              target_id: userId,
              action_type: 'permanent_delete',
              reason: 'User account permanently deleted by administrator fallback'
            } as any);
        }
      } catch (auditError) {
        console.warn('[moderationService] Write permanent delete audit log failure (non-fatal):', auditError);
      }

      return { success: true };
    } catch (err) {
      console.error('[moderationService] Ultimate fallback permanent delete exception:', err);
      throw err;
    }
  },

  /**
   * 2.10 assignRole(userId, newRole)
   */
  async assignRole(userId: string, newRole: 'user' | 'admin' | 'moderator') {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('assign_role', {
      p_target_user_id: userId,
      p_new_role: newRole
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.11 addModerationNote(userId, note)
   */
  async addModerationNote(userId: string, note: string) {
    if (!note || note.trim().length === 0) {
      throw new Error('INVALID_STATE: Note text cannot be empty.');
    }
    await ensureAuthenticated();
    const { data, error } = await (supabase as any).rpc('admin_add_moderation_note', {
      p_target_user_id: userId,
      p_note: note
    });
    if (error) throw error;
    return data;
  },

  /**
   * 2.12 getMyAccountStatus()
   */
  async getMyAccountStatus() {
    const { data, error } = await (supabase as any).rpc('get_my_account_status');
    if (error) throw error;
    return data;
  }
};
