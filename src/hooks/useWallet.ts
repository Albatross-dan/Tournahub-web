
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../services/walletService';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { 
  WalletSummary, WalletLimits, Transaction, 
  SupportedCurrency, FinancialActivity 
} from '../types/finance';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useWallet(preferredCurrency: SupportedCurrency = 'USD') {
  const { user, refetchSignal } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [limits, setLimits] = useState<WalletLimits | null>(null);
  const [recentActivity, setRecentActivity] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const refreshWallet = useCallback(async (isAuto = false) => {
    if (!user?.id) return;
    if (!navigator.onLine) return;
    
    try {
      if (!isAuto) setRefreshing(true);
      
      const [summaryRes, limitsRes, activityRes] = await Promise.all([
        fetchWithRetry(async () => {
          try {
            const res = await walletService.getWalletSummary(preferredCurrency);
            return { data: res, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        }),
        fetchWithRetry(async () => {
          try {
            const res = await walletService.getWalletLimits();
            return { data: res, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        }),
        fetchWithRetry(async () => {
          try {
            const res = await walletService.getRecentFinancialActivity(5);
            return { data: res, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        })
      ]);
      
      if (summaryRes.data) setSummary(summaryRes.data);
      if (limitsRes.data) setLimits(limitsRes.data);
      if (activityRes.data) setRecentActivity(activityRes.data || []);
    } catch (err: any) {
      console.error('[useWallet] Refresh error:', err);
      // Don't show toast for auto-refreshes to avoid spamming
      if (!isAuto) toast.error('Failed to update wallet balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, preferredCurrency]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      refreshWallet();
    } else {
      setSummary(null);
      setLimits(null);
      setRecentActivity([]);
      setLoading(false);
    }
  }, [user?.id, refetchSignal, refreshWallet]);

  // Real-time subscription for wallet changes
  useEffect(() => {
    if (!user?.id) return;

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
  }, [user?.id, refreshWallet]);

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
