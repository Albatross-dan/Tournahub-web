import React, { useState, useEffect } from 'react';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import { format, parseISO } from 'date-fns';
import { AlertCircle, X } from 'lucide-react';

export default function UpcomingMaintenanceBanner() {
  const { status } = usePlatformStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Session-based dismissal check
    const isDismissed = sessionStorage.getItem('upcoming_maintenance_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  if (!status || !status.upcoming_maintenance || status.is_blocked || dismissed) {
    return null;
  }

  // Double check if maintenance_scheduled_at has already passed
  if (status.maintenance_scheduled_at) {
    const scheduledTime = new Date(status.maintenance_scheduled_at).getTime();
    if (Date.now() > scheduledTime) {
      return null;
    }
  }

  const formatTimestamp = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
      return format(parseISO(isoString), "EEEE, MMMM d 'at' h:mm a");
    } catch (err) {
      return new Date(isoString).toLocaleString();
    }
  };

  const formattedTime = formatTimestamp(status.maintenance_scheduled_at);

  const handleDismiss = () => {
    sessionStorage.setItem('upcoming_maintenance_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 relative z-40 text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs md:text-sm font-semibold">
        <div className="flex items-center space-x-2.5 mr-4">
          <AlertCircle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 animate-pulse" />
          <span>
            ⚠️ Scheduled maintenance on <strong className="text-amber-400 font-bold">{formattedTime}</strong>. The platform will be temporarily unavailable.
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-500/20 text-amber-400 hover:text-white rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          title="Dismiss Warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
