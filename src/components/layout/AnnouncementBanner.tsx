import React, { useState } from 'react';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import { AlertTriangle, Check, Megaphone, Loader2 } from 'lucide-react';

export default function AnnouncementBanner() {
  const { unreadAnnouncements, dismissAnnouncement } = usePlatformStatus();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!unreadAnnouncements || unreadAnnouncements.length === 0) {
    return null;
  }

  // Filter announcements by priority
  const urgentAnnouncements = unreadAnnouncements.filter(a => a.priority === 'urgent');
  const highAnnouncements = unreadAnnouncements.filter(a => a.priority === 'high');

  const handleDismiss = async (id: string) => {
    setLoadingId(id);
    try {
      await dismissAnnouncement(id);
    } finally {
      setLoadingId(null);
    }
  };

  // Truncate helper for high priority
  const truncateText = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
  };

  return (
    <div className="w-full flex flex-col space-y-1 relative z-30">
      {/* 1. Render EACH urgent priority announcement */}
      {urgentAnnouncements.map((announcement) => (
        <div 
          key={announcement.id} 
          className="w-full bg-red-500/10 border-b border-red-500/20 px-4 py-4 text-red-200"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start space-x-3 max-w-4xl">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 mt-0.5">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black italic uppercase tracking-wider text-red-400">
                  🚨 {announcement.title}
                </h4>
                <p className="text-xs text-red-300 font-medium leading-relaxed mt-1">
                  {announcement.body}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleDismiss(announcement.id)}
              disabled={loadingId === announcement.id}
              className="self-start sm:self-center flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black uppercase italic tracking-wider rounded-xl cursor-pointer transition-colors shadow-lg shadow-red-950/20"
            >
              {loadingId === announcement.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Mark as Read
                </>
              )}
            </button>
          </div>
        </div>
      ))}

      {/* 2. Render only the MOST RECENT high priority announcement */}
      {highAnnouncements.length > 0 && (() => {
        const announcement = highAnnouncements[0];
        return (
          <div 
            key={announcement.id} 
            className="w-full bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 text-blue-200"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs md:text-sm font-semibold">
              <div className="flex items-center space-x-2.5 mr-4 max-w-5xl">
                <Megaphone className="w-4.5 h-4.5 text-blue-400 flex-shrink-0" />
                <span>
                  <strong className="text-blue-300 font-bold uppercase tracking-wide">📢 {announcement.title}</strong>:{' '}
                  <span className="text-blue-200 font-medium">{truncateText(announcement.body, 120)}</span>
                </span>
              </div>
              <button
                onClick={() => handleDismiss(announcement.id)}
                disabled={loadingId === announcement.id}
                className="p-1.5 hover:bg-blue-500/20 text-blue-400 hover:text-white rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title="Dismiss Banner"
              >
                {loadingId === announcement.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider px-1">✕</span>
                )}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
