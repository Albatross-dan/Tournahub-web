import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker and clean up legacy non-PWA workbox registrations safely
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Register the PWA service worker
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('[SW] PWA Service Worker registered successfully with scope:', reg.scope);
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
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        const isPreserved = key.startsWith('tournahub-') || key === 'TOURNAHUB_PWA_CACHE' || key.startsWith('firebase-');
        if (!isPreserved) {
          caches.delete(key).then(() => {
            console.log('[SW Cleanup] Cleared legacy cache storage:', key);
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
