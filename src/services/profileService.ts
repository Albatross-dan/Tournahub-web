import { ensureAuthenticated, supabase } from '../lib/supabase';

export const profileService = {
  async getProfile(userId: string) {
    await ensureAuthenticated();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: any) {
    await ensureAuthenticated();
    // Prevent updating role field from frontend
    const { role, ...sanitizedUpdates } = updates || {};
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getNotificationPreferences(userId: string) {
    await ensureAuthenticated();
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for no rows found
    return data;
  },

  async updateNotificationPreferences(userId: string, updates: any) {
    await ensureAuthenticated();
    const { data, error } = await (supabase as any)
      .from('user_notification_preferences')
      .upsert({ user_id: userId, ...updates })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
