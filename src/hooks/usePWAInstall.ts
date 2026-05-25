import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check standalone mode initially
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      
      console.log('[PWA Diagnostics] Initial Check:', {
        isStandaloneMode,
        isInIFrame: window.self !== window.top,
        userAgent: navigator.userAgent
      });

      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstallable(false);
      }
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA Diagnostics] received beforeinstallprompt event.');
      // Prevent automatic prompt to design custom UI
      e.preventDefault();
      // Store event
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // If already in standalone mode, let's not prompt
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
        
      if (!isStandaloneMode) {
        setIsInstallable(true);
        console.log('[PWA Diagnostics] App is now marked as installable!');
      }
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      setIsStandalone(true);
      console.log('[PWA Diagnostics] Tournahub was successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      // Trigger native browser prompt
      await installPrompt.prompt();

      // Collect user decision
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('Failed to prompt PWA installation:', err);
    }
    
    return false;
  };

  return { isInstallable, isStandalone, installApp };
}
