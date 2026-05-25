import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWADiagnostics {
  manifestExists: boolean;
  manifestData: any | null;
  manifestError: string | null;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerActive: boolean;
  serviceWorkerState: string | null;
  isControlled: boolean;
  isStandalone: boolean;
  isIframe: boolean;
  beforeInstallPromptSupported: boolean;
  beforeInstallPromptFired: boolean;
  isInstallable: boolean;
  userAgent: string;
  hasSubscribedToEvents: boolean;
  diagnosedAt: string;
  cooldownPassed: boolean;
}

// Global variable to hold state so different instances show the same prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let pwaFired = false;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA Console Diagnostics] 🔔 beforeinstallprompt event fired!', e);
    // Prevent the default browser mini-infobar prompt
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    pwaFired = true;
    listeners.forEach((listener) => listener());
  });

  window.addEventListener('appinstalled', (e) => {
    console.log('[PWA Console Diagnostics] 🎉 App installed successfully!', e);
    deferredPrompt = null;
    listeners.forEach((listener) => listener());
  });
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [isInstallable, setIsInstallable] = useState(pwaFired && !isStandaloneMode());
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode());
  const [diagnostics, setDiagnostics] = useState<PWADiagnostics>({
    manifestExists: false,
    manifestData: null,
    manifestError: null,
    serviceWorkerSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    serviceWorkerRegistered: false,
    serviceWorkerActive: false,
    serviceWorkerState: null,
    isControlled: typeof navigator !== 'undefined' && navigator.serviceWorker ? !!navigator.serviceWorker.controller : false,
    isStandalone: isStandaloneMode(),
    isIframe: typeof window !== 'undefined' ? window.self !== window.top : false,
    beforeInstallPromptSupported: typeof window !== 'undefined' && 'onbeforeinstallprompt' in window,
    beforeInstallPromptFired: pwaFired,
    isInstallable: pwaFired && !isStandaloneMode(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    hasSubscribedToEvents: true,
    diagnosedAt: new Date().toISOString(),
    cooldownPassed: true,
  });

  function isStandaloneMode(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // Auto-refresh hook state when the global deferred prompt triggers
  useEffect(() => {
    const updateState = () => {
      const stand = isStandaloneMode();
      setInstallPrompt(deferredPrompt);
      setIsStandalone(stand);
      setIsInstallable(!!deferredPrompt && !stand);
      
      setDiagnostics((prev) => ({
        ...prev,
        beforeInstallPromptFired: pwaFired,
        isInstallable: !!deferredPrompt && !stand,
        isStandalone: stand,
        isControlled: typeof navigator !== 'undefined' && navigator.serviceWorker ? !!navigator.serviceWorker.controller : false,
      }));
    };

    listeners.add(updateState);
    return () => {
      listeners.delete(updateState);
    };
  }, []);

  // Run deep live PWA diagnostics on mount and periodically
  useEffect(() => {
    let active = true;

    async function runDiagnostics() {
      console.log('[PWA Console Diagnostics] Run Deep PWA Verification started...');
      
      const isIframe = window.self !== window.top;
      const isStandaloneActive = isStandaloneMode();
      
      // 1. Audit site.webmanifest
      let manifestExists = false;
      let manifestData: any = null;
      let manifestError: string | null = null;
      try {
        const response = await fetch('/site.webmanifest', { cache: 'no-store' });
        if (response.ok) {
          const text = await response.text();
          manifestExists = true;
          try {
            manifestData = JSON.parse(text);
            console.log('[PWA Console Diagnostics] ✅ site.webmanifest fetched & parsed successfully:', manifestData);
          } catch (jsonErr: any) {
            manifestError = `JSON parse failed: ${jsonErr.message}`;
            console.error('[PWA Console Diagnostics] ❌ site.webmanifest contains invalid JSON structure', jsonErr);
          }
        } else {
          manifestError = `HTTP ${response.status}: ${response.statusText}`;
          console.error(`[PWA Console Diagnostics] ❌ site.webmanifest failed to load (${response.status})`);
        }
      } catch (fetchErr: any) {
        manifestError = `Fetch error: ${fetchErr.message}`;
        console.error('[PWA Console Diagnostics] ❌ Network error while auditing manifest', fetchErr);
      }

      // 2. Audit Service Worker registration and controller
      let serviceWorkerRegistered = false;
      let serviceWorkerActive = false;
      let serviceWorkerState: string | null = null;

      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          serviceWorkerRegistered = regs.length > 0;
          
          if (serviceWorkerRegistered) {
            const activeReg = regs.find(r => r.active !== null) || regs[0];
            if (activeReg) {
              const swInstance = activeReg.active || activeReg.installing || activeReg.waiting;
              serviceWorkerState = swInstance ? swInstance.state : 'registered';
              serviceWorkerActive = activeReg.active !== null;
              
              console.log('[PWA Console Diagnostics] ✅ Detected SW registrations:', regs.map(r => ({
                scope: r.scope,
                active: !!r.active,
                waiting: !!r.waiting,
                installing: !!r.installing,
              })));
            }
          } else {
            console.warn('[PWA Console Diagnostics] ⚠️ No active service workers registered. If loading for the first time, registration might be in progress.');
          }
        } catch (swErr) {
          console.error('[PWA Console Diagnostics] Error loading SW registrations:', swErr);
        }
      }

      const info: PWADiagnostics = {
        manifestExists,
        manifestData,
        manifestError,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerRegistered,
        serviceWorkerActive,
        serviceWorkerState,
        isControlled: !!navigator.serviceWorker?.controller,
        isStandalone: isStandaloneActive,
        isIframe,
        beforeInstallPromptSupported: 'onbeforeinstallprompt' in window,
        beforeInstallPromptFired: pwaFired,
        isInstallable: !!deferredPrompt && !isStandaloneActive,
        userAgent: navigator.userAgent,
        hasSubscribedToEvents: true,
        diagnosedAt: new Date().toISOString(),
        cooldownPassed: true,
      };

      if (active) {
        setDiagnostics(info);
      }
    }

    runDiagnostics();
    const interval = setInterval(runDiagnostics, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA Console Diagnostics] Tried to trigger installApp but deferredPrompt is null.');
      return false;
    }

    try {
      console.log('[PWA Console Diagnostics] Triggering browser installation prompt interface...');
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA Console Diagnostics] Event prompt completed with user outcome: ${outcome}`);
      
      if (outcome === 'accepted') {
        deferredPrompt = null;
        pwaFired = false;
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('[PWA Console Diagnostics] Error displaying native installation prompt:', err);
    }
    
    return false;
  };

  // Diagnostic tool/utility actions
  const unregisterServiceWorkers = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      console.log('[PWA Console Diagnostics] Requesting SW unregistration for safe refresh...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[PWA Console Diagnostics] Successfully unregistered service worker:', registration.scope);
      }
      return true;
    } catch (e) {
      console.error('[PWA Console Diagnostics] Failed to unregister service workers:', e);
      return false;
    }
  };

  const clearPaiCaches = async (): Promise<boolean> => {
    if (!('caches' in window)) return false;
    try {
      console.log('[PWA Console Diagnostics] Cleaning site storage and caches...');
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log('[PWA Console Diagnostics] Deleted Cache Storage partition:', name);
      }
      return true;
    } catch (e) {
      console.error('[PWA Console Diagnostics] Failed to clear application caches:', e);
      return false;
    }
  };

  const forceFullBypassReload = () => {
    console.log('[PWA Console Diagnostics] Executing deep browser bypass-cache layout refresh...');
    window.location.reload();
  };

  return { 
    isInstallable, 
    isStandalone, 
    installApp, 
    diagnostics,
    unregisterServiceWorkers,
    clearPaiCaches,
    forceFullBypassReload
  };
}
