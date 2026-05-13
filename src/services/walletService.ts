import { supabase } from '../lib/supabase';

export const walletService = {
  async getBalance(userId: string) {
    const { data, error } = await (supabase as any)
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getTransactions(userId: string) {
    const { data, error } = await (supabase as any)
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};
