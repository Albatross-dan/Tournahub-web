import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 20, // 20 seconds standard staleTime
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always', // Refresh automatically once internet reconnects
    },
  },
});

// Configure client-side persistence safely using IndexedDB
if (typeof window !== 'undefined') {
  try {
    // 1. One-time migration/cleanup step: purge old localStorage query cache and chat messages
    const isMigrated = localStorage.getItem('th_idb_migration_done');
    if (!isMigrated) {
      console.log('[Migration] Cleaning up old localStorage caches for PWA hardening...');
      localStorage.removeItem('TOURNAHUB_PWA_CACHE');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tournahub-chat-msgs-')) {
          localStorage.removeItem(key);
          i--; // adjust index since we removed an item
        }
      }
      localStorage.setItem('th_idb_migration_done', 'true');
      console.log('[Migration] Old localStorage cache keys purged successfully.');
    }

    // 2. Create the IndexedDB-backed async persister
    const idbPersister = createAsyncStoragePersister({
      storage: {
        getItem: async (key) => {
          const val = await get(key);
          return val !== undefined ? val : null;
        },
        setItem: async (key, value) => {
          await set(key, value);
        },
        removeItem: async (key) => {
          await del(key);
        },
      },
      key: 'TOURNAHUB_PWA_CACHE_IDB',
    });

    // 3. Persist client state with strict financial exclusions
    persistQueryClient({
      queryClient,
      persister: idbPersister,
      maxAge: 1000 * 60 * 60 * 24, // Keep offline cache for up to 24 hours
      buster: 'v1.0.1', // Change this key to invalidate general client state cache
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Safeguard: systematically prevent any financial query from being stored offline
          const keyString = JSON.stringify(query.queryKey).toLowerCase();
          const hasFinancialTerm = ['wallet', 'balance', 'escrow', 'dispute', 'debt', 'payment', 'transaction'].some(term => keyString.includes(term));
          return !hasFinancialTerm;
        },
      },
    });
    console.log('[QueryClient Cache] ✅ Successfully initiated IndexedDB query caching persister.');
  } catch (err) {
    console.error('[QueryClient Cache] ❌ Failed to mount query state caching storage:', err);
  }
}
