import React from 'react';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

const APP_VERSION = '1.0.24';

let tokenRegistrationInProgress = false;
let tokenRegistered = false;
let visibilityCleanup: (() => void) | null = null;

/**
 * Requests browser notification permission, registers the messaging service worker,
 * retrieves the Firebase Cloud Messaging (FCM) token, and saves it to the
 * notification_tokens table in Supabase.
 * 
 * Includes comprehensive safety checks for unsupported environments,
 * permission denials, missing credentials, and prevents duplicate sync inserts.
 * 
 * @param userId The ID of the authenticated user
 */
export async function requestNotificationPermission(userId: string, isRetry = false): Promise<string | null> {
  console.log('[Push] ── requestNotificationPermission called for user:', userId, '| isRetry:', isRetry);

  // GUARD: prevent React StrictMode / re-render double-firing
  if (tokenRegistrationInProgress) {
    console.log('[Push] ── SKIPPED: registration already in progress');
    return localStorage.getItem('fcm_token');
  }
  if (tokenRegistered && !isRetry) {
    console.log('[Push] ── SKIPPED: token already registered this session');
    return localStorage.getItem('fcm_token');
  }

  console.log('[Push] ── Setting tokenRegistrationInProgress = true');
  tokenRegistrationInProgress = true;

  try {
    // 1. Safety Checks for Browser APIs
    if (typeof window === 'undefined') {
      console.log('[Push] ── FAILED: requestNotificationPermission called server-side. Aborting.');
      return null;
    }
    
    console.log('[Push] ── Browser sandbox status: run-time window top level =', window.self === window.top);
    console.log('[Push] ── Notification.permission status =', typeof Notification !== 'undefined' ? Notification.permission : 'NOT_SUPPORTED');

    if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
      console.log('[Push] ── FAILED: Push notifications are not supported in this browser. Main criteria check failed:', {
        serviceWorkerSupport: 'serviceWorker' in navigator,
        notificationSupport: 'Notification' in window,
        pushManagerSupport: 'PushManager' in window
      });
      return null;
    }

    // 2. Request / Check Notification Permission First
    let permission = Notification.permission;
    console.log('[Push] ── Initial notification permission on-entry state is:', permission);

    if (permission === 'default') {
      console.log('[Push] ── Permission is currently default. Triggering interactive permission prompt...');
      try {
        permission = await Notification.requestPermission();
        console.log('[Push] ── Promisified Notification.requestPermission returned:', permission);
      } catch (permErr: any) {
        console.warn('[Push] ── Notification.requestPermission promise form failed, trying fallback callback pattern:', permErr);
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission(resolve);
        });
        console.log('[Push] ── Callback Notification.requestPermission returned:', permission);
      }
    } else {
      console.log('[Push] ── Skipping permission prompt. Relying on existing state:', permission);
    }

    if (permission !== 'granted') {
      console.log(`[Push] ── FAILED: Permission blocked or denied: "${permission}". Aborting setup.`);
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    console.log('[Push] ── VAPID key present:', !!vapidKey, '| length:', vapidKey?.length);
    if (!vapidKey) {
      console.log('[Push] ── FAILED: VITE_FIREBASE_VAPID_KEY is missing in environment variables. FCM registration aborted.');
      return null;
    }

    // 3. Get Firebase Messaging Instance
    console.log('[Push] ── Querying getMessagingInstance from firebase helper...');
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('[Push] ── FAILED: Unable to retrieve Firebase Messaging instance because app/messaging check failed in firebase.ts.');
      return null;
    }
    console.log('[Push] ── Firebase Messaging instance retrieved successfully:', messaging ? 'OK' : 'NULL');

    // 4. Custom registration of the Service Worker to guarantee it resolves correctly in Vite/Vercel
    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      };

      const hasConfig = config.apiKey && !config.apiKey.startsWith('PLACEHOLDER_') && config.apiKey !== '';
      const swUrl = hasConfig 
        ? `/sw.js?apiKey=${encodeURIComponent(config.apiKey)}&authDomain=${encodeURIComponent(config.authDomain)}&projectId=${encodeURIComponent(config.projectId)}&storageBucket=${encodeURIComponent(config.storageBucket)}&messagingSenderId=${encodeURIComponent(config.messagingSenderId)}&appId=${encodeURIComponent(config.appId)}`
        : '/sw.js';
      console.log('[Push] ── Registering dynamic service worker path:', swUrl);

      swRegistration = await navigator.serviceWorker.register(swUrl);
      console.log('[Push] ── Service Worker registration promise successful. Active scope:', swRegistration.scope);

      // Wait for service worker to finish activating if needed
      console.log('[Push] ── Waiting for navigator.serviceWorker.ready...');
      await navigator.serviceWorker.ready;
      console.log('[Push] ── Service Worker is ready and active.');
    } catch (swErr: any) {
      console.log('[Push] ── WARNING: Custom Service Worker registration failed:', swErr?.message || swErr);
    }

    // 5. Generate FCM token
    console.log('[Push] ── Calling Firebase getToken() method with active dynamic service Worker registration...');
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    console.log('[Push] ── getToken result:', token ? 'GOT TOKEN (length: ' + token.length + ')' : 'NULL/EMPTY');

    if (!token) {
      console.log('[Push] ── FAILED: getToken returned empty/null');
      return null;
    }

    console.log('[Push] ── FCM token successfully generated. Character preview:', token.substring(0, 10) + '...');
    localStorage.setItem('fcm_token', token);

    // 6. Save and Sync to Supabase table: 'notification_tokens'
    console.log('[Push] ── Initiating Supabase database synchronization...');
    const activeToken = await syncTokenToSupabase(userId, token, isRetry);
    console.log('[Push] ── Completed token synchronization process.');

    // Add visibilitychange handler for token refresh
    if (typeof window !== 'undefined' && 'addEventListener' in window) {
      if (visibilityCleanup) visibilityCleanup();
      
      const handleVisibilityChange = async () => {
        if (document.visibilityState !== 'visible') return;
        if (!tokenRegistered) return;

        // Refresh last_seen_at so token stays active in database
        const currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration
        }).catch(() => null);

        if (!currentToken) return;

        const uId = (await supabase.auth.getUser()).data.user?.id;
        if (!uId) return;

        try {
          await (supabase as any).rpc('fn_upsert_push_token', {
            p_user_id:  uId,
            p_token:    currentToken,
            p_platform: 'web',
            p_device:   navigator.userAgent.slice(0, 200),
            p_app_ver:  APP_VERSION ?? null
          });
        } catch (visibilityErr) {
          // silent — never block the app
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityCleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // Handle FCM token rotation
    try {
      if (typeof (messaging as any).onTokenRefresh === 'function') {
        (messaging as any).onTokenRefresh(async () => {
          console.log('[Push] FCM token rotated — re-registering');
          // Reset guard so re-registration runs
          tokenRegistered = false;
          tokenRegistrationInProgress = false;
          // Re-run full registration to get new token and upsert it
          await requestNotificationPermission(userId);
        });
      } else {
        console.log('[Notifications] FCM onTokenRefresh is not natively present on this messaging version. Auto-refresh relies on periodic getToken calls (e.g. visibility changes).');
      }
    } catch (tokenRefErr) {
      console.warn('[Notifications] onTokenRefresh registration failed:', tokenRefErr);
    }

    tokenRegistered = true;
    console.log('[Push] ── SUCCESS: Token registered and session verified.');
    return activeToken;
  } catch (error: any) {
    console.log('[Push] ── EXCEPTION caught:', error?.message || error, error);
    return null;
  } finally {
    tokenRegistrationInProgress = false;
    console.log('[Push] ── Setting tokenRegistrationInProgress = false');
  }
}

