import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  Trash2, ShieldCheck, HelpCircle, HardDrive, Info, Globe, ExternalLink
} from 'lucide-react';

export default function PWADebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    isInstallable,
    isStandalone,
    installApp,
    diagnostics,
    unregisterServiceWorkers,
    clearPaiCaches,
    forceFullBypassReload
  } = usePWAInstall();

  // Determine global health indicator color
  const getOverallStatus = () => {
    if (diagnostics.isIframe) return 'warning';
    if (isStandalone) return 'success';
    if (diagnostics.serviceWorkerActive && diagnostics.manifestExists && diagnostics.isControlled) {
      return isInstallable ? 'success' : 'pending';
    }
    return 'error';
  };

  const status = getOverallStatus();

  const handleClearCache = async () => {
    setClearing(true);
    setMessage(null);
    const ok = await clearPaiCaches();
    setClearing(false);
    if (ok) {
      setMessage('✅ Cache Storage cleaned successfully!');
    } else {
      setMessage('❌ Failed or unsupported cache deletion.');
    }
  };

  const handleUnregister = async () => {
    setUnregistering(true);
    setMessage(null);
    const ok = await unregisterServiceWorkers();
    setUnregistering(false);
    if (ok) {
      setMessage('✅ Service Workers unregistered! Reload to apply.');
    } else {
      setMessage('❌ Failed to unregister Service Worker registrations.');
    }
  };

  return (
    <div id="pwa-debug-panel" className="fixed bottom-4 left-4 z-50 font-mono text-xs select-none">
      {/* Floating Toggle Icon */}
      <button
        id="pwa-debug-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full border shadow-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-slate-900 border-indigo-500/80 text-white'
            : status === 'success'
            ? 'bg-slate-950/90 border-emerald-500/30 text-emerald-400 hover:bg-slate-900 hover:border-emerald-500/50'
            : status === 'warning' || status === 'pending'
            ? 'bg-slate-950/90 border-amber-500/30 text-amber-400 hover:bg-slate-900 hover:border-amber-500/50 animate-pulse'
            : 'bg-slate-950/90 border-red-500/30 text-red-400 hover:bg-slate-900 hover:border-red-500/50'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {status === 'pending' || status === 'warning' ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          ) : null}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            status === 'success' ? 'bg-emerald-500' : status === 'warning' || status === 'pending' ? 'bg-amber-400' : 'bg-red-500'
          }`}></span>
        </span>
        <Settings className="w-3.5 h-3.5 animate-spin-slow" />
        <span className="font-bold uppercase text-[9px] tracking-widest">PWA DIAG</span>
      </button>

      {/* Expanded Diagnostics Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="pwa-debug-content"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="absolute bottom-11 left-0 w-[310px] sm:w-[380px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="font-extrabold text-white uppercase text-[10px] tracking-wider">
                  PWA Real-time Audit
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {/* Diagnostic Core Items */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              
              {/* Alert if inside preview window iframe */}
              {diagnostics.isIframe && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px] leading-relaxed">
                  <div className="flex gap-1.5 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-wider">Iframe Constraint</p>
                      <p className="mt-0.5 text-slate-300">
                        Browser PWA security blocks service workers and prompt listeners inside preview iframes.
                      </p>
                      <a 
                        href="https://tournahub.me" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-1.5 inline-flex items-center gap-1 text-emerald-400 font-bold hover:underline"
                      >
                        Launch Direct Tab <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Manifest Status */}
              <div className="p-2 bg-slate-900/50 border border-slate-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" /> Web Manifest
                  </span>
                  <span className="flex items-center gap-1">
                    {diagnostics.manifestExists ? (
                      diagnostics.manifestError ? (
                        <>
                          <span className="text-amber-400">JSON ERROR</span>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-400 text-[10px] font-bold">FOUND & VALID</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </>
                      )
                    ) : (
                      <>
                        <span className="text-red-400 font-bold">MISSING (404)</span>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      </>
                    )}
                  </span>
                </div>
                {diagnostics.manifestError && (
                  <p className="mt-1.5 text-[9px] text-red-400 bg-red-950/30 p-1.5 border border-red-900/25 rounded font-sans leading-tight">
                    {diagnostics.manifestError}
                  </p>
                )}
                {diagnostics.manifestData && (
                  <div className="mt-1 pb-0.5 text-[9px] text-slate-500 select-text font-sans flex flex-wrap gap-x-2">
                    <span>Name: <b className="text-slate-300">"{diagnostics.manifestData.name}"</b></span>
                    <span>Display: <b className="text-slate-300">"{diagnostics.manifestData.display}"</b></span>
                    <span>Start: <b className="text-slate-300">"{diagnostics.manifestData.start_url}"</b></span>
                  </div>
                )}
              </div>

              {/* Service Worker Status */}
              <div className="p-2 bg-slate-900/50 border border-slate-900 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Service Worker
                  </span>
                  <span className="flex items-center gap-1">
                    {diagnostics.serviceWorkerSupported ? (
                      diagnostics.serviceWorkerRegistered ? (
                        <>
                          <span className="text-emerald-400 text-[10px] font-bold">
                            {diagnostics.serviceWorkerActive ? 'ACTIVE' : 'INSTALLING'}
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400 font-semibold">NOT REGISTERED</span>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        </>
                      )
                    ) : (
                      <>
                        <span className="text-red-400">UNSUPPORTED</span>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      </>
                    )}
                  </span>
                </div>
                {diagnostics.serviceWorkerSupported && (
                  <div className="grid grid-cols-2 gap-x-2 pt-1 border-t border-slate-900 text-[9px] text-slate-500 leading-tight">
                    <div>Active Controller: <span className={diagnostics.isControlled ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{diagnostics.isControlled ? 'YES' : 'NO'}</span></div>
                    <div>Instance State: <span className="text-slate-300 font-semibold">{diagnostics.serviceWorkerState || 'none'}</span></div>
                  </div>
                )}
              </div>

              {/* Install Prompt Listeners */}
              <div className="p-2 bg-slate-900/50 border border-slate-900 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" /> Install Prompt
                  </span>
                  <span className="flex items-center gap-1">
                    {diagnostics.beforeInstallPromptFired ? (
                      <>
                        <span className="text-emerald-400 text-[10px] font-bold">PROMPT READY</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </>
                    ) : isStandalone ? (
                      <>
                        <span className="text-emerald-400">INSTALLED (PWA)</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400 font-semibold">NOT FIRED YET</span>
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      </>
                    )}
                  </span>
                </div>
                
                {/* Visual indicator explaining prompt fires */}
                <p className="text-[9px] text-slate-400 leading-tight">
                  {!diagnostics.beforeInstallPromptFired ? (
                    isStandalone ? (
                      "🚀 App open in Standalone window mode. Setup is complete!"
                    ) : (
                      "💡 Chrome only fires the prompt if the page is served over HTTPS, has an active SW controlling it, has acceptable user interaction metrics, and is running in an autonomous standalone browser tab."
                    )
                  ) : (
                    "🎉 Prompt fully intercepted and available! Click the PWA chip to trigger manual OS install flow."
                  )}
                </p>
              </div>

              {/* Client specifications */}
              <div className="p-2 bg-slate-900/30 border border-slate-900 rounded-lg text-slate-500 text-[9px] leading-relaxed">
                <p><b className="text-slate-400">Display Mode:</b> {isStandalone ? 'standalone (PWA)' : 'browser'}</p>
                <p className="truncate"><b className="text-slate-400">Agent:</b> {diagnostics.userAgent}</p>
              </div>

              {/* Interactive Audit Action buttons */}
              <div className="border-t border-slate-800/80 pt-2.5 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Diagnostics Tools:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleClearCache}
                    disabled={clearing}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer text-[10px]"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                    {clearing ? 'Clearing...' : 'Clean Cache'}
                  </button>
                  <button
                    onClick={handleUnregister}
                    disabled={unregistering}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer text-[10px]"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    {unregistering ? 'Removing...' : 'Remove SW'}
                  </button>
                </div>

                <button
                  onClick={forceFullBypassReload}
                  className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all duration-150 cursor-pointer text-[10px] uppercase font-bold tracking-wide"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin-slow" />
                  Hard Refresh & Reload
                </button>
              </div>

              {/* Display operation message */}
              {message && (
                <p className="p-2 bg-slate-900/80 text-white border border-slate-800 rounded-lg text-[9px] leading-tight animate-fade-in text-center font-bold">
                  {message}
                </p>
              )}

              {/* Manual fallback instructions */}
              {!isStandalone && !isInstallable && (
                <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-slate-400 text-[10px] leading-relaxed">
                  <p className="font-bold text-slate-200 uppercase tracking-widest text-[8px] mb-1">Manual Installation Fallback</p>
                  <p>
                    If the download prompt is throttled, click <span className="text-white">Chrome Menu (3 dots)</span> &rarr; <span className="text-emerald-400 font-semibold font-sans">"Add to Home Screen"</span> or <span className="text-emerald-400 font-semibold font-sans">"Install App"</span>. This bypasses automated heuristics.
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
