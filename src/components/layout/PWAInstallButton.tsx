import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Sparkles, X, Info, Smartphone, HelpCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  layout?: 'auth' | 'menu' | 'float';
  className?: string;
}

export default function PWAInstallButton({ layout = 'menu', className = '' }: PWAInstallButtonProps) {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [success, setSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if dismissed previously
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_install_dismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowGuide(prev => !prev);
      return;
    }

    if (!isInstallable) {
      setShowGuide(prev => !prev);
      return;
    }

    setIsInstalling(true);
    const didInstall = await installApp();
    setIsInstalling(false);
    
    if (didInstall) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  // Do not show anything if in standalone mode (unless showing a success feedback)
  if (isStandalone && !success) {
    return null;
  }

  // If dismissed by user, do not render intrusive layouts (float)
  if (isDismissed && layout === 'float') {
    return null;
  }

  // Layout 1: Authentication View
  if (layout === 'auth') {
    // Only show if installable/iOS
    if (!isInstallable && !isIOS) return null;

    return (
      <div className={`w-full mt-4 ${className}`} id="pwa-install-auth">
        <div className="bg-slate-900/40 border border-border-main/40 rounded-3xl p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-white uppercase tracking-wider italic">
                TournaHub PWA App
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">
                Install for modern offline access
              </p>
            </div>

            <button
              id="pwa-install-auth-action"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black uppercase italic tracking-widest rounded-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3 h-3 stroke-[2.5]" />
              {isInstalling ? '...' : 'Install'}
            </button>
          </div>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed space-y-2"
              >
                {isIOS ? (
                  <p>
                    Tap the iOS share button (<span className="text-white italic">"Share"</span>) then select <span className="text-white font-semibold">"Add to Home Screen"</span>.
                  </p>
                ) : (
                  <p>
                    If standard installation isn't responding, open Chrome options (3 dots menu) and tap <span className="text-white font-semibold">"Install app"</span>.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Layout 2: Mobile Navigation / Sidebar Menu Item
  if (layout === 'menu') {
    // Show in menu/sidebar always to let users trigger installation manually
    return (
      <div className={`pwa-nav-installer ${className}`} id="pwa-install-nav">
        <button
          id="pwa-install-nav-btn"
          onClick={handleInstallClick}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Download className="w-3.5 h-3.5 stroke-[2] pointer-events-none" />
          </div>
          <span className="flex-1">Tournahub App</span>
          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase font-black rounded-md border border-emerald-500/20">
            PWA
          </span>
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-2 p-3 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-slate-400 leading-relaxed relative"
            >
              {isIOS ? (
                <p>iOS Safari: Slide up options, tap <span className="text-white">"Add to Home Screen"</span>.</p>
              ) : (
                <p>Look for the app install/download indicator in your browser address bar or menu.</p>
              )}
              <button
                onClick={() => setShowGuide(false)}
                className="mt-2 text-[10px] text-emerald-400 font-bold uppercase hover:underline cursor-pointer block"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Layout 3: Floating Bottom Pill (Sleek, Non-intrusive bottom notification/suggestion)
  if (layout === 'float') {
    // Only show if the browser captured the install trigger
    if (!isInstallable && !isIOS) return null;

    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            id="pwa-floating-install-pill"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 p-4 bg-slate-950/90 border border-emerald-500/20 rounded-2xl shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="font-bold text-white text-xs uppercase tracking-tight italic flex items-center gap-1">
                  Download Tournahub App
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Install our lightweight app to load matches faster with full fullscreen support.
                </p>
                
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    id="pwa-float-btn"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black uppercase italic tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    {isInstalling ? 'Installing...' : 'Install Now'}
                  </button>
                  <button
                    id="pwa-float-guide-btn"
                    onClick={() => setShowGuide(prev => !prev)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-lg cursor-pointer"
                  >
                    Help Guide
                  </button>
                </div>
              </div>

              <button
                id="pwa-float-close"
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Dismiss and save preference"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1.5"
                >
                  <p className="font-semibold text-white uppercase tracking-wider">Browser Instruction:</p>
                  {isIOS ? (
                    <p>iOS Safari: Tap the Share button at the bottom menu bar, then scroll and select <span className="text-emerald-400 font-bold">"Add to Home Screen"</span>.</p>
                  ) : (
                    <p>Android Chrome: Press the 3 dots in the top right, then select <span className="text-emerald-400 font-bold">"Install app"</span>.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
}
