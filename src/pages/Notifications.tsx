import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { supabase } from '../lib/supabase';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Bell, Trophy, MessageSquare, Calendar, Info, Clock, CheckCircle2, Shield } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { Notification } from '../types/database';
import LoadingState from '../components/ui/LoadingState';

export default function Notifications() {
  const { user, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(fetchNotifications);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, refetchSignal]);

  async function fetchNotifications() {
    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Trophy className="w-5 h-5 text-primary" />;
      case 'tournament_champion_declared':
      case 'tournament_runner_up': return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'tournament': return <Calendar className="w-5 h-5 text-emerald-500" />;
      case 'badge_required': return <Shield className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-zinc-400" />;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    const data = notif.data as any;
    if (data?.deep_link) {
      navigate(data.deep_link);
    } else if (notif.type === 'badge_required' && data?.tournament_id) {
      navigate(`/tournaments/${data.tournament_id}`);
    } else if (data?.match_id) {
      navigate(`/matches/${data.match_id}`);
    } else if (data?.tournament_id) {
      navigate(`/tournaments/${data.tournament_id}`);
    }
  };

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
              Notifications <span className="text-primary">Center</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Stay updated on match schedules and tournament progress.</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 border border-slate-700 w-fit"
            >
              <CheckCircle2 size={14} />
              Mark all as read
            </button>
          )}
        </div>

        <div className="card divide-y divide-slate-800 rounded-3xl overflow-hidden border-slate-800/50">
          {loading ? (
            <LoadingState message="Polling Subsystems..." />
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "p-5 flex items-start gap-4 transition-all hover:bg-slate-800/30 group cursor-pointer",
                  !notif.read && "bg-primary/5"
                )}
              >
                <div className="mt-1 w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0 shadow-lg group-hover:border-primary/30 transition-colors">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "font-black italic uppercase tracking-tight text-lg leading-tight",
                      notif.read ? "text-slate-400" : "text-white"
                    )}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black uppercase rounded tracking-widest border border-primary/20">NEW</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mt-1 font-medium italic">
                    {notif.body}
                  </p>
                  
                  {notif.type === 'badge_required' && (notif.data as any)?.tournament_id && (
                    <button 
                      onClick={() => navigate(`/tournaments/${(notif.data as any).tournament_id}`)}
                      className="mt-3 px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-500/20 transition-all"
                    >
                      Select Badge Now
                    </button>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <Clock size={12} className="mr-1.5" />
                       {formatDate(notif.created_at || '')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 shadow-inner">
                <Bell size={24} className="text-slate-700" />
              </div>
              <p className="text-slate-500 italic font-medium">Your alert terminal is currently empty.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
