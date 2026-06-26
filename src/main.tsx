import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker and clean up legacy non-PWA workbox registrations safely
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Register the PWA service worker with updateViaCache: 'none' to bypass browser caching of sw.js itself
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        console.log('[SW] PWA Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] PWA Service Worker registration failed:', err);
      });

    // Clean up other unrecognized legacy service workers
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
        const isFcm = scriptURL.includes('firebase-messaging-sw');
        const isPwaSw = scriptURL.includes('sw.js');
        
        if (isFcm || isPwaSw) {
          console.log('[SW Cleanup] Preserving active service worker registration:', registration.scope, scriptURL);
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
