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

  const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[Notifications] VITE_FIREBASE_VAPID_KEY is missing in environment variables. FCM registration aborted.');
    return null;
  }

  try {
    // 2. Request / Check Notification Permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log(`[Notifications] Permission state: ${permission}. Cannot obtain FCM token.`);
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
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      // Wait for service worker to finish activating if needed
      await navigator.serviceWorker.ready;
      console.log('[Notifications] Service Worker registered successfully:', swRegistration.scope);
    } catch (swErr) {
      console.warn('[Notifications] Custom Service Worker registration failed (falling back to automatic default):', swErr);
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

    // 6. Save and Sync to Supabase table: 'notification_tokens'
    await syncTokenToSupabase(userId, token);

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
async function syncTokenToSupabase(userId: string, token: string): Promise<void> {
  try {
    const supabaseAny = supabase as any;
    
    // Check if the token already exists in database
    const { data: existing, error: fetchError } = await supabaseAny
      .from('notification_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchError) {
      // Fallback: simple upsert on generic database error (permission or table exist checks)
      console.log('[Notifications] Query error during token checking. Attempting fallback upsert...', fetchError.message);
      await supabaseAny
        .from('notification_tokens')
        .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
      return;
    }

    if (!existing) {
      // Insert new token
      const { error: insertError } = await supabaseAny
        .from('notification_tokens')
        .insert({
          user_id: userId,
          token,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.warn('[Notifications] Insert failed. Attempting fallback upsert...', insertError.message);
        await supabaseAny
          .from('notification_tokens')
          .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
      } else {
        console.log('[Notifications] New token and user mapping saved successfully.');
      }
    } else if (existing.user_id !== userId) {
      // Unlink and update to new user identifier if another user is current on this browser key
      const { error: updateError } = await supabaseAny
        .from('notification_tokens')
        .update({
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('token', token);

      if (updateError) {
        console.warn('[Notifications] Token owner update failed:', updateError.message);
      } else {
        console.log('[Notifications] Updated token user mapping successfully.');
      }
    } else {
      console.log('[Notifications] Token is already up-to-date in database.');
    }
  } catch (syncErr) {
    console.error('[Notifications] Supabase token sync operation failed safely:', syncErr);
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
