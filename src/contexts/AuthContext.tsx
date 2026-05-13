import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
    console.log('AuthProvider initialized');
    
    // Check initial session
    const initAuth = async () => {
      try {
        // Add a small randomized delay to prevent initial lock collisions across components
        await new Promise(r => setTimeout(r, Math.random() * 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Lock') || error.message.includes('stole it')) {
            console.warn('Auth lock conflict, retrying getSession...');
            await new Promise(r => setTimeout(r, 500));
            const retry = await supabase.auth.getSession();
            if (retry.data.session?.user) {
              setUser(retry.data.session.user);
              return;
            }
          }
          
          console.error('Session check error:', error);
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('refresh_token_not_found')) {
            console.warn('Invalid refresh token detected, clearing session...');
            await supabase.auth.signOut().catch(() => {});
            localStorage.clear();
            sessionStorage.clear();
          }
          // Don't throw here, just log
        }
        
        if (session?.user) {
          setUser(session.user);
          // Try to fetch profile directly first
          const profileData = await fetchProfile(session.user.id);
          
          // Only provision if profile is missing
          if (!profileData) {
            await ensureProfile(session.user);
            await fetchProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error('Initial auth setup failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      
      if (session?.user) {
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          const profileData = await fetchProfile(session.user.id);
          if (!profileData) {
            await ensureProfile(session.user);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Do nothing, session updated
        } else if (event === 'INITIAL_SESSION') {
           // handled by initAuth
        } else {
          fetchProfile(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Safety timeout to clear loading if session check hangs
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('Loading was stuck for 5s, clearing it manually');
          return false;
        }
        return prev;
      });
    }, 5000);

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
        .select('id, username')
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
      } else if (isDevAdmin && existingProfile.role !== 'admin') {
        await (supabase as any).from('profiles').update({ role: 'admin' }).eq('id', user.id);
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
    isAdmin: profile?.role === 'admin',
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
