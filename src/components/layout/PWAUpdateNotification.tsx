import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export default function PWAUpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA Service Worker registered:', r);
    },
    onRegisterError(error) {
      console.error('PWA Service Worker registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          id="pwa-update-toast"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 bg-slate-900 border border-emerald-500/30 rounded-xl shadow-2xl shadow-emerald-950/20 backdrop-blur-xl"
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">Update Available</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                A new and upgraded version of Tournahub is ready. Refresh now to experience new features!
              </p>
              
              <div className="flex gap-2.5 mt-3">
                <button
                  id="pwa-update-btn"
                  onClick={handleUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg transition-all duration-200 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                  Refresh App
                </button>
                <button
                  id="pwa-later-btn"
                  onClick={handleClose}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>

            <button
              id="pwa-close-update-toast"
              onClick={handleClose}
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors h-fit cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
