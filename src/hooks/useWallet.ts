import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Wallet } from '../types/payment';

interface UseWalletReturn {
  wallet: Wallet | null;
  summary: Wallet | null; // Compatibility alias
  limits: Wallet | null;  // Compatibility alias
  isLoading: boolean;
  loading: boolean;      // Compatibility alias
  error: string | null;
  refetch: () => Promise<void>;
  refreshWallet: () => Promise<void>; // Compatibility alias
  isLocked: boolean;      // Compatibility alias
  environment: string;    // Compatibility alias
}

export function useWallet(preferredCurrency?: string): UseWalletReturn {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchWallet = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setWallet(null);
        setIsLoading(false);
        return;
      }

      userIdRef.current = user.id;

      const { data, error: fetchErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchErr) {
        throw fetchErr;
      }

      const rawData = data as unknown as Wallet | null;

      const mapped = rawData ? {
        ...rawData,
        balance: rawData.balance || 0,
        balance_usd: rawData.balance || 0,
        remaining_withdrawal_usd: Math.max(0, (rawData.daily_withdrawal_limit || 0) - (rawData.total_withdrawn_usd || 0))
      } : null;

      setWallet(mapped);
    } catch (err: any) {
      console.error('[useWallet] Error fetching wallet:', err);
      setError(err?.message || 'Failed to fetch wallet information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      // Fetch initially
      await fetchWallet();

      const userId = userIdRef.current;
      if (!userId || !isMounted) return;

      // Subscribe to real-time updates for DB balance changes
      console.log(`[useWallet] Configuring realtime listener for wallet: ${userId}`);
      const walletChannel = supabase
        .channel(`wallet-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[useWallet] Received real-time wallet update:', payload.new);
            if (isMounted && payload.new) {
              const updated = payload.new as Wallet;
              setWallet({
                ...updated,
                balance_usd: updated.balance,
                remaining_withdrawal_usd: Math.max(0, (updated.daily_withdrawal_limit || 0) - (updated.total_withdrawn_usd || 0))
              });
            }
          }
        )
        .subscribe();

      subscriptionRef.current = walletChannel;
    }

    init();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchWallet]);

  return {
    wallet,
    summary: wallet,        // Compatibility mapping
    limits: wallet,         // Compatibility mapping (since is_locked etc are on wallets in schema)
    isLoading,
    loading: isLoading,     // Compatibility mapping
    error,
    refetch: fetchWallet,
    refreshWallet: fetchWallet, // Compatibility mapping
    isLocked: wallet?.is_locked || false,
    environment: wallet?.environment || 'sandbox'
  };
}
