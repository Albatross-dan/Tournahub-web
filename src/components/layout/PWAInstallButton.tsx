import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Sparkles, AlertCircle, CheckCircle2, Info, Monitor, Smartphone, HelpCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  layout?: 'hero' | 'auth' | 'menu' | 'float';
  className?: string;
}

export default function PWAInstallButton({ layout = 'menu', className = '' }: PWAInstallButtonProps) {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [success, setSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Identify OS for custom instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowGuide(true);
      return;
    }

    if (!isInstallable) {
      setShowGuide(true);
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

  // If already installed, don't show prompt elements
  if (isStandalone && !success) {
    return null;
  }

  // Render layouts
  if (layout === 'hero') {
    return (
      <div className={`w-full max-w-xl mx-auto ${className}`} id="pwa-install-hero">
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-emerald-500/20 rounded-[2rem] p-6 text-center backdrop-blur-3xl relative overflow-hidden shadow-2xl shadow-emerald-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-sky-500/5 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <Sparkles className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold italic text-white uppercase tracking-tight">
                Install TournaHub on your Device
              </h2>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed mx-auto">
                Launch instantly from your home screen in standalone fullscreen mode. No store needed, zero ads!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
              <button
                id="pwa-install-hero-btn"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-black uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 disabled:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 pointer-events-none stroke-[2.5px]" />
                {isInstalling ? 'Installing...' : 'Get TournaHub App'}
              </button>

              <button
                id="pwa-guide-hero-btn"
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-700/50"
              >
                <HelpCircle className="w-4 h-4" />
                Browser Guide
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-5 border-t border-slate-800 text-left overflow-hidden text-xs text-slate-400 space-y-3"
              >
                <h4 className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  How to Install PWA App
                </h4>
                {isIOS ? (
                  <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/50">
                    <p className="font-medium text-emerald-400">iOS (iPhone / iPad) Safari Instructions:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                      <li>Tap the <span className="text-white font-bold italic">"Share"</span> button (the box with an upward arrow icon) at the bottom toolbar.</li>
                      <li>Scroll down the options page and select <span className="text-white font-bold italic">"Add to Home Screen"</span>.</li>
                      <li>Tap <span className="text-emerald-400 font-bold">Add</span> in the top-right corner to finish.</li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/50">
                    <p className="font-medium text-emerald-400">Desktop & Android Devices:</p>
                    <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                      <li>On Android Chrome, tap the install button above or press Chrome's menu (3 dots) and select <span className="text-white font-semibold">"Install App"</span>.</li>
                      <li>On Desktop Chrome, look for the download install icon in the URL bar (next to bookmarks) or tap the button above.</li>
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (layout === 'auth') {
    return (
      <div className={`w-full mt-4 ${className}`} id="pwa-install-auth">
        <div className="bg-slate-900/40 border border-border-main/40 rounded-3xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-text-main uppercase tracking-wider italic">
                Tournament Installer
              </p>
              <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-widest">
                Fast Offline Arena Launcher
              </p>
            </div>

            <button
              id="pwa-install-auth-action"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/90 hover:bg-primary text-slate-950 text-[10px] font-black uppercase italic tracking-widest rounded-lg transition-transform hover:scale-105"
            >
              <Download className="w-3.5 h-3.5 stroke-[2] pointer-events-none" />
              Install
            </button>
          </div>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-border-main/20 text-left text-[10px] text-text-muted space-y-2"
              >
                {isIOS ? (
                  <p className="leading-relaxed">
                    Tap share (<span className="text-text-main font-bold">↑</span>) then select <span className="text-text-main font-bold">Add to Home Screen</span> to install on iOS.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    Click Install to launch Standalone. If blocked, choose "Add to Home Screen" in your browser options.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className={`pwa-nav-installer ${className}`} id="pwa-install-nav">
      <button
        id="pwa-install-nav-btn"
        onClick={handleInstallClick}
        className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
      >
        <Download className="w-5 h-5 text-emerald-400 pointer-events-none" />
        <span className="flex-1">Install App</span>
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
            className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed"
          >
            {isIOS ? (
              <p>iOS Safari: Slide up options, tap "Add to Home Screen".</p>
            ) : (
              <p>Look for the app install block in your browser toolbar or site menu.</p>
            )}
            <button
              onClick={() => setShowGuide(false)}
              className="mt-2 text-[10px] text-emerald-400 font-bold uppercase hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
