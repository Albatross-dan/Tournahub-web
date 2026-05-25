import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

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

// Configure client-side persistence safely
if (typeof window !== 'undefined') {
  try {
    const localStoragePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'TOURNAHUB_PWA_CACHE',
    });

    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
      maxAge: 1000 * 60 * 60 * 24, // Keep offline cache for up to 24 hours
      buster: 'v1.0.0', // Change this key to invalidate general client state cache
    });
    console.log('[QueryClient Cache] ✅ Successfully initiated local storage query caching persister.');
  } catch (err) {
    console.error('[QueryClient Cache] ❌ Failed to mount query state caching storage:', err);
  }
}
