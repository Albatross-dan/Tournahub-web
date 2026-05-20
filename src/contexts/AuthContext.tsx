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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const provisioningRef = React.useRef<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth provider...');
    
    // Check initial session
    const initAuth = async () => {
      try {
        // Force session retrieval to ensure supabase client headers are hydrated
        const session = await ensureAuthenticated();
        
        if (session?.user) {
          console.log('[AuthContext] Session found for:', session.user.id);
          setUser(session.user);
          
          const profileData = await fetchProfile(session.user.id);
          const isDevAdmin = session.user.email === 'danieloguda11221@gmail.com';

          if (!profileData || (isDevAdmin && profileData.role !== 'admin')) {
            await ensureProfile(session.user);
            await fetchProfile(session.user.id);
          }
        } else {
          console.log('[AuthContext] No initial session found.');
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] initialization failed:', err);
      } finally {
        // Mark as loaded ONLY after initial check completes
        setLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`);
      
      if (session?.user) {
        setUser(session.user);
        
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          // IMPORTANT: If we got a new session, ensure headers are updated by getting it again
          await supabase.auth.getSession();
          
          const isDevAdmin = session.user.email === 'danieloguda11221@gmail.com';
          const profileData = await fetchProfile(session.user.id);
          
          if (!profileData || (isDevAdmin && profileData.role !== 'admin')) {
            await ensureProfile(session.user);
            await fetchProfile(session.user.id);
          }
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    initAuth();

    // Safety timeout
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

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

  async function fetchProfile(userId: string) {
    if (profile && profile.id === userId) return profile;
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
        setProfile(data);
        return data;
      }
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
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

      // 3. Explicitly clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('[Auth] State cleared, redirecting...');
      
      // 4. Force a hard reload to the login page
      window.location.href = '/login';
    } catch (err) {
      console.error('[Auth] Critical sign out failure:', err);
      // Hard fallback
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email === 'danieloguda11221@gmail.com',
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
