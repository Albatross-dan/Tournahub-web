/**
 * Tournahub PWA Service Worker
 * Implements a resilient custom offline-first caching strategy:
 * - Aggressive Cache-First with Network fallback for static assets (hashes on build guarantee safety).
 * - Network-First falling back to Cached SPA Shell for page navigation requests (prevents offline blank pages).
 * - Stale-While-Revalidate for images, fonts, and external assets (icons, stylesheets).
 * - Safely bypasses mutating API calls (POST/PUT/DELETE) and active third-party integrations (Supabase, Firebase, FCM).
 */

// Dynamically import and configure Firebase Cloud Messaging if configuration query parameters are present
try {
  const params = new URLSearchParams(self.location.search);
  const firebaseConfig = {
    apiKey: params.get('apiKey') || '',
    authDomain: params.get('authDomain') || '',
    projectId: params.get('projectId') || '',
    storageBucket: params.get('storageBucket') || '',
    messagingSenderId: params.get('messagingSenderId') || '',
    appId: params.get('appId') || ''
  };

  const isValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

  if (isValidConfig) {
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

    // Initialize Firebase inside the main PWA Service Worker
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background message notifications
    messaging.onBackgroundMessage((payload) => {
      console.log('[Push SW] Background message received:', payload);
      
      const title = payload.notification?.title || payload.data?.title || 'Tournahub Alert';
      const body = payload.notification?.body || payload.data?.body || '';
      const icon = payload.notification?.image || payload.data?.image || '/favicon.ico';
      
      const notificationOptions = {
        body,
        icon,
        badge: '/favicon.ico',
        data: {
          click_action: payload.data?.click_action || payload.data?.url || '/notifications',
          notification_id: payload.data?.notification_id
        },
        tag: payload.data?.notification_id || 'tournahub-alert',
        renotify: true
      };

      return self.registration.showNotification(title, notificationOptions);
    });
    
    console.log('[SW] Firebase Cloud Messaging integrated successfully.');
  }
} catch (fcmErr) {
  console.warn('[SW] Firebase Cloud Messaging integration skipped or failed:', fcmErr);
}

const CACHE_VERSION = 'v5';
const STATIC_CACHE = `tournahub-static-${CACHE_VERSION}`;
const SHELL_CACHE = `tournahub-public-${CACHE_VERSION}`;
const EXTERNAL_CACHE = `tournahub-external-${CACHE_VERSION}`;

// Core static assets to pre-cache immediately on SW installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt'
];

// Build-time injected assets placeholder
// workbox-build will inject the manifest here.
const INJECTED_ASSETS = self.__WB_MANIFEST || [];

// Helper to check if a URL is an asset we want to cache-first
const STATIC_ASSETS_REGEX = /\.(js|css|woff2?|ttf|png|jpe?g|gif|svg|ico)$/i;

// Helper to limit cache size by evicting oldest entries first
function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        Promise.all(
          keysToDelete.map((key) => {
            console.log(`[SW] Evicting old entry from ${cacheName}:`, key.url);
            return cache.delete(key);
          })
        ).catch((err) => {
          console.error(`[SW] Failed to evict entries from ${cacheName}:`, err);
        });
      }
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      console.log('[SW] Pre-caching application shell assets with cache-busting...');
      const manifestAssets = INJECTED_ASSETS.map(entry => typeof entry === 'string' ? entry : entry.url);
      const allAssetsToPrecache = [...new Set([...PRECACHE_ASSETS, ...manifestAssets])];

      // Fetch each precached asset with a cache-buster but store it under its clean URL path
      for (const asset of allAssetsToPrecache) {
        try {
          const isHashed = asset.includes('assets/');
          const cacheBustedUrl = isHashed ? asset : `${asset}${asset.includes('?') ? '&' : '?'}cb=${Date.now()}`;
          const response = await fetch(new Request(cacheBustedUrl, { cache: 'reload' }));
          if (response.ok) {
            await cache.put(asset, response);
            console.log(`[SW] Pre-cached asset successfully: ${asset}`);
          } else {
            console.warn(`[SW] Pre-cache returned status ${response.status} for asset: ${asset}`);
          }
        } catch (err) {
          console.error(`[SW] Pre-cache failed for asset: ${asset}`, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName.startsWith('tournahub-') &&
            cacheName !== STATIC_CACHE &&
            cacheName !== SHELL_CACHE &&
            cacheName !== EXTERNAL_CACHE
          ) {
            console.log('[SW] Clearing old service worker cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Bypass non-GET requests (e.g., POST submit-results, PUT profile, SSE, WebSockets)
  if (request.method !== 'GET') {
    return;
  }

  // Bypass requests with Range headers to prevent media/image decoding corruption in Chrome/Safari
  if (request.headers.has('range')) {
    return;
  }

  // 2. Bypass hot-module replacement and specific websocket dev environments
  if (url.search.includes('bypass') || url.pathname.includes('hot-update') || url.port === '5173') {
    return;
  }

  // 3. Bypass Supabase APIs, Firebase authentication state, and FCM endpoints
  const isApiRequest = url.host.includes('supabase.co') || 
                       url.pathname.includes('/api/') || 
                       url.host.includes('firebase') || 
                       url.pathname.includes('identitytoolkit') ||
                       request.url.includes('googleapis.com');

  // Exception: Cache public Supabase storage assets (like user avatars and screenshots)
  const isSupabaseStorage = url.host.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/');

  if (isApiRequest && !isSupabaseStorage) {
    // Force standard network strategy for auth/APIs, no SW cache intercept
    return;
  }

  // 4. SPA Navigation Strategy: Network-First falling back to Cached SPA shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep navigation cache updated
          const responseClone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => {
            cache.put('/index.html', responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed, serve the cached SPA shell
          console.log('[SW] Navigation failed. Serving cached index.html SPA shell.');
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 5. Static Assets Strategy (Self-hosted JS, CSS, client-side fonts, manifest)
  const isSelfOrigin = url.origin === self.location.origin;
  if (isSelfOrigin && STATIC_ASSETS_REGEX.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cache immediately (extremely fast, safe due to Vite content hashes)
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // 6. Stale-While-Revalidate Strategy for media, external fonts, icons, avatars, Google Maps scripts
  if (isSupabaseStorage || url.host.includes('fonts.gstatic.com') || url.host.includes('fonts.googleapis.com') || url.host.includes('unsplash.com')) {
    event.respondWith(
      caches.open(EXTERNAL_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone()).then(() => {
                limitCacheSize(EXTERNAL_CACHE, 150);
              });
            }
            return networkResponse;
          }).catch((err) => {
            console.log('[SW] SW failing silently on background cache update for:', request.url, err);
          });

          // Return cache if we have it, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
});

// Message listener to trigger activation of the waiting service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, activating immediately...');
    self.skipWaiting();
  }
});

// CLICK ACTION HANDLER for background notifications
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

