/**
 * Tournahub Firebase Cloud Messaging Service Worker
 * 
 * This file handles background push notifications when the Tournahub website
 * is closed or running in the background.
 */

// Import Firebase App and Messaging Compat libraries from CDN
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/**
 * Configure Firebase app context.
 * Parses query parameters first for dynamic runtime setups, or falls back to placeholders.
 */
const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || "PLACEHOLDER_VITE_FIREBASE_API_KEY",
  authDomain: params.get('authDomain') || "PLACEHOLDER_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: params.get('projectId') || "PLACEHOLDER_VITE_FIREBASE_PROJECT_ID",
  storageBucket: params.get('storageBucket') || "PLACEHOLDER_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: params.get('messagingSenderId') || "PLACEHOLDER_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: params.get('appId') || "PLACEHOLDER_VITE_FIREBASE_APP_ID"
};

// Check if configurator has replaced placeholder keys or if we received real keys from query parameters
const isValidConfig = firebaseConfig.apiKey && 
                      !firebaseConfig.apiKey.startsWith('PLACEHOLDER_') && 
                      firebaseConfig.apiKey !== "";

if (isValidConfig) {
  try {
    // 1. Initialize Firebase inside Service Worker
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // 2. Handle background message notifications
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background message payload:', payload);

      if (!payload) return;

      const { title, body, image } = payload.notification ?? {};
      const data = payload.data ?? {};

      const notificationTitle = title || data.title || 'Tournahub Announcement';
      const notificationOptions = {
        body: body || data.body || '',
        icon: image || data.image || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        // Preserve all incoming payload data for click action matching
        data: {
          url: data.url || data.click_action || '/',
          notification_id: data.notification_id,
          type: data.type,
          priority: data.priority,
        },
        requireInteraction: ['high', 'critical'].includes(data.priority),
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    console.log('[firebase-messaging-sw.js] Configured and fully operational.');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Initialization crashed:', error);
  }
} else {
  console.warn('[firebase-messaging-sw.js] Placeholders/empty configuration detected. Waiting for credentials via script query registration params.');
}

/**
 * Handle notification click behavior
 * Navigates to click_action or focuses an existing window if possible.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click detected.', event);
  event.notification.close();

  // Extract click_action or fallback to home page representation
  let clickAction = '/';
  if (event.notification.data) {
    clickAction = event.notification.data.click_action || event.notification.data.url || '/';
  }

  // Resolve target location relative to domain host URL if short-form pathing is set
  let targetUrl = clickAction;
  if (targetUrl.startsWith('/')) {
    targetUrl = new URL(targetUrl, self.location.origin).toString();
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Traverse and find if a matching window is open, then focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 2. Otherwise open a new window to target URL route
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
