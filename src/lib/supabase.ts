import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

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
  // 1. Get current session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.warn('[Supabase] Session retrieval failed:', error);
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
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[Supabase] Token refresh failed:', refreshError);
      return session; // Fallback to current
    }
    return refreshed.session;
  }

  return session;
}

