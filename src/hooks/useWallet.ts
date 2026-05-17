
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../services/walletService';
import { 
  WalletSummary, WalletLimits, Transaction, 
  SupportedCurrency, FinancialActivity 
} from '../types/finance';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useWallet(preferredCurrency: SupportedCurrency = 'USD') {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [limits, setLimits] = useState<WalletLimits | null>(null);
  const [recentActivity, setRecentActivity] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const refreshWallet = useCallback(async (isAuto = false) => {
    if (!user) return;
    
    try {
      if (!isAuto) setRefreshing(true);
      
      const [newSummary, newLimits, activity] = await Promise.all([
        walletService.getWalletSummary(preferredCurrency),
        walletService.getWalletLimits(),
        walletService.getRecentFinancialActivity(5)
      ]);
      
      setSummary(newSummary);
      setLimits(newLimits);
      setRecentActivity(activity);
    } catch (err: any) {
      console.error('[useWallet] Refresh error:', err);
      // Don't show toast for auto-refreshes to avoid spamming
      if (!isAuto) toast.error('Failed to update wallet balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, preferredCurrency]);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshWallet();
    } else {
      setSummary(null);
      setLimits(null);
      setRecentActivity([]);
      setLoading(false);
    }
  }, [user, refreshWallet]);

  // Real-time subscription for wallet changes
  useEffect(() => {
    if (!user) return;

    // Listen for changes in wallets table
    const walletChannel = supabase
      .channel(`wallet_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[useWallet] Wallet table changed, refreshing...');
          refreshWallet(true);
        }
      )
      .subscribe();

    // Also listen for new transactions
    const txChannel = supabase
      .channel(`transaction_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[useWallet] New transaction detected, refreshing...');
          refreshWallet(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user, refreshWallet]);

  return {
    summary,
    limits,
    recentActivity,
    loading,
    refreshing,
    refreshWallet,
    isLocked: limits?.is_locked || false,
    environment: summary?.environment || 'production'
  };
}
