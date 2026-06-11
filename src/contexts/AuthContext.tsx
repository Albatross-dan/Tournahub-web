import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ensureAuthenticated, supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { queryClient } from '../lib/queryClient';
import { requestNotificationPermission, listenForForegroundNotifications, deleteFcmTokenOnLogout, syncTokenToSupabase } from '../lib/notifications';
import { Trophy, Zap, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
  refreshAuth: () => Promise<void>;
  walletSummary: any | null;
  accountStatus: any | null;
  unreadNotificationsCount: number;
  unreadChatCount: number;
  refreshWalletAndStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function UsernameSetup({ userId, onComplete }: { userId: string; onComplete: (newUsername: string) => void }) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChecking(true);

    const val = username.trim().toLowerCase();
    if (val.length < 3) {
      setError('Username must be at least 3 characters.');
      setChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setError('Username can only contain letters, numbers, and underscores.');
      setChecking(false);
      return;
    }

    try {
      // 1. Check uniqueness
      const { data: existing, error: checkError } = await (supabase as any)
        .from('profiles')
        .select('username')
        .eq('username', val)
        .maybeSingle();

      if (checkError) {
        console.error('Check failed:', checkError);
      }

      if (existing) {
        setError('This username is already taken. Try another unique codename.');
        setChecking(false);
        return;
      }

      // 2. Perform database update
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ username: val })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onComplete(val);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update username. Please retry.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#05060b] z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background glow accents */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-zinc-800/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0b0c11]/95 backdrop-blur-2xl border border-zinc-800/80 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(212,175,55,0.05)] relative z-10 text-center">
        
        {/* Header Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-amber-500/15 blur-xl rounded-full" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#1c1d24] to-[#12131a] border border-[#d4af37]/40 shadow-xl flex items-center justify-center">
            <Trophy className="w-8 h-8 text-[#d4af37]" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-2 mb-8">
          <h2 className="text-3xl font-black italic text-[#ededef] uppercase tracking-tight leading-none">
            CHOOSE YOUR CODENAME
          </h2>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed uppercase tracking-wider">
            Setup your eFootball gamer ID to access tournaments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Tournaments Username
            </label>
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500/5 rounded-2xl opacity-100 pointer-events-none" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <span className="text-[#d4af37] font-black italic text-lg leading-none">@</span>
              </div>
              <input
                type="text"
                required
                disabled={checking || isSuccess}
                className="w-full bg-[#111218]/80 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 outline-none transition-all text-white font-medium relative z-10"
                placeholder="Unique codename"
                value={username}
                onChange={(e) => {
                  setError(null);
                  setUsername(e.target.value.trim().toLowerCase());
                }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold p-3 rounded-xl flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[11px] font-bold p-3 rounded-xl flex items-center space-x-2 text-left">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Username chosen! Entering arena...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={checking || isSuccess || !username}
            className="w-full relative group overflow-hidden rounded-2xl h-14 flex items-center justify-center cursor-pointer transition-all duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700] via-[#dfb021] to-[#b8860b] transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 text-black text-sm font-black uppercase italic tracking-wider flex items-center gap-1.5">
              {checking ? (
                <>Verifying ID... <Loader2 className="w-4 h-4 animate-spin text-black" /></>
              ) : isSuccess ? (
                <>Profile Configured</>
              ) : (
                <>Launch My Career <Zap className="w-4 h-4 fill-current text-black animate-pulse" /></>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

interface AuthProviderProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
}

export function AuthProvider({ children, onNavigate }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const provisioningRef = React.useRef<Record<string, boolean>>({});
  const lastUserIdRef = React.useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      lastUserIdRef.current = user.id;
    }
  }, [user]);
  const [refetchSignal, setRefetchSignal] = useState(0);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);

  // Shared state values for get_my_account_status, get_wallet_summary, notifications & chat counts
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const fetchWalletAndStatus = async (userId: string) => {
    try {
      // 1. Fetch account status (get_my_account_status RPC or profiles select fallback)
      const fetchStatusPromise = (async () => {
        const { data, error } = await (supabase as any).rpc('get_my_account_status');
        if (error) {
          console.error('[AuthContext] get_my_account_status error:', error);
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('status, banned_reason, suspension_reason, suspended_until')
            .eq('id', userId)
            .single();
          return profileData || { status: 'active' };
        }
        return data;
      })();

      // 2. Fetch wallet summary (get_wallet_summary RPC or wallets select fallback)
      const fetchWalletPromise = (async () => {
        const { data, error } = await (supabase as any).rpc('get_wallet_summary', {
          p_display_currency: 'USD'
        });
        if (error) {
          console.error('[AuthContext] get_wallet_summary error:', error);
          const { data: walletData } = await (supabase as any)
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (walletData) {
            return {
              id: (walletData as any).id,
              user_id: (walletData as any).user_id,
              balance_usd: (walletData as any).balance || 0,
              is_locked: (walletData as any).is_locked,
              environment: (walletData as any).environment || 'sandbox'
            };
          }
          return { balance_usd: 0, is_locked: false, environment: 'sandbox' };
        }
        return data;
      })();

      // 3. Fetch notifications unread count
      const fetchNotificationsPromise = (async () => {
        const { count } = await (supabase as any)
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);
        return count || 0;
      })();

      // 4. Fetch chat unread count
      const fetchChatPromise = (async () => {
        const { data: conversations } = await (supabase as any)
          .from('match_conversations')
          .select(`
            id,
            match_id,
            matches!inner (
              player1,
              player2
            )
          `);

        if (!conversations || conversations.length === 0) {
          return 0;
        }

        const conversationIds = conversations.map((c: any) => c.id);
        const { count } = await (supabase as any)
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', userId)
          .not('read_by', 'cs', `["${userId}"]`);

        return count || 0;
      })();

      const [status, wallet, unreadNotif, unreadChat] = await Promise.all([
        withTimeout(fetchStatusPromise, 3000, { status: 'active' }),
        withTimeout(fetchWalletPromise, 3000, { balance_usd: 0, is_locked: false, environment: 'sandbox' }),
        withTimeout(fetchNotificationsPromise, 3000, 0),
        withTimeout(fetchChatPromise, 3000, 0),
      ]);

      setAccountStatus(status);
      setWalletSummary(wallet);
      setUnreadNotificationsCount(unreadNotif);
      setUnreadChatCount(unreadChat);
    } catch (err) {
      console.error('[AuthContext] Error fetching consolidated wallet, status and counts. Applying active self-healing states fallback:', err);
      setAccountStatus({ status: 'active' });
    }
  };

  const refreshWalletAndStatus = async () => {
    if (user?.id) {
      await fetchWalletAndStatus(user.id);
    }
  };

  // Realtime subscription effect to synchronize all these counts
  useEffect(() => {
    if (!user) {
      setAccountStatus(null);
      setWalletSummary(null);
      setUnreadNotificationsCount(0);
      setUnreadChatCount(0);
      return;
    }

    let isMounted = true;
    const userId = user.id;

    const refreshAll = () => {
      if (isMounted) {
        fetchWalletAndStatus(userId);
      }
    };

    // Initial load
    refreshAll();

    // Set up real-time subscriptions for immediate reactivity:
    const notificationsChannel = supabase
      .channel(`auth-notifs-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        refreshAll();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`auth-messages-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        refreshAll();
      })
      .subscribe();

    const walletChannel = supabase
      .channel(`auth-wallet-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (isMounted && payload.new) {
          setWalletSummary((prev: any) => prev ? {
            ...prev,
            balance_usd: payload.new.balance,
            is_locked: payload.new.is_locked,
            environment: payload.new.environment || 'sandbox'
          } : {
            balance_usd: payload.new.balance,
            is_locked: payload.new.is_locked,
            environment: payload.new.environment || 'sandbox'
          });
        }
      })
      .subscribe();

    // Periodic poll every 10 seconds to ensure consistency
    const interval = setInterval(() => {
      refreshAll();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [user?.id]);

  // Initialize FCM Push Notifications once after user is successfully authenticated
  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    const initNotifications = async () => {
      try {
        console.log('[AuthContext] Initializing FCM notifications for user:', user.id);
        
        // Only generate token / query FCM if permission has already been granted by a past user action.
        // This strictly prevents automatic browser popups on load context.
        const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
        if (currentPermission === 'granted') {
          console.log('[AuthContext] Notification permission already granted. Completing automatic FCM token retrieval and sync...');
          await requestNotificationPermission(user.id);
        } else {
          console.log('[AuthContext] Notification permission is not granted (current state:', currentPermission + '). Skipping automatic prompt to adhere to browser user-gesture restrictions.');
        }
        
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
          if (!data.username || data.username.startsWith('temp_user_') || data.username === '') {
            setNeedsUsernameSetup(true);
          } else {
            setNeedsUsernameSetup(false);
          }
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
          setNeedsUsernameSetup(false);
          setAccountStatus(null);
          setWalletSummary(null);
          setUnreadNotificationsCount(0);
          setUnreadChatCount(0);
          lastUserIdRef.current = null;
          try {
            queryClient.clear();
            sessionStorage.clear();
          } catch (err) {
            console.warn('[Auth] Failed to clear caches on empty session in applySession:', err);
          }
          return;
        }

        const user = session.user;
        if (!isMounted) return;

        // Detect user change
        if (lastUserIdRef.current && lastUserIdRef.current !== user.id) {
          console.log('[AuthContext] User change detected in applySession:', lastUserIdRef.current, 'to', user.id);
          try {
            queryClient.clear();
            sessionStorage.clear();
          } catch (qcErr) {
            console.warn('[Auth] Failed to clear caches on user change in applySession:', qcErr);
          }
        }
        
        lastUserIdRef.current = user.id;
        setUser(user);

        const profileData = (await fetchProfile(user.id)) as Profile | null;

        if (!profileData) {
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

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          const userId = session.user.id;
          lastUserIdRef.current = userId;
          
          const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
          if (currentPermission === 'granted') {
            console.log('[AuthContext] SIGNED_IN event detected and notification permission already granted. Syncing FCM token in background:', userId);
            requestNotificationPermission(userId).then(async (token) => {
              if (token) {
                const fcmToken = token;
                console.log('[AuthContext] Retrieved FCM Token on SIGNED_IN event:', fcmToken);
                // Call the centralized sync function
                await syncTokenToSupabase(userId, fcmToken);
              } else {
                console.warn('[AuthContext] No FCM token returned during SIGNED_IN event. Verify permissions and configuration.');
              }
            }).catch(err => {
              console.error('[AuthContext] Error in requestNotificationPermission during SIGNED_IN:', err);
            });
          } else {
            console.log('[AuthContext] SIGNED_IN event detected. Notification permission is not granted (current state:', currentPermission + '). Skipping automated permission request.');
          }
        }
      }

      if (event === 'SIGNED_OUT') {
        const userId = lastUserIdRef.current;
        const currentToken = localStorage.getItem('fcm_token');
        if (userId && currentToken) {
          console.log('[AuthContext] SIGNED_OUT event detected. Deleting notification token for user:', userId);
          try {
            const { error: deleteError } = await (supabase as any).from('notification_tokens')
              .delete()
              .eq('user_id', userId)
              .eq('token', currentToken);
            if (deleteError) {
              console.error('[AuthContext] Failed to delete token on SIGNED_OUT:', deleteError.message);
            } else {
              console.log('[AuthContext] Successfully deleted notification token on SIGNED_OUT.');
            }
          } catch (deleteErr) {
            console.error('[AuthContext] Exception while deleting token on SIGNED_OUT:', deleteErr);
          }
        }
        localStorage.removeItem('fcm_token');

        if (!isMounted) return;
        setUser(null);
        setProfile(null);
        setNeedsUsernameSetup(false);
        setAccountStatus(null);
        setWalletSummary(null);
        setUnreadNotificationsCount(0);
        setUnreadChatCount(0);
        lastUserIdRef.current = null;
        try {
          queryClient.clear();
          sessionStorage.clear();
        } catch (qcErr) {
          console.warn('[Auth] Failed to clear caches on SIGNED_OUT event:', qcErr);
        }
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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting session on init:', error);
        if (error.message?.toLowerCase().includes('refresh token') || error.message?.toLowerCase().includes('refresh_token')) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }
      }
      if (!session) {
        if (!isMounted) return;
        setLoading(false);
      }
    }).catch(err => {
      console.error('[AuthContext] Unhandled rejection getting session on init:', err);
      if (!isMounted) return;
      setLoading(false);
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
      let existingProfile: any = null;
      let querySuccessful = false;

      try {
        const profilePromise = (supabase as any)
          .from('profiles')
          .select('id, username, role')
          .eq('id', user.id)
          .maybeSingle()
          .then((res: any) => {
            if (res.error) throw res.error;
            return res.data;
          });

        const tempProfileResult = await withTimeout(profilePromise, 3000, undefined);
        if (tempProfileResult !== undefined) {
          existingProfile = tempProfileResult;
          querySuccessful = true;
        }
      } catch (err) {
        console.error('[ensureProfile] Error checking existing profile:', err);
      }

      if (!querySuccessful) {
        console.warn('[ensureProfile] Profile check timed out or failed. Aborting to prevent overwriting existing username.');
        return;
      }

      if (!existingProfile) {
        const pendingUsername = localStorage.getItem('pending_oauth_username');
        const pendingWhatsapp = localStorage.getItem('pending_oauth_whatsapp_number');
        const pendingTimezone = localStorage.getItem('pending_oauth_timezone');
        const metadataUsername = user.user_metadata?.username;
        const finalUsername = pendingUsername || metadataUsername || `temp_user_${user.id.slice(0, 8)}`;

        const insertPromise = (supabase as any).from('profiles').insert({
          id: user.id,
          username: finalUsername,
          whatsapp_number: pendingWhatsapp || user.user_metadata?.whatsapp_number || null,
          timezone: pendingTimezone || user.user_metadata?.timezone || 'Africa/Nairobi'
        });
        await withTimeout(insertPromise, 3000, null);

        if (pendingUsername) {
          localStorage.removeItem('pending_oauth_username');
        }
        if (pendingWhatsapp) {
          localStorage.removeItem('pending_oauth_whatsapp_number');
        }
        if (pendingTimezone) {
          localStorage.removeItem('pending_oauth_timezone');
        }
      } else {
        const pendingUsername = localStorage.getItem('pending_oauth_username');
        const pendingWhatsapp = localStorage.getItem('pending_oauth_whatsapp_number');
        const pendingTimezone = localStorage.getItem('pending_oauth_timezone');
        const metadataUsername = user.user_metadata?.username;
        const targetUsername = pendingUsername || metadataUsername;
        
        const updateParams: any = {};
        if (targetUsername && (!existingProfile.username || existingProfile.username.includes('_') || existingProfile.username.startsWith('temp_user_'))) {
          updateParams.username = targetUsername;
        }
        if (pendingWhatsapp && !existingProfile.whatsapp_number) {
          updateParams.whatsapp_number = pendingWhatsapp;
        }
        if (pendingTimezone && !existingProfile.timezone) {
          updateParams.timezone = pendingTimezone;
        }

        if (Object.keys(updateParams).length > 0) {
          const updatePromise = (supabase as any).from('profiles').update(updateParams).eq('id', user.id);
          await withTimeout(updatePromise, 3000, null);
        }

        if (pendingUsername) {
          localStorage.removeItem('pending_oauth_username');
        }
        if (pendingWhatsapp) {
          localStorage.removeItem('pending_oauth_whatsapp_number');
        }
        if (pendingTimezone) {
          localStorage.removeItem('pending_oauth_timezone');
        }
      }
    } catch (err) {
      console.error('Provisioning failed:', err);
    } finally {
      delete provisioningRef.current[user.id];
    }
  }

  const signOut = async () => {
    console.log('[Auth] Initiating sign out sequence...');
    const currentUserId = user?.id;
    
    // 1. Clear state immediately to update UI
    setUser(null);
    setProfile(null);
    setNeedsUsernameSetup(false);
    setAccountStatus(null);
    setWalletSummary(null);
    setUnreadNotificationsCount(0);
    setUnreadChatCount(0);
    lastUserIdRef.current = null;
    
    try {
      queryClient.clear();
      sessionStorage.clear();
    } catch (err) {
      console.warn('[Auth] Failed to clear queryClient or sessionStorage on signOut:', err);
    }
    
    if (currentUserId) {
      deleteFcmTokenOnLogout(currentUserId).catch(err => {
        console.warn('[AuthContext] FCM token cleanup on logout failed safely:', err);
      });
    }
    
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

  const refreshAuth = async () => {
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        setUser(freshUser);
        const { data: rawData } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', freshUser.id)
          .single();
        const profileData = rawData as any;
        if (profileData) {
          setProfile(profileData as Profile);
          if (!profileData.username || profileData.username.startsWith('temp_user_') || profileData.username === '') {
            setNeedsUsernameSetup(true);
          } else {
            setNeedsUsernameSetup(false);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to refresh auth state:', err);
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'danieloguda11221@gmail.com',
    signOut,
    refetchSignal,
    refreshAuth,
    walletSummary,
    accountStatus,
    unreadNotificationsCount,
    unreadChatCount,
    refreshWalletAndStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
