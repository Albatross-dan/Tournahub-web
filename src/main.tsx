import './lib/sentry';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker and clean up legacy non-PWA workbox registrations safely
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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

    // Register the PWA service worker with updateViaCache: 'none' to bypass browser caching of sw.js itself
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        console.log('[SW] PWA Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] PWA Service Worker registration failed:', err);
      });

    // Clean up other unrecognized legacy service workers safely
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
        const isFcm = scriptURL.includes('firebase-messaging-sw');
        const isPwaSw = scriptURL.includes('sw.js');
        
        // If it is a legacy separate FCM service worker, unregister it to prevent scope conflicts
        if (isFcm) {
          console.log('[SW Cleanup] Unregistering legacy separate FCM service worker to avoid conflicts:', registration.scope, scriptURL);
          registration.unregister().catch(() => {});
          continue;
        }

        // Critically guard against unregistering empty/initializing scripts or our active service workers
        if (!scriptURL || isPwaSw) {
          console.log('[SW Cleanup] Preserving active/initializing service worker registration:', registration.scope, scriptURL);
          continue;
        }
        
        registration.unregister().then((success) => {
          if (success) {
            console.log('[SW Cleanup] Unregistered legacy service worker:', registration.scope);
          }
        }).catch(() => {});
      }
    }).catch((e) => {
      console.warn('[SW Cleanup] getRegistrations failed:', e);
    });

    // Safely clear old legacy cache storage while preserving our main active dynamic caches
    try {
      if ('caches' in window) {
        const CURRENT_ACTIVE_VERSION = 'v5';
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            // Force-delete old tournahub caches that do not match our active v5 version
            const isOldTournahubCache = key.startsWith('tournahub-') && !key.endsWith(`-${CURRENT_ACTIVE_VERSION}`);
            const isPreserved = key.startsWith('tournahub-') || key === 'TOURNAHUB_PWA_CACHE' || key.startsWith('firebase-');
            
            if (isOldTournahubCache || !isPreserved) {
              caches.delete(key).catch(() => {}).then(() => {
                console.log('[SW Cleanup] Cleared stale/unsupported cache storage:', key);
              });
            }
          });
        }).catch((e) => {
          console.warn('[SW Cleanup] Error listing caches keys:', e);
        });
      }
    } catch (cacheErr) {
      console.warn('[SW Cleanup] window.caches is blocked or throws a SecurityError:', cacheErr);
    }
  }
} catch (swErr) {
  console.warn('[SW Cleanup] serviceWorker is blocked or throws a SecurityError:', swErr);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
