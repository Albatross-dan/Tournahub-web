import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister legacy service workers and clear cache storage
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const isActiveFcm = registration.active && registration.active.scriptURL.includes('firebase-messaging-sw');
      const isInstallingFcm = registration.installing && registration.installing.scriptURL.includes('firebase-messaging-sw');
      const isWaitingFcm = registration.waiting && registration.waiting.scriptURL.includes('firebase-messaging-sw');
      const isScopeFcm = registration.scope.includes('firebase-messaging-sw');
      
      if (isActiveFcm || isInstallingFcm || isWaitingFcm || isScopeFcm) {
        console.log('[SW Cleanup] Preserving active FCM service worker registration:', registration.scope);
        continue;
      }
      registration.unregister().then((success) => {
        if (success) {
          console.log('[SW Cleanup] Unregistered legacy service worker:', registration.scope);
        }
      });
    }
  });

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key).then(() => {
          console.log('[SW Cleanup] Cleared CacheStorage cache:', key);
        });
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
