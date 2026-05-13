import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Loader2, CheckCircle2, MessageSquare, Trophy, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../../lib/utils';

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId]);

  async function fetchNotifications() {
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Trophy className="w-4 h-4 text-primary" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'tournament': return <Calendar className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all group"
      >
        <Bell className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-primary/20">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 bg-black/40 flex items-center justify-between">
              <h3 className="text-sm font-black text-white italic uppercase tracking-tighter">Notifications</h3>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded">
                Live Feed
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-800 scrollbar-hide">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "w-full p-4 flex items-start space-x-3 text-left transition-colors hover:bg-zinc-800/50",
                    !notif.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-1 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        notif.read ? "text-zinc-300" : "text-white"
                      )}>
                        {notif.title}
                      </p>
                      {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 mt-0.5">
                      {notif.body}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">
                      {formatDate(notif.created_at)}
                    </p>
                  </div>
                </button>
              ))}
              {notifications.length === 0 && (
                <div className="py-12 text-center text-zinc-600 italic">
                  No notifications yet.
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-zinc-800 bg-black/20">
              <button className="w-full py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                View All Notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
