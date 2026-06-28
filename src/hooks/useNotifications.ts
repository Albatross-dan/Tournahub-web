import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { AppNotification } from '../types/payment';
import toast from 'react-hot-toast';

interface UseNotificationsReturn {
  notifications:      AppNotification[];
  unreadCount:        number;
  isLoading:          boolean;
  markAsRead:         (id: string) => Promise<void>;
  markAllAsRead:      () => Promise<void>;
  refetch:            () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      userIdRef.current = userId;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const list = (data || []) as AppNotification[];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (err) {
      console.error('[useNotifications] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

interface NotificationUpdateBuilder {
  update: (values: { read: boolean; status?: string; read_at?: string }) => {
    eq: (col: string, val: string | boolean) => {
      eq: (col: string, val: string | boolean) => Promise<{ error: Error | null }>;
    } & Promise<{ error: Error | null }>;
  };
}

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, status: 'read' as string } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const { error } = await (supabase.from('notifications') as unknown as NotificationUpdateBuilder)
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[useNotifications] Mark read error:', err);
      // Rollback on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;

    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, status: 'read' as string })));
      setUnreadCount(0);

      const { error } = await (supabase.from('notifications') as unknown as NotificationUpdateBuilder)
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (err) {
      console.error('[useNotifications] Mark all read error:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      await fetchNotifications();

      const userId = userIdRef.current;
      if (!userId || !isMounted) return;

      console.log(`[useNotifications] Configuring realtime INSERT listener for: ${userId}`);

      const notifChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[useNotifications] Received real-time insert event:', payload.new);
            if (!isMounted) return;

            const notif = payload.new as AppNotification;
            
            // Show toast for high priority, financial notifications etc.
            if (notif.type === 'deposit_confirmed' || notif.type === 'prize_awarded') {
              // Standard styling mimicking showToast
              toast.success(`${notif.title}\n${notif.body}`, {
                duration: 5000,
                position: 'top-right'
              });
            } else {
              toast(notif.title, {
                icon: '🔔',
                duration: 4000
              });
            }

            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            if (!notif.read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();

      subscriptionRef.current = notifChannel;
    }

    init();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchNotifications]);

  useEffect(() => {
    // Listen to messages broadcasted by the Service Worker (e.g. NOTIFICATION_CLICKED)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('[Push Hook] Background notification clicked event received:', event.data);
        const notificationId = event.data.notification_id;
        if (notificationId) {
          // 1. Mark notification as read in Supabase instantly
          markAsRead(notificationId);
        }
        // 2. Fetch fresh notifications list to clear stale state
        fetchNotifications();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [markAsRead, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
