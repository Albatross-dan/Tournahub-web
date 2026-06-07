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
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-changed'));
    window.dispatchEvent(new CustomEvent('pwa-app-installed-triggered'));
  });
}

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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
      setIsInstalled(installed);
      
      // We only show the install button if:
      // 1. It is not already installed.
      // 2. We have a valid deferredPrompt available.
      setIsInstallable(!installed && deferredPrompt !== null);
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
      console.warn('[usePWAInstall] Install prompt was requested but deferredPrompt is not available.');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[usePWAInstall] User choice outcome: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('[usePWAInstall] User accepted the install prompt.');
        deferredPrompt = null;
        setIsInstallable(false);
        return true;
      } else {
        console.log('[usePWAInstall] User dismissed the install prompt.');
        return false;
      }
    } catch (err) {
      console.error('[usePWAInstall] Error executing install prompt:', err);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
  };
}
