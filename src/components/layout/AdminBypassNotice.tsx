import React from 'react';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import { Settings } from 'lucide-react';

export default function AdminBypassNotice() {
  const { status } = usePlatformStatus();

  if (!status || !status.maintenance_mode || !status.caller_is_admin) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs animate-bounce bg-slate-900/90 hover:bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-xl text-white">
      <div className="flex items-start space-x-3">
        <div className="p-1.5 bg-primary/20 text-primary rounded-lg border border-primary/20">
          <Settings className="w-5 h-5 animate-spin-slow" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black italic uppercase tracking-wider text-primary">
            ⚙️ Admin Bypass Active
          </h4>
          <p className="text-[10px] text-slate-300 font-medium leading-normal">
            Maintenance mode is <span className="text-red-400 font-bold uppercase">ON</span>. Only admins can see the app.
          </p>
        </div>
      </div>
    </div>
  );
}
