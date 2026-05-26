import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { WalletTransaction } from '../types/payment';

interface UseWalletTransactionsReturn {
  transactions:  WalletTransaction[];
  isLoading:     boolean;
  isLoadingMore: boolean;
  hasMore:       boolean;
  error:         string | null;
  loadMore:      () => Promise<void>;
  refetch:       () => Promise<void>;
}

export function useWalletTransactions(pageSize = 20): UseWalletTransactionsReturn {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async (page: number, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        setTransactions([]);
        setHasMore(false);
        return;
      }

      const start = page * pageSize;
      const end = start + pageSize - 1;

      const { data, error: fetchErr } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (fetchErr) throw fetchErr;

      const txList = (data || []) as WalletTransaction[];
      
      if (append) {
        setTransactions((prev) => [...prev, ...txList]);
      } else {
        setTransactions(txList);
      }

      setHasMore(txList.length === pageSize);
      pageRef.current = page;
    } catch (err: any) {
      console.error('[useWalletTransactions] Error fetching transactions:', err);
      setError(err?.message || 'Failed to load transaction history.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    await fetchPage(pageRef.current + 1, true);
  }, [hasMore, isLoading, isLoadingMore, fetchPage]);

  const refetch = useCallback(async () => {
    await fetchPage(0, false);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  };
}
