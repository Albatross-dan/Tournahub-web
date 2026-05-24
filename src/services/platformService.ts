import { supabase } from '../lib/supabase';

export interface PlatformStatus {
  maintenance_mode: boolean;
  is_blocked: boolean;
  caller_is_admin: boolean;
  maintenance_message: string;
  maintenance_end_estimate: string | null;
  maintenance_scheduled_at: string | null;
  upcoming_maintenance: boolean;
}

export const platformService = {
  async getPlatformStatus(): Promise<PlatformStatus> {
    const { data, error } = await (supabase as any).rpc('get_platform_status');
    if (error) {
      console.error('[platformService] Error getting platform status:', error);
      throw error;
    }
    return data as PlatformStatus;
  },

  async setMaintenanceMode(adminId: string, enabled: boolean) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_mode',
      p_value: enabled,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance mode:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceMessage(adminId: string, message: string) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_message',
      p_value: message,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance message:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceEndEstimate(adminId: string, isoTimestampOrNull: string | null) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_end_estimate',
      p_value: isoTimestampOrNull,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance end estimate:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceScheduledAt(adminId: string, isoTimestampOrNull: string | null) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_scheduled_at',
      p_value: isoTimestampOrNull,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance scheduled at:', error);
      return { error: error.message };
    }
    return data;
  },

  async sendAnnouncement(title: string, body: string, priority: 'normal' | 'high' | 'urgent') {
    const { data, error } = await (supabase as any).rpc('admin_broadcast_notification', {
      p_type: 'announcement',
      p_category: 'announcement',
      p_title: title,
      p_body: body,
      p_priority: priority,
      p_data: {}
    });
    if (error) {
      console.error('[platformService] Error sending announcement:', error);
      throw error;
    }
    return data;
  }
};