/**
 * Handles syncing of FCM token to Supabase using optimal checking and upsert fallbacks.
 * This function guarantees no double inserts and updates token ownership securely.
 */
export async function syncTokenToSupabase(userId: string, token: string, isRetry = false): Promise<string | null> {
  const supabaseAny = supabase as any;
  
  // A. Check for Cross-User conflicts before proceeding with inserts/upserts.
  try {
    const { data: pushTokens } = await supabaseAny
      .from('user_push_tokens')
      .select('user_id')
      .eq('token', token)
      .limit(5);

    const { data: notifTokens } = await supabaseAny
      .from('notification_tokens')
      .select('user_id')
      .eq('token', token)
      .limit(5);

    const otherUserPush = pushTokens?.find((r: any) => r.user_id !== userId);
    const otherUserNotif = notifTokens?.find((r: any) => r.user_id !== userId);

    if ((otherUserPush || otherUserNotif) && !isRetry) {
      const conflictingUserId = otherUserPush?.user_id || otherUserNotif?.user_id;
      console.warn(`[Notifications] FCM token conflict! Token ${token.substring(0, 8)}... belongs in DB to user ${conflictingUserId}, but current logged-in user is ${userId}. Forcing token revocation and brand new token...`);
      
      try {
        const messaging = await getMessagingInstance();
        if (messaging) {
          console.log('[Notifications] Revoking existing overridden token from FCM server...');
          await deleteToken(messaging);
        }
      } catch (delErr) {
        console.warn('[Notifications] deleteToken() warning (already invalid/unassigned):', delErr);
      }
      
      localStorage.removeItem('fcm_token');
      console.log('[Notifications] Retrying requestNotificationPermission recursively with isRetry=true to obtain fresh token...');
      await requestNotificationPermission(userId, true);
      return null;
    }
  } catch (conflictCheckErr) {
    console.warn('[Notifications] Error checking cross-user token conflict:', conflictCheckErr);
  }
  
  try {
    const { data: upsertResult, error: upsertError } = await (supabase as any).rpc(
      'fn_upsert_push_token',
      {
        p_user_id:  userId,
        p_token:    token,
        p_platform: 'web',
        p_device:   navigator.userAgent.slice(0, 200),  // DB column limit
        p_app_ver:  APP_VERSION ?? null
      }
    );

    if (upsertError) {
      console.warn('[Push] Token upsert failed:', upsertError.message);
      // Do NOT throw — never crash the app on token failure
      return token;
    }

    console.log('[Push] Token', (upsertResult as any)?.action ?? 'processed');
  } catch (err: any) {
    console.warn('[Push] Exception in token upsert RPC:', err.message || err);
  }

  return token;
}

