import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../services/walletService';
import { supabase } from '../lib/supabase';
import { SupportedCurrency, WalletSummary, WalletLimits, FinancialActivity } from '../types/finance';
import toast from 'react-hot-toast';

export function useWallet(preferredCurrency: SupportedCurrency = 'USD') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const walletKey = ['wallet', user?.id || 'anonymous', preferredCurrency];
  const limitsKey = ['walletLimits', user?.id || 'anonymous'];
  const activityKey = ['walletActivity', user?.id || 'anonymous'];

  // 1. Queries definitions
  const { data: summary = null, status: summaryStatus, isFetching: summaryFetching } = useQuery({
    queryKey: walletKey,
    queryFn: async () => {
      console.log('[Wallet Query] Fetching wallet summary');
      return await walletService.getWalletSummary(preferredCurrency);
    },
    enabled: !!user?.id && navigator.onLine,
    staleTime: 1000 * 5, // 5 seconds staleTime
    gcTime: 1000 * 60 * 10, // 10 minutes GC
  });

  const { data: limits = null, status: limitsStatus, isFetching: limitsFetching } = useQuery({
    queryKey: limitsKey,
    queryFn: async () => {
      console.log('[Wallet Query] Fetching wallet limits');
      return await walletService.getWalletLimits();
    },
    enabled: !!user?.id && navigator.onLine,
    staleTime: 1000 * 10, // 10 seconds staleTime
    gcTime: 1000 * 60 * 10,
  });

  const { data: recentActivity = [], status: activityStatus, isFetching: activityFetching } = useQuery({
    queryKey: activityKey,
    queryFn: async () => {
      console.log('[Wallet Query] Fetching wallet recent activities');
      const res = await walletService.getRecentFinancialActivity(5);
      return res || [];
    },
    enabled: !!user?.id && navigator.onLine,
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 10,
  });

  // 2. Invalidation helper function (maintains compatibility with manual triggers)
  const refreshWallet = useCallback(async (isAuto = false) => {
    if (!user?.id) return;
    try {
      if (!isAuto) {
        toast.loading('Syncing wallet status...', { id: 'wallet-sync' });
      }
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: walletKey }),
        queryClient.invalidateQueries({ queryKey: limitsKey }),
        queryClient.invalidateQueries({ queryKey: activityKey }),
      ]);

      if (!isAuto) {
        toast.success('Wallet synchronized successfully', { id: 'wallet-sync' });
      }
    } catch (err) {
      console.error('[useWallet] Sync error:', err);
      if (!isAuto) {
        toast.error('Failed to update wallet balance', { id: 'wallet-sync' });
      }
    }
  }, [user?.id, queryClient, walletKey, limitsKey, activityKey]);

  // 3. Real-time subscription to listen to transactions and balance changes
  useEffect(() => {
    if (!user?.id) return;

    console.log(`[Wallet Realtime] Configuring subscriptions for wallet changes of: ${user.id}`);

    // Listen to wallet table modifications
    const walletChannel = supabase
      .channel(`wallet-real-state-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[Wallet Realtime] Wallets row changed, triggering fast cache query invalidation.');
          refreshWallet(true);
        }
      )
      .subscribe();

    // Listen to new transactions
    const txChannel = supabase
      .channel(`tx-real-state-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[Wallet Realtime] Insert of wallet transaction detected, invalidating cache immediately.');
          refreshWallet(true);
        }
      )
      .subscribe();

    return () => {
      console.log('[Wallet Realtime] Cleaning up wallet listener sockets.');
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user?.id, refreshWallet]);

  const isLoading = (summaryStatus === 'pending' || limitsStatus === 'pending' || activityStatus === 'pending') && !summary;
  const isRefreshing = summaryFetching || limitsFetching || activityFetching;

  return {
    summary,
    limits,
    recentActivity,
    loading: isLoading,
    refreshing: isRefreshing,
    refreshWallet,
    isLocked: limits?.is_locked || false,
    environment: summary?.environment || 'production'
  };
}
