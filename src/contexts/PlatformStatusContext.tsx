import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { platformService, PlatformStatus } from '../services/platformService';
import { supabase } from '../lib/supabase';

interface AnnouncementNotification {
  id: string;
  title: string;
  body: string;
  priority: 'high' | 'urgent';
  read: boolean;
  created_at: string;
}

interface PlatformStatusContextType {
  status: PlatformStatus | null;
  loading: boolean;
  checkStatus: () => Promise<PlatformStatus | null>;
  unreadAnnouncements: AnnouncementNotification[];
  dismissAnnouncement: (id: string) => Promise<void>;
  refetchAnnouncements: () => Promise<void>;
}

const PlatformStatusContext = createContext<PlatformStatusContextType | undefined>(undefined);

const defaultStatus: PlatformStatus = {
  maintenance_mode: false,
  is_blocked: false,
  caller_is_admin: false,
  maintenance_message: '',
  maintenance_end_estimate: null,
  maintenance_scheduled_at: null,
  upcoming_maintenance: false
};

export function PlatformStatusProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Initialize status from localStorage immediately to support network-resilience and zero startup lag
  const [status, setStatus] = useState<PlatformStatus | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem('TOURNAHUB_PLATFORM_STATUS');
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        console.warn('[PlatformStatusProvider] Error reading cached platform status:', e);
      }
    }
    return defaultStatus;
  });

  // Default loading to false if we already have a cached value, or false in general to avoid blocking startup
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem('TOURNAHUB_PLATFORM_STATUS');
        return !cached; // If we have no cache at all, let it fetch once, otherwise don't block
      } catch (e) {
        console.warn('[PlatformStatusProvider] Error checking cached state for loading:', e);
      }
    }
    return false;
  });

  const [unreadAnnouncements, setUnreadAnnouncements] = useState<AnnouncementNotification[]>([]);
  
  // Track active in-flight request abort controller to safely cancel duplicate or stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Fetch current status with robust AbortController timeout and cancellation support
  const checkStatus = async (): Promise<PlatformStatus | null> => {
    // Abort any duplicate/stale in-flight status requests before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timeout trigger: Abort the request if it exceeds a 5s window
    const timeoutId = setTimeout(() => {
      console.warn('[PlatformStatusProvider] Status check exceeded 5s timeout. Aborting request.');
      controller.abort();
    }, 5000);

    try {
      const data = await platformService.getPlatformStatus({ signal: controller.signal });
      
      // Only set status if this request wasn't superseded/cancelled
      if (!controller.signal.aborted) {
        setStatus(data);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('TOURNAHUB_PLATFORM_STATUS', JSON.stringify(data));
          } catch (e) {
            console.warn('[PlatformStatusProvider] Error writing to platform status cache:', e);
          }
        }
      }
      return data;
    } catch (err: any) {
      const isAbort = err.name === 'AbortError' || err instanceof DOMException;
      if (isAbort) {
        console.log('[PlatformStatusProvider] Platform status request was aborted/cancelled.');
      } else {
        console.warn('[PlatformStatusProvider] Error polling status:', err);
      }

      // Return existing status to protect client execution from blocking or crashing
      const currentStatus = status || defaultStatus;
      return currentStatus;
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  // 2. Fetch announcements for authenticated user
  const refetchAnnouncements = async () => {
    if (!user) {
      setUnreadAnnouncements([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, priority, read, created_at')
        .eq('user_id', user.id)
        .eq('type', 'announcement')
        .eq('read', false)
        .in('priority', ['high', 'urgent'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[PlatformStatusProvider] Error fetching announcements:', error);
      } else if (data) {
        setUnreadAnnouncements(data as AnnouncementNotification[]);
      }
    } catch (err) {
      console.warn('[PlatformStatusProvider] Error fetching announcements:', err);
    }
  };

  // 3. Mark warning/announcement as read
  const dismissAnnouncement = async (id: string) => {
    try {
      const { error } = await (supabase.from('notifications') as any)
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.warn('[PlatformStatusProvider] Error dismissing announcement:', error);
      } else {
        setUnreadAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.warn('[PlatformStatusProvider] Exception during dismiss:', err);
    }
  };

  // Initial status fetch on mount
  useEffect(() => {
    checkStatus();

    // Guard against any infinite initializing screens under weak connectivity
    const unblockTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      clearTimeout(unblockTimer);
      // Abort active in-flight requests on logout, unmount, or session transitions
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  // Load announcements and subscribe to real-time notification changes
  useEffect(() => {
    if (user) {
      refetchAnnouncements();

      const channelName = `pwa-announcements-${Math.random().toString(36).substring(7)}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          refetchAnnouncements();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setUnreadAnnouncements([]);
    }
  }, [user]);

  // Dynamic Polling logic (60s if live, 30s if blocked, respects tab visibility)
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    let isVisible = true;

    const runPoll = async () => {
      if (isVisible) {
        await checkStatus();
      }
      const delay = status?.is_blocked ? 30000 : 60000;
      timerId = setTimeout(runPoll, delay);
    };

    const isBlocked = status?.is_blocked;
    timerId = setTimeout(runPoll, isBlocked ? 30000 : 60000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
      } else {
        isVisible = true;
        runPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [status?.is_blocked]);

  const value = {
    status,
    loading,
    checkStatus,
    unreadAnnouncements,
    dismissAnnouncement,
    refetchAnnouncements
  };

  return (
    <PlatformStatusContext.Provider value={value}>
      {children}
    </PlatformStatusContext.Provider>
  );
}

export function usePlatformStatus() {
  const context = useContext(PlatformStatusContext);
  if (context === undefined) {
    throw new Error('usePlatformStatus must be used within a PlatformStatusProvider');
  }
  return context;
}
