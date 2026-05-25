import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Smartphone, Compass, ArrowUpFromLine, 
  HelpCircle, MoreVertical, Sparkles, Check, X
} from 'lucide-react';

export default function PWADebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { isInstallable, isStandalone, installApp, diagnostics } = usePWAInstall();

  // If the app is already installed and running inside standalone mode, we do not need to display the installer button
  if (isStandalone) {
    return null;
  }

  const handleApplyAutoInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsOpen(false);
    }
  };

  const isIOS = diagnostics.userAgent.includes('iPhone') || diagnostics.userAgent.includes('iPad') || diagnostics.userAgent.includes('iPod');

  return (
    <div id="pwa-install-guide-panel" className="fixed bottom-4 left-4 z-50 font-sans select-none">
      
      {/* Floating Trigger Chip */}
      <button
        id="pwa-install-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/95 hover:bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-medium text-xs rounded-full shadow-2xl transition-all duration-200 cursor-pointer group"
      >
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <PhoneIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold tracking-wide">Download App</span>
      </button>

      {/* Floating Guidance Window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for easy dismiss */}
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              id="pwa-install-modal"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="absolute bottom-12 left-0 z-50 w-[290px] sm:w-[320px] bg-slate-950 border border-slate-850 rounded-2xl shadow-2xl p-4 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-3">
                <div className="flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    Install TournaHub
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Guide Content */}
              <div className="space-y-3.5 text-slate-350 text-[11px] leading-relaxed">
                
                {/* 1. DIRECT ONE-TAP INSTALLATION (Primary if available) */}
                {isInstallable ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                    <p className="font-medium text-emerald-400">
                      ✨ Direct installation is ready for your browser!
                    </p>
                    <button
                      onClick={handleApplyAutoInstall}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Install Automatically
                    </button>
                  </div>
                ) : null}

                {/* 2. THREE DOTS OR SAFARI SHARE STEPS */}
                <div className="space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                    Browser Option Details:
                  </span>

                  {isIOS ? (
                    // iOS Instruction Set
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-slate-900 text-emerald-400 rounded-md font-bold text-[10px] select-none flex-shrink-0">
                          1
                        </div>
                        <p>
                          Tap the <span className="text-white font-semibold">Share Button</span> (<ArrowUpFromLine className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" /> or send arrow) at the bottom toolbar.
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-slate-900 text-emerald-400 rounded-md font-bold text-[10px] select-none flex-shrink-0">
                          2
                        </div>
                        <p>
                          Scroll down the system list and touch/select <span className="text-white font-bold">"Add to Home Screen"</span>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Android & General PC/Chrome Instruction Set
                    <div className="space-y-2 border-l border-slate-900 pl-1.5 ml-0.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-slate-900 text-emerald-400 rounded-md font-bold text-[10px] select-none flex-shrink-0">
                          1
                        </div>
                        <p>
                          Tap the browser's menu button <span className="text-white font-semibold font-mono">3 Dots (<MoreVertical className="w-3 h-3 inline mx-0.5 text-slate-400" />)</span> in the top right.
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-slate-900 text-emerald-400 rounded-md font-bold text-[10px] select-none flex-shrink-0">
                          2
                        </div>
                        <p>
                          Select <span className="text-white font-bold text-emerald-400">"Add to Home Screen"</span> or <span className="text-white font-bold text-emerald-400">"Install App"</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Benefits Banner */}
                <div className="pt-2 border-t border-slate-900/60 flex gap-2 items-center text-[10px] text-slate-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>Enables fully offline tournaments, home-screen shortcut & standalone UI window.</span>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Phone Icon fallback helper
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
