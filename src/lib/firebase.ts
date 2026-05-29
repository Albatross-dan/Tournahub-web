import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if minimum configuration is present
const hasConfig = 
  !!firebaseConfig.apiKey && 
  !!firebaseConfig.projectId && 
  !!firebaseConfig.messagingSenderId && 
  !!firebaseConfig.appId;

let app: FirebaseApp | undefined;
let messaging: Messaging | null = null;

if (hasConfig && typeof window !== 'undefined') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Attempt to initialize messaging synchronously if the browser supports it.
    // This allows immediate imports while preventing crashes in environments where standard APIs are missing.
    if ('serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.warn('[Firebase] Failed to initialize Firebase App or Messaging during startup:', error);
  }
} else {
  console.warn('[Firebase] Configuration keys are missing or not in window. FCM features are disabled.');
}

/**
 * Safely retrieves the Firebase Messaging instance after performing asynchronous compatibility checks.
 * This is the recommended way to interact with FCM in production to prevent crashes in unsupported browsers.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (!app) return null;
  
  try {
    const supported = await isSupported();
    if (supported) {
      if (!messaging) {
        messaging = getMessaging(app);
      }
      return messaging;
    }
  } catch (err) {
    console.warn('[Firebase] Error checking FCM support or initializing messaging:', err);
  }
  return null;
}

export { app, messaging };
