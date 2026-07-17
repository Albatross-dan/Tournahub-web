import { useState, useEffect } from 'react';

// Keep track of the deferred prompt globally so that if it fires before a specific component mounts, we don't lose it.
let deferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch a custom event to notify any mounted hook instances
    window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));

    // Automatically trigger on first user gesture (click or touch) if not prompted in this session
    const handleFirstGesture = () => {
      try {
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
        if (deferredPrompt && !isInstalled && !sessionStorage.getItem('pwa_prompt_fired_automatically')) {
          sessionStorage.setItem('pwa_prompt_fired_automatically', 'true');
          console.log('[PWA] Automatically triggering installation prompt on first user gesture.');
          deferredPrompt.prompt()
            .then(() => deferredPrompt.userChoice)
            .then(({ outcome }: any) => {
              console.log(`[PWA] Auto prompt user choice outcome: ${outcome}`);
              // Always clear the prompt as it can only be called once
              deferredPrompt = null;
              window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));
            })
            .catch((err: any) => {
              console.warn('[PWA] Auto prompt failed or was cancelled:', err);
              deferredPrompt = null;
              window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));
            });
        }
      } catch (err) {
        console.warn('[PWA] Auto prompt gesture error:', err);
      } finally {
        document.removeEventListener('click', handleFirstGesture);
        document.removeEventListener('touchstart', handleFirstGesture);
      }
    };

    document.addEventListener('click', handleFirstGesture);
    document.addEventListener('touchstart', handleFirstGesture);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));
    window.dispatchEvent(new CustomEvent('pwa-app-installed-triggered'));
  });
}

/**
 * Checks if the current browser environment is an in-app browser or Webview.
 * e.g., opened inside Telegram, Discord, Facebook, Instagram, Twitter, or an Android WebView.
 */
function detectInAppBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent || '';
  
  // Common in-app user-agent identifiers
  const inAppRegex = /FBAN|FBAV|Instagram|Twitter|TwitterAndroid|Line|Snapchat|MicroMessenger|Pinterest|Telegram|Discord|wv|Crosswalk/i;
  
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  
  // Android WebView typically has 'wv' in the user agent
  const isAndroidWebView = isAndroid && /wv/i.test(ua);
  
  // iOS WebView detection: not running standalone and user-agent lacks "Safari" but has "iPhone"/"iPad"
  const isIOSWebView = isIOS && !/Safari/i.test(ua) && !(navigator as any).standalone;
  
  return inAppRegex.test(ua) || isAndroidWebView || isIOSWebView;
}

/**
 * Checks if the current device is running iOS (iPhone, iPad, iPod)
 */
function detectIsIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/**
 * Checks if the current device is a mobile or tablet device
 */
function detectIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Helper function to check if the app is currently running in standalone (installed) mode
  const checkIsInstalled = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check if matching standalone media query
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check iOS-specific navigator property
    const isIOSStandalone = (navigator as any).standalone === true;
    
    return isStandaloneMedia || isIOSStandalone;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateState = () => {
      const installed = checkIsInstalled();
      const inApp = detectInAppBrowser();
      const ios = detectIsIOS();
      const mobile = detectIsMobile();

      setIsInstalled(installed);
      setIsInAppBrowser(inApp);
      setIsIOS(ios);
      setIsMobile(mobile);
      
      // We show the install trigger if:
      // 1. It is not already installed.
      // 2. We either have a native deferredPrompt OR the user is on a mobile device where we want to offer custom instructions.
      setIsInstallable(!installed && (deferredPrompt !== null || mobile));
    };

    // Initial run
    updateState();

    // Listeners for prompt status changes
    const handlePromptChange = () => {
      updateState();
    };

    // Listen to media query changes (e.g. if display mode changes)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    
    const handleMediaChange = () => {
      updateState();
    };

    window.addEventListener('pwa-deferred-prompt-changed', handlePromptChange);
    window.addEventListener('pwa-app-installed-triggered', handlePromptChange);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      (mediaQuery as any).addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('pwa-deferred-prompt-changed', handlePromptChange);
      window.removeEventListener('pwa-app-installed-triggered', handlePromptChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        (mediaQuery as any).removeListener(handleMediaChange);
      }
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn('[usePWAInstall] Install prompt requested but native deferredPrompt is not available.');
      return false;
    }

    try {
      // Show the native install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[usePWAInstall] User choice outcome: ${outcome}`);
      
      // Always clear the prompt after any usage attempt
      deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));

      if (outcome === 'accepted') {
        console.log('[usePWAInstall] User accepted the install prompt.');
        setIsInstallable(false);
        return true;
      } else {
        console.log('[usePWAInstall] User dismissed the install prompt.');
        return false;
      }
    } catch (err) {
      console.error('[usePWAInstall] Error executing install prompt:', err);
      deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isInAppBrowser,
    isIOS,
    isMobile,
    hasNativePrompt: deferredPrompt !== null,
    installApp,
  };
}
