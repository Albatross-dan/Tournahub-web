import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ensureAuthenticated, supabase } from '../lib/supabase';
import { Profile } from '../types/database';

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

  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Initializing auth provider...');
    
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        } else {
          if (!isMounted) return null;
          setProfile(data);
          return data;
        }
      } catch (err) {
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
      
      if (event === 'SIGNED_OUT') {
        if (!isMounted) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
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

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // Step 1: Try to get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No session at all — force re-login
        await supabase.auth.signOut();
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
        if (onNavigate) {
          onNavigate('/login');
        } else {
          window.location.href = '/login';
        }
        return;
      }

      // Step 2: Check if the token is close to expiry or already 
      // expired. If so, force a refresh and WAIT for it to complete
      // before doing anything else. This is the critical fix —
      // we do not signal page components to re-fetch until we are
      // 100% sure the token is fresh and valid.
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const fiveMinutes = 1000 * 60 * 5;
      const needsRefresh = expiresAt - Date.now() < fiveMinutes;

      let freshSession = session;

      if (needsRefresh) {
        const { data: refreshed, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError || !refreshed.session) {
          // Refresh failed — token is dead, force re-login
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
          if (onNavigate) {
            onNavigate('/login');
          } else {
            window.location.href = '/login';
          }
          return;
        }

        freshSession = refreshed.session;
      }

      // Step 3: Only NOW that we have a guaranteed fresh token,
      // update auth state and signal page components to re-fetch.
      // They will fetch with a valid token and get real data.
      await applySession(freshSession);
      if (isMounted) {
        setRefetchSignal(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Safety timeout
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 6000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onNavigate]);

  async function ensureProfile(user: User) {
    if (provisioningRef.current[user.id]) return;
    provisioningRef.current[user.id] = true;

    try {
      const isDevAdmin = user.email === 'danieloguda11221@gmail.com';
      
      const { data: existingProfile } = await (supabase as any)
        .from('profiles')
        .select('id, username, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Prioritize username from metadata (passed during signup)
        const metadataUsername = user.user_metadata?.username;
        const baseUsername = user.email?.split('@')[0] || 'user';
        const finalUsername = metadataUsername || `${baseUsername}_${user.id.slice(0, 4)}`;

        await (supabase as any).from('profiles').insert({
          id: user.id,
          username: finalUsername,
          role: isDevAdmin ? 'admin' : 'user'
        });
      } else {
        // Migration: If profile exists but username is still a default/missing, try to sync from metadata
        const metadataUsername = user.user_metadata?.username;
        if (metadataUsername && (!existingProfile.username || existingProfile.username.includes('_'))) {
           // Only update if it looks like a generated name or is null
           await (supabase as any).from('profiles').update({ username: metadataUsername }).eq('id', user.id);
        }
        
        if (isDevAdmin && existingProfile.role !== 'admin') {
          await (supabase as any).from('profiles').update({ role: 'admin' }).eq('id', user.id);
        }
      }

      const { data: existingWallet } = await (supabase as any)
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingWallet) {
        await (supabase as any).from('wallets').insert({
          user_id: user.id,
          balance: 0
        });
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
