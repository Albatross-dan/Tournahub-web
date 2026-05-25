import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function NetworkBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  if (!isOnline) {
    return (
      <div 
        id="network-offline-banner"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-red-950/80 border-b border-red-500/20 px-4 py-2 px-6 backdrop-blur-md"
      >
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 font-mono italic">
          No internet connection — showing cached data
        </p>
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div 
        id="network-online-banner"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-slate-950/80 border-b border-emerald-500/20 px-4 py-2 px-6 backdrop-blur-md animate-fade-in"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono italic">
          Back online — auto-reloading database context...
        </p>
      </div>
    );
  }

  return null;
}
