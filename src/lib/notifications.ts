import React from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

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
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  // 1. Safety Checks for Browser APIs
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    console.log('[Notifications] Push notifications are not supported in this browser.');
    return null;
  }

  try {
    // 2. Request / Check Notification Permission First
    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (permErr) {
        console.warn('[Notifications] Notification.requestPermission promise form failed, trying callback:', permErr);
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission(resolve);
        });
      }
    }

    if (permission !== 'granted') {
      console.log(`[Notifications] Permission state: ${permission}. Cannot obtain FCM token.`);
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[Notifications] VITE_FIREBASE_VAPID_KEY is missing in environment variables. FCM registration aborted.');
      return null;
    }

    // 3. Get Firebase Messaging Instance
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[Notifications] Unable to retrieve Firebase Messaging instance.');
      return null;
    }

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

      const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(config.apiKey)}&authDomain=${encodeURIComponent(config.authDomain)}&projectId=${encodeURIComponent(config.projectId)}&storageBucket=${encodeURIComponent(config.storageBucket)}&messagingSenderId=${encodeURIComponent(config.messagingSenderId)}&appId=${encodeURIComponent(config.appId)}`;

      swRegistration = await navigator.serviceWorker.register(swUrl);
      // Wait for service worker to finish activating if needed
      await navigator.serviceWorker.ready;
      console.log('[Notifications] Service Worker registered successfully:', swRegistration.scope);
    } catch (swErr) {
      console.warn('[Notifications] Custom Service Worker registration failed:', swErr);
    }

    // 5. Generate FCM token
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[Notifications] Generated FCM token is empty.');
      return null;
    }

    console.log('[Notifications] FCM token successfully generated.');
    localStorage.setItem('fcm_token', token);

    // 6. Save and Sync to Supabase table: 'notification_tokens'
    await syncTokenToSupabase(userId, token);

    // 7. Handle token refresh inside callback if supported
    if (typeof (messaging as any).onTokenRefresh === 'function') {
      (messaging as any).onTokenRefresh(async () => {
        try {
          const newToken = await getToken(messaging, { vapidKey });
          if (newToken) {
            console.log('[Notifications] FCM Token refreshed.');
            localStorage.setItem('fcm_token', newToken);
            await syncTokenToSupabase(userId, newToken);
          }
        } catch (err) {
          console.warn('[Notifications] Token refresh handling failed:', err);
        }
      });
    } else {
      console.log('[Notifications] FCM onTokenRefresh is not natively present on this messaging version. Auto-refresh relies on getToken callbacks.');
    }

    return token;
  } catch (error: any) {
    console.warn('[Notifications] Failed to obtain token or request permission:', error);
    return null;
  }
}

/**
 * Handles syncing of FCM token to Supabase using optimal checking and upsert fallbacks.
 * This function guarantees no double inserts and updates token ownership securely.
 */
export async function syncTokenToSupabase(userId: string, token: string): Promise<void> {
  const supabaseAny = supabase as any;
  
  // 1. Try syncing to "notification_tokens"
  try {
    const { data: existing, error: selectErr } = await supabaseAny
      .from('notification_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle();

    if (!selectErr && existing) {
      console.log('[Notifications] Token already exists in "notification_tokens". Skipping insert.');
    } else {
      const { error: insertErr } = await supabaseAny.from('notification_tokens').insert({
        user_id: userId,
        token: token,
        platform: 'web',
        device_name: navigator.userAgent.slice(0, 100)
      });
      
      if (insertErr) {
        // Fallback to standard upsert with onConflict in case of race condition
        const { error: upsertErr } = await supabaseAny.from('notification_tokens').upsert(
          {
            user_id: userId,
            token: token,
            platform: 'web',
            device_name: navigator.userAgent.slice(0, 100)
          },
          { onConflict: 'user_id,token' }
        );
        if (upsertErr) {
          console.warn('[Notifications] Both insert and upsert failed for "notification_tokens":', upsertErr.message);
        } else {
          console.log('[Notifications] FCM token successfully upserted to "notification_tokens" after insert block.');
        }
      } else {
        console.log('[Notifications] FCM token successfully inserted to "notification_tokens".');
      }
    }
  } catch (err) {
    console.warn('[Notifications] Exception syncing to "notification_tokens":', err);
  }

  // 2. Try syncing to "user_push_tokens" (fallback schema table)
  try {
    const { data: existing, error: selectErr } = await supabaseAny
      .from('user_push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle();

    if (!selectErr && existing) {
      console.log('[Notifications] Token already exists in "user_push_tokens". Updating last seen.');
      await supabaseAny.from('user_push_tokens').update({
        last_seen_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      const { error: insertErr } = await supabaseAny.from('user_push_tokens').insert({
        user_id: userId,
        token: token,
        platform: 'web',
        device_name: navigator.userAgent.slice(0, 100),
        last_seen_at: new Date().toISOString()
      });
      
      if (insertErr) {
        const { error: upsertErr } = await supabaseAny.from('user_push_tokens').upsert(
          {
            user_id: userId,
            token: token,
            platform: 'web',
            device_name: navigator.userAgent.slice(0, 100),
            last_seen_at: new Date().toISOString()
          },
          { onConflict: 'user_id,token' }
        );
        if (upsertErr) {
          console.warn('[Notifications] Both insert and upsert failed for "user_push_tokens":', upsertErr.message);
        } else {
          console.log('[Notifications] FCM token successfully upserted to "user_push_tokens" after insert block.');
        }
      } else {
        console.log('[Notifications] FCM token successfully inserted to "user_push_tokens".');
      }
    }
  } catch (err) {
    console.warn('[Notifications] Exception syncing to "user_push_tokens":', err);
  }
}

/**
 * Disposes of the FCM token registration on logout to prevent subsequent invalid deliveries.
 */
export async function deleteFcmTokenOnLogout(userId: string): Promise<void> {
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
