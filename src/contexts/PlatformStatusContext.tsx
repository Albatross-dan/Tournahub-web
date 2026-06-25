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
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<AnnouncementNotification[]>([]);
  const isFetchingRef = useRef(false);

  // 1. Fetch current status with fallback timeout unblocker
  const checkStatus = async (): Promise<PlatformStatus | null> => {
    if (isFetchingRef.current) return status;
    isFetchingRef.current = true;
    try {
      const getPromise = platformService.getPlatformStatus();
      const timeoutPromise = new Promise<PlatformStatus>((resolve) => 
        setTimeout(() => {
          console.warn('[PlatformStatusProvider] Status check exceeded 2.5s timeout. Using default unblocked status.');
          resolve(defaultStatus);
        }, 2500)
      );

      const data = await Promise.race([getPromise, timeoutPromise]);
      setStatus(data);
      return data;
    } catch (err) {
      console.warn('[PlatformStatusProvider] Error polling status:', err);
      setStatus(defaultStatus);
      return defaultStatus;
    } finally {
      isFetchingRef.current = false;
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

    return () => clearTimeout(unblockTimer);
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
