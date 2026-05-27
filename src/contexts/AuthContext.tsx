import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ensureAuthenticated, supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { queryClient } from '../lib/queryClient';
import { requestNotificationPermission, listenForForegroundNotifications } from '../lib/notifications';

// Professional fallback timeout engine to prevent hangs and guarantee resolution
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, fallbackValue: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Timeout Recovery] Operation exceeded ${ms}ms limit. Proceeding with fallback.`);
        resolve(fallbackValue);
      }
    }, ms);

    Promise.resolve(promise)
      .then((val) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch((err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          console.error('[Timeout Recovery] Caught rejection:', err);
          resolve(fallbackValue);
        }
      });
  });
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refetchSignal: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
}

export function AuthProvider({ children, onNavigate }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const provisioningRef = React.useRef<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refetchSignal, setRefetchSignal] = useState(0);

  // Initialize FCM Push Notifications once after user is successfully authenticated
  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    const initNotifications = async () => {
      try {
        console.log('[AuthContext] Initializing FCM notifications for user:', user.id);
        
        // Request notification permission and sync token to Supabase
        await requestNotificationPermission(user.id);
        
        if (!isMounted) return;
        
        // Setup foreground notifications listener
        const unsub = await listenForForegroundNotifications();
        if (unsub && isMounted) {
          unsubscribe = unsub;
        }
      } catch (err) {
        console.warn('[AuthContext] FCM notifications initialization failed safely:', err);
      }
    };
    
    // Defer initialization slightly to prevent blocking initial load critical path rendering
    const timer = setTimeout(() => {
      initNotifications();
    }, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);


  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Initializing auth provider with robust timeout engine...');
    
    const fetchProfile = async (userId: string) => {
      try {
        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          });

        const data = await withTimeout(queryPromise, 3000, null);
        
        if (data) {
          if (!isMounted) return null;
          setProfile(data);
          return data;
        }
        return null;
      } catch (err) {
        console.error('[AuthContext] Error in fetchProfile:', err);
        return null;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const applySession = async (session: any) => {
      try {
        if (!session) {
          if (!isMounted) return;
          setUser(null);
          setProfile(null);
          return;
        }

        const user = session.user;
        if (!isMounted) return;
        setUser(user);

        const profileData = (await fetchProfile(user.id)) as Profile | null;
        const isDevAdmin = user.email === 'danieloguda11221@gmail.com';

        if (!profileData || (isDevAdmin && (profileData as Profile).role !== 'admin')) {
          await ensureProfile(user);
          await fetchProfile(user.id);
        }
      } catch (err) {
        console.error('[AuthContext] applySession failed:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthContext] PASSWORD_RECOVERY event detected, routing to /reset-password');
        await applySession(session);
        if (window.location.pathname !== '/reset-password') {
          if (onNavigate) {
            onNavigate('/reset-password');
          } else {
            window.location.href = '/reset-password';
          }
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (!isMounted) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        await applySession(session);
        if (isMounted) {
          setRefetchSignal(prev => prev + 1);
        }
        return;
      }

      await applySession(session);
    });

    // After subscribing to onAuthStateChange, check if there is no session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (!isMounted) return;
        setLoading(false);
      }
    });

    // Outer safety timeout to guarantee initialization screen resolves under any conditions
    const timer = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Safety warm start timer fired. Unblocking initialization screen...');
        setLoading(false);
      }
    }, 2000);

    // Track the last time a full focus/online reconnect update was performed to prevent spamming
    const lastFocusTime = { current: 0 };

    // Unified auto-reconnection and focus recovery logic
    const handleSessionAndRealtimeReconnection = async (reason: string) => {
      const now = Date.now();
      if (now - lastFocusTime.current < 6000) {
        return; // Throttled
      }
      lastFocusTime.current = now;
      console.log(`[Reconnection] Invoked by [${reason}]. Harmonizing app state...`);

      try {
        // Safe check session with strict timeout
        const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session);
        const session = await withTimeout(sessionPromise, 4000, null);

        if (session) {
          console.log('[Reconnection] User session is valid. Auto-reviving states...');
          
          // Revive Supabase WSS stream
          if (supabase.realtime) {
            console.log('[Reconnection] Force-cycling Supabase Realtime Stream...');
            try {
              supabase.realtime.disconnect();
              setTimeout(() => {
                if (isMounted) {
                  supabase.realtime.connect();
                  console.log('[Reconnection] Supabase Realtime Stream cycling complete.');
                }
              }, 100);
            } catch (rErr) {
              console.warn('[Reconnection] Socket cycle issue:', rErr);
            }
          }

          // Invalidate active TanStack queries to fetch fresh rows from tables
          console.log('[Reconnection] Invalidating cache to fetch fresh database rows...');
          try {
            queryClient.invalidateQueries();
          } catch (qcErr) {
            console.warn('[Reconnection] QueryClient invalidation error:', qcErr);
          }

          // Re-sync local profile state
          await applySession(session);

          // Signal active non-Query components to run their manual fetch routines
          if (isMounted) {
            setRefetchSignal(prev => prev + 1);
          }
        } else {
          console.log('[Reconnection] Session session not detected.');
        }
      } catch (err) {
        console.error('[Reconnection] Auto-reconnect flow encountered error:', err);
      }
    };

    const handleOnline = () => handleSessionAndRealtimeReconnection('online_event');
    const handleVisibility = () => {
      if (!document.hidden) {
        handleSessionAndRealtimeReconnection('visibility_visible');
      }
    };
    const handleFocus = () => handleSessionAndRealtimeReconnection('window_focused');

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onNavigate]);

  async function ensureProfile(user: User) {
    if (provisioningRef.current[user.id]) return;
    provisioningRef.current[user.id] = true;

    try {
      const isDevAdmin = user.email === 'danieloguda11221@gmail.com';
      
      const profilePromise = (supabase as any)
        .from('profiles')
        .select('id, username, role')
        .eq('id', user.id)
        .maybeSingle()
        .then((res: any) => {
          if (res.error) throw res.error;
          return res.data;
        });

      const existingProfile = await withTimeout(profilePromise, 3000, null);

      if (!existingProfile) {
        const pendingUsername = localStorage.getItem('pending_oauth_username');
        const metadataUsername = user.user_metadata?.username;
        const baseUsername = user.email?.split('@')[0] || 'user';
        const finalUsername = pendingUsername || metadataUsername || `${baseUsername}_${user.id.slice(0, 4)}`;

        const insertPromise = (supabase as any).from('profiles').insert({
          id: user.id,
          username: finalUsername,
          role: isDevAdmin ? 'admin' : 'user'
        });
        await withTimeout(insertPromise, 3000, null);

        if (pendingUsername) {
          localStorage.removeItem('pending_oauth_username');
        }
      } else {
        const pendingUsername = localStorage.getItem('pending_oauth_username');
        const metadataUsername = user.user_metadata?.username;
        const targetUsername = pendingUsername || metadataUsername;
        if (targetUsername && (!existingProfile.username || existingProfile.username.includes('_'))) {
           const updatePromise = (supabase as any).from('profiles').update({ username: targetUsername }).eq('id', user.id);
           await withTimeout(updatePromise, 3000, null);
           if (pendingUsername) {
             localStorage.removeItem('pending_oauth_username');
           }
        }
        
        if (isDevAdmin && existingProfile.role !== 'admin') {
          const updateRolePromise = (supabase as any).from('profiles').update({ role: 'admin' }).eq('id', user.id);
          await withTimeout(updateRolePromise, 3000, null);
        }
      }

      const walletPromise = (supabase as any)
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then((res: any) => {
          if (res.error) throw res.error;
          return res.data;
        });

      const existingWallet = await withTimeout(walletPromise, 3000, null);

      if (!existingWallet) {
        const insertWalletPromise = (supabase as any).from('wallets').insert({
          user_id: user.id,
          balance: 0
        });
        await withTimeout(insertWalletPromise, 3000, null);
      }
    } catch (err) {
      console.error('Provisioning failed:', err);
    } finally {
      delete provisioningRef.current[user.id];
    }
  }

  const signOut = async () => {
    console.log('[Auth] Initiating sign out sequence...');
    
    // 1. Clear state immediately to update UI
    setUser(null);
    setProfile(null);
    
    try {
      // 2. Attempt Supabase sign out with a timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timed out')), 3000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]).catch(err => {
        console.warn('[Auth] Supabase signOut failed or timed out:', err);
      });

      // 3. Explicitly clear Supabase-owned keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      
      console.log('[Auth] State cleared, redirecting...');
      
      if (onNavigate) {
        onNavigate('/login');
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('[Auth] Critical sign out failure:', err);
      // Hard fallback
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      if (onNavigate) {
        onNavigate('/login');
      } else {
        window.location.href = '/login';
      }
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email === 'danieloguda11221@gmail.com',
    signOut,
    refetchSignal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useRefetchOnFocus(callback: () => void) {
  const { refetchSignal } = useAuth();
  const callbackRef = React.useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (refetchSignal === 0) return;
    callbackRef.current();
  }, [refetchSignal]);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
