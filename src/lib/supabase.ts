import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Please check your Secret keys.');
}

export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      flowType: 'pkce',
      lock: async (name, _acquireTimeout, fn) => {
        return fn();
      }
    },
    global: {
      headers: {
        'x-client-info': 'tournament-hub-web'
      }
    }
  }
);

/**
 * Ensures the Supabase client has a valid session and headers are hydrated.
 * This handles the critical race condition where RLS might see auth.uid() as null.
 */
export async function ensureAuthenticated() {
  try {
    // 1. Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[Supabase] Session retrieval failed:', error);
      if (error.message?.toLowerCase().includes('refresh token') || error.message?.toLowerCase().includes('refresh_token')) {
        clearSupabaseSession();
      }
      return null;
    }
    
    if (!session) {
      // 2. If no session, try a quick refresh if we have a refresh token (handled by library, but we can nudge it)
      console.log('[Supabase] No active session found.');
      return null;
    }

    // 3. CRITICAL: If session exists, we perform a dummy query or a token refresh nudge 
    // to ensure the internal Fetch helper has the latest Authorization header.
    // We also check if the token is close to expiry.
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const isBufferTime = expiresAt - Date.now() < 1000 * 60 * 5; // 5 minutes buffer
    
    if (isBufferTime) {
      console.log('[Supabase] Token near expiry, refreshing...');
      try {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[Supabase] Token refresh failed:', refreshError);
          if (refreshError.message?.toLowerCase().includes('refresh token') || refreshError.message?.toLowerCase().includes('refresh_token')) {
            clearSupabaseSession();
            return null;
          }
          return session; // Fallback to current
        }
        return refreshed.session;
      } catch (innerErr: any) {
        console.error('[Supabase] Try-catch wrapper caught token refresh crash:', innerErr);
        if (innerErr?.message?.toLowerCase().includes('refresh token') || innerErr?.message?.toLowerCase().includes('refresh_token')) {
          clearSupabaseSession();
        }
        return session;
      }
    }

    return session;
  } catch (err: any) {
    console.error('[Supabase] Exception in ensureAuthenticated:', err);
    if (err?.message?.toLowerCase().includes('refresh token') || err?.message?.toLowerCase().includes('refresh_token')) {
      clearSupabaseSession();
    }
    return null;
  }
}

function clearSupabaseSession() {
  if (typeof window !== 'undefined' && window.localStorage) {
    console.log('[Supabase] Clearing invalid session from localStorage...');
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch (e) {
      console.error('[Supabase] Error clearing localStorage:', e);
    }
  }
}

