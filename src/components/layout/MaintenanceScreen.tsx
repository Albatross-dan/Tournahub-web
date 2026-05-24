import React, { useState } from 'react';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import { useAuth } from '../../contexts/AuthContext';

const logoUrl = '/android-chrome-512x512.png';
import { format, parseISO } from 'date-fns';
import { Loader2, RefreshCw, Wrench, LogOut } from 'lucide-react';

export default function MaintenanceScreen() {
  const { status, checkStatus } = usePlatformStatus();
  const { user, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await checkStatus();
    // Artificial small delay for visual feedback
    setTimeout(() => {
      setChecking(false);
    }, 600);
  };

  const formatTimestamp = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
      return format(parseISO(isoString), "EEEE, MMMM d 'at' h:mm a");
    } catch (err) {
      return new Date(isoString).toLocaleString();
    }
  };

  const message = status?.maintenance_message || 'TournaHub is currently undergoing scheduled maintenance.';
  const endEstimate = status?.maintenance_end_estimate 
    ? formatTimestamp(status.maintenance_end_estimate) 
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060818] px-4 text-white">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-md w-full text-center space-y-8 p-10 bg-slate-900/60 backdrop-blur-3xl border border-slate-800/80 rounded-[2rem] shadow-2xl">
        {/* Logo Section */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
            <img 
              src={logoUrl} 
              alt="TournaHub Logo" 
              className="w-24 h-24 object-contain relative z-10 transition-transform duration-500 group-hover:scale-105" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>

        {/* Status Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
            Under Maintenance
          </h1>
        </div>

        {/* Info Message & Estimate */}
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed font-medium">
            {message}
          </p>

          {endEstimate && (
            <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">
                Expected Back Online
              </span>
              <span className="text-sm font-black text-primary italic uppercase tracking-wide">
                {endEstimate}
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 font-medium">
            We apologise for the inconvenience. Thank you for your patience!
          </p>
        </div>

        {/* Check Again Interactive Button */}
        <div className="space-y-3">
          <button
            onClick={handleCheck}
            disabled={checking}
            className="w-full relative group overflow-hidden rounded-2xl cursor-pointer disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-primary transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative h-14 flex items-center justify-center space-x-2">
              {checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  <span className="text-slate-900 text-base font-black italic uppercase tracking-tighter">
                    Checking Platform...
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-900 text-base font-black italic uppercase tracking-tighter">
                    Check Again
                  </span>
                </>
              )}
            </div>
          </button>

          {user && (
            <button
              onClick={() => signOut()}
              className="w-full h-14 bg-slate-800 hover:bg-slate-705/10 text-slate-300 hover:text-white text-xs font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700/50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogOut className="w-4 h-4 stroke-[3px]" />
              Disconnect / Switch Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