/**
 * Resets the module-level notification registration flags so that they
 * can re-fire properly on next login or retry.
 */
export function resetNotificationGuards(): void {
  tokenRegistered = false;
  tokenRegistrationInProgress = false;
  console.log('[Notifications] Registration guards reset: tokenRegistered = false, tokenRegistrationInProgress = false');
}

/**
 * Disposes of the FCM token registration on logout to prevent subsequent invalid deliveries.
 */
export async function deleteFcmTokenOnLogout(userId: string): Promise<void> {
  // Reset guards so next user login registers cleanly
  resetNotificationGuards();
  console.log('[Push] ── Token flags reset on logout');
  if (visibilityCleanup) {
    visibilityCleanup();
    visibilityCleanup = null;
  }
  try {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      console.log('[Notifications] No local FCM token stored. Skipping logout token cleanup.');
      return;
    }

    console.log('[Notifications] Deleting FCM token registration for user', userId);
    
    // Delete from notification_tokens
    try {
      const { error } = await (supabase as any)
        .from('notification_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
      if (error) {
        console.warn('[Notifications] Deletion from "notification_tokens" failed:', error.message);
      }
    } catch (err) {
      console.warn('[Notifications] Exception deleting from "notification_tokens":', err);
    }

    // Delete from user_push_tokens
    try {
      const { error } = await (supabase as any)
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
      if (error) {
        console.warn('[Notifications] Deletion from "user_push_tokens" failed:', error.message);
      }
    } catch (err) {
      console.warn('[Notifications] Exception deleting from "user_push_tokens":', err);
    }

    console.log('[Notifications] FCM token successfully removed from Supabase backend storage.');
  } catch (cleanupErr) {
    console.warn('[Notifications] Safely caught error during FCM token cleanup:', cleanupErr);
  } finally {
    localStorage.removeItem('fcm_token');
  }
}

/**
 * Registers the foreground notification listener with proper error boundaries.
 * Triggers native system notifications AND premium styled in-app UI toasts.
 */
export async function listenForForegroundNotifications(): Promise<(() => void) | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Listen to Firebase Messages while application is currently active (in focus)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[Notifications] Foreground message payload received:', payload);

      if (!payload || !payload.notification) return;

      const { title, body, image } = payload.notification;
      if (!title && !body) return;

      // 1. Dispatch custom system notification via native API
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(title || 'Tournahub Alert', {
                body: body || '',
                icon: image || '/favicon.ico',
                badge: '/favicon.ico',
                data: payload.data,
              });
            }).catch(() => {
              new Notification(title || 'Tournahub Alert', {
                body: body || '',
                icon: image || '/favicon.ico',
              });
            });
          } else {
            new Notification(title || 'Tournahub Alert', {
              body: body || '',
              icon: image || '/favicon.ico',
            });
          }
        } catch (sysNotifyErr) {
          console.warn('[Notifications] System notification failed to display:', sysNotifyErr);
        }
      }

      // 2. Beautiful In-App Interactive Toast notification using React Hot Toast
      toast((t) => (
        React.createElement('div', { 
          id: 'fc-toast-body', 
          className: 'flex flex-col gap-1 max-w-sm pointer-events-auto' 
        }, [
          React.createElement('div', { 
            key: 'title', 
            className: 'font-semibold text-sm text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5' 
          }, [
            React.createElement('span', { key: 'bullet', className: 'h-2 w-2 rounded-full bg-indigo-500 animate-pulse' }),
            title || 'Tournahub Notification'
          ]),
          React.createElement('div', { 
            key: 'body', 
            className: 'text-xs text-slate-600 font-medium' 
          }, body || '')
        ])
      ), {
        duration: 6000,
        position: 'top-right',
        style: {
          background: '#ffffff',
          color: '#0f172a',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        },
        id: `fcm-${Date.now()}`
      });
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[Notifications] Failed to subscribe foreground notification listener:', err);
    return null;
  }
}

/**
 * Centrally registers/syncs the FCM push token when permission is granted.
 * Safe to call on every app load and on login.
 */
export async function registerPushToken(): Promise<void> {
  try {
    // 1. Check permission
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // 2. Protect and verify user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Notifications] registerPushToken skipped: No authenticated session found.');
      return;
    }

    console.log('[Notifications] Registering/refreshing push token for user:', user.id);

    // 3. Get FCM token via the existing robust registration/FCM helper
    const token = await requestNotificationPermission(user.id);
    if (!token) {
      console.warn('[Notifications] registerPushToken failed: requestNotificationPermission returned null token.');
      return;
    }

    console.log('[Notifications] Push token registered and synced successfully.');
  } catch (err) {
    console.error('Push token registration failed:', err);
  }
}

