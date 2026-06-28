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
      console.log('[Push SW] Background message received:', payload);
      
      // Fallbacks for data-only or legacy notification structures
      const title = payload.notification?.title || payload.data?.title || 'Tournahub Alert';
      const body = payload.notification?.body || payload.data?.body || '';
      const icon = payload.notification?.image || payload.data?.image || '/favicon.ico';
      
      // Critical: construct structured data payload so click handler knows where to go
      const notificationOptions = {
        body,
        icon,
        badge: '/favicon.ico',
        data: {
          // Essential: backend can send routes in multiple keys
          click_action: payload.data?.click_action || payload.data?.url || '/notifications',
          notification_id: payload.data?.notification_id
        },
        tag: payload.data?.notification_id || 'tournahub-alert', // consolidate duplicates
        renotify: true
      };

      return self.registration.showNotification(title, notificationOptions);
    });
    
    console.log('[firebase-messaging-sw.js] Configured and fully operational.');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Initialization crashed:', error);
  }
} else {
  console.warn('[firebase-messaging-sw.js] Placeholders/empty configuration detected. Waiting for credentials via script query registration params.');
}

// CLICK ACTION HANDLER
self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification click:', event);
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/';
  
  // Construct absolute URL
  const targetUrl = new URL(clickAction, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if tab is already open and navigate it, or focus it,
        // OR open a brand new tab and broadcast the click event to it
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === targetUrl && 'focus' in client) {
            // Send message to the active client so it can reload or update state
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              notification_id: event.notification.data?.notification_id
            });
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(targetUrl).then((windowClient) => {
            if (windowClient) {
              // Wait for the new tab to load, then postMessage
              // This is captured by the useNotifications hook
              setTimeout(() => {
                windowClient.postMessage({
                  type: 'NOTIFICATION_CLICKED',
                  notification_id: event.notification.data?.notification_id
                });
              }, 2000);
            }
          });
        }
      })
  );
});
