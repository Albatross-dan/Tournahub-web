import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker and clean up legacy non-PWA workbox registrations safely
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Set up update handler on controller change to reload the page with fresh scripts instantly
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[SW] Controller changed. Reloading page...');
    window.location.reload();
  });

  // Register the PWA service worker
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('[SW] PWA Service Worker registered successfully with scope:', reg.scope);
      
      // Proactively check for updates on startup
      reg.update();

      // If a newer version is already waiting, trigger its skipWaiting
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Add a listener to notify and transition if a new update is found
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version detected, updating standard active controller...');
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          };
        }
      };
    })
    .catch((err) => {
      console.error('[SW] PWA Service Worker registration failed:', err);
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
      });
    }
  });

  // Safely clear old legacy cache storage while preserving our main active dynamic caches
  if ('caches' in window) {
    const CURRENT_ACTIVE_VERSION = 'v5';
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        // Force-delete old tournahub caches that do not match our active v5 version
        const isOldTournahubCache = key.startsWith('tournahub-') && !key.endsWith(`-${CURRENT_ACTIVE_VERSION}`);
        const isPreserved = key.startsWith('tournahub-') || key === 'TOURNAHUB_PWA_CACHE' || key.startsWith('firebase-');
        
        if (isOldTournahubCache || !isPreserved) {
          caches.delete(key).then(() => {
            console.log('[SW Cleanup] Cleared stale/unsupported cache storage:', key);
          });
        }
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
