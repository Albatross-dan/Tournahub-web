import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X, RefreshCw } from 'lucide-react';

interface PwaUpdateContextType {
  updateAvailable: boolean;
  appVersion: string;
  triggerUpdate: () => void;
  dismissUpdate: () => void;
}

const PwaUpdateContext = createContext<PwaUpdateContextType | undefined>(undefined);

export const usePwaUpdate = () => {
  const context = useContext(PwaUpdateContext);
  if (!context) {
    throw new Error('usePwaUpdate must be used within a PwaUpdateProvider');
  }
  return context;
};

export const PwaUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const isRefreshingRef = useRef(false);

  // App version derived automatically from package.json version via Vite define
  const appVersion = process.env.APP_VERSION || '1.0.24';

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleWaitingWorker = (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker;
      setUpdateAvailable(true);

      // Check if this is a fresh start/session reopen (session_active is not set in sessionStorage)
      // If it is fresh, we auto-apply the update instantly without prompting!
      let isFreshSession = false;
      try {
        isFreshSession = !sessionStorage.getItem('tournahub_session_active');
      } catch (e) {
        console.warn('[PWA Update] sessionStorage blocked:', e);
      }

      if (isFreshSession) {
        console.log('[PWA Update] Fresh session detected with waiting service worker. Auto-applying update...');
        try {
          sessionStorage.setItem('tournahub_session_active', 'true');
        } catch (e) {}
        worker.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      setShowBanner(true);
    };

    // 1. Check current service worker status on load
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // If there's already a waiting worker, capture it
      if (reg.waiting) {
        console.log('[PWA Update] Found waiting service worker on load.');
        handleWaitingWorker(reg.waiting);
      }

      // Listen for new installing workers
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[PWA Update] New service worker version installed and waiting.');
              handleWaitingWorker(installingWorker);
            }
          }
        };
      };
    }).catch((err) => {
      console.warn('[PWA Update] Failed to get SW registration:', err);
    });

    // Mark active session so we don't reload aggressively while user is interacting in a single active session
    try {
      sessionStorage.setItem('tournahub_session_active', 'true');
    } catch (e) {}

    // 2. Refresh page when active service worker changes (controllerchange)
    const handleControllerChange = () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      console.log('[PWA Update] Controller changed. Reloading page...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // 3. Resume and Background handling:
  // - Check for updates when returning from background
  // - Auto-apply waiting updates silently when app goes to background (hidden)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const checkUpdateAndAutoApply = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        if (document.visibilityState === 'visible') {
          console.log('[PWA Update] App resumed. Triggering registration update check...');
          await reg.update();
        } else if (document.visibilityState === 'hidden' && reg.waiting) {
          // Silent background update: if user minimizes the app or turns off the screen
          // and an update is waiting, we activate it immediately so next launch is fresh!
          console.log('[PWA Update] App went to hidden state. Silent update triggered...');
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (err) {
        console.warn('[PWA Update] Background update check/apply failed:', err);
      }
    };

    document.addEventListener('visibilitychange', checkUpdateAndAutoApply);
    return () => {
      document.removeEventListener('visibilitychange', checkUpdateAndAutoApply);
    };
  }, []);

  // 4. Trigger active update: send SKIP_WAITING to waiting worker
  const triggerUpdate = () => {
    if (waitingWorkerRef.current) {
      console.log('[PWA Update] Sending SKIP_WAITING to waiting service worker.');
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback: reload anyway
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setShowBanner(false);
  };

  return (
    <PwaUpdateContext.Provider value={{ updateAvailable, appVersion, triggerUpdate, dismissUpdate }}>
      {children}

      {/* Non-intrusive Update Banner matching Tournahub Design System */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            id="pwa-update-banner"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 z-[9999] p-4 rounded-2xl bg-zinc-950/95 border border-blue-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase italic tracking-tight flex items-center gap-1.5">
                    🚀 New Version Ready
                  </h4>
                  <p className="text-[11px] font-medium text-zinc-400 leading-normal mt-1">
                    An update of Tournahub is available. Tap Update to load the latest features instantly.
                  </p>
                  <p className="text-[9px] font-mono text-zinc-500 mt-1">
                    Build version: {appVersion}
                  </p>
                </div>
              </div>
              <button
                id="pwa-update-dismiss-btn"
                onClick={dismissUpdate}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2.5 mt-3.5 pt-3 border-t border-zinc-900">
              <button
                id="pwa-update-later-btn"
                onClick={dismissUpdate}
                className="flex-1 py-2 rounded-xl text-xs font-black text-zinc-400 uppercase italic bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800/80 active:scale-[0.98]"
              >
                Later
              </button>
              <button
                id="pwa-update-now-btn"
                onClick={triggerUpdate}
                className="flex-1 py-2 rounded-xl text-xs font-black text-black uppercase italic bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(59,130,246,0.3)] active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                Update Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PwaUpdateContext.Provider>
  );
};
