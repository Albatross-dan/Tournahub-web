import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import { supabase } from '../lib/supabase';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Bell, Trophy, MessageSquare, Calendar, Info, Clock, CheckCircle2, Shield, AlertTriangle, Key, Monitor, Power, ExternalLink } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { Notification as DbNotification } from '../types/database';
import LoadingState from '../components/ui/LoadingState';
import { requestNotificationPermission } from '../lib/notifications';
import { toast } from 'react-hot-toast';

export default function Notifications() {
  const { user, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(fetchNotifications);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Push Permission Diagnostics state
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [inIframe, setInIframe] = useState<boolean>(false);
  const [hasFirebaseConfig, setHasFirebaseConfig] = useState<boolean>(false);
  const [requestingPermission, setRequestingPermission] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInIframe(window.self !== window.top);
      setPermissionStatus('Notification' in window ? Notification.permission : 'not_supported');
      
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const projId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const senderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      const appId = import.meta.env.VITE_FIREBASE_APP_ID;
      const vapidId = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      setHasFirebaseConfig(!!(apiKey && projId && senderId && appId && vapidId));
      setFcmToken(localStorage.getItem('fcm_token'));
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!user) return;
    console.log('[Notifications Page] "Enable Push Notifications" button clicked by user:', user.id);
    setRequestingPermission(true);
    try {
      console.log('[Notifications Page] Invoking requestNotificationPermission...');
      const token = await requestNotificationPermission(user.id);
      
      const currentPerm = 'Notification' in window ? Notification.permission : 'not_supported';
      console.log('[Notifications Page] Permission requested. Resulting status:', currentPerm);

      if (token) {
        console.log('[Notifications Page] FCM Token successfully generated and verified:', token.substring(0, 10) + '...');
        setFcmToken(token);
        setPermissionStatus('granted');
        toast.success("Push Notification Token Registered Successfully!");
        console.log('[Notifications Page] Token syncing and local persistence are successfully completed.');
      } else {
        setPermissionStatus(currentPerm);
        if (currentPerm !== 'granted') {
          console.warn('[Notifications Page] Permission was denied or not granted. Token generation cancelled.');
          toast.error(`Permission denied or blocked. Permission level: ${currentPerm}`);
        } else {
          console.warn('[Notifications Page] Permission is granted, but no FCM Token could be generated. Check configuration.');
          toast.error("Could not obtain Push Token. Check console warnings or environment configuration.");
        }
      }
    } catch (err: any) {
      console.error('[Notifications Page] Unexpected exception in permission request flow:', err);
      toast.error(err.message || "Failed to trigger permission dialog.");
    } finally {
      setRequestingPermission(false);
    }
  };

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

  const handleNotificationClick = (notif: DbNotification) => {
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

        {/* Push Notification Diagnostics & Subscription */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                <Bell className="text-primary w-5 h-5 animate-pulse" />
                Browser Push Setup & Diagnostics
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-semibold">
                Configure, request and debug real-time system-level push notifications for match schedules and results.
              </p>
            </div>
            
            <button
              onClick={handleRequestPermission}
              disabled={requestingPermission}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-2 w-full md:w-auto justify-center",
                permissionStatus === 'granted' && fcmToken
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : "bg-primary hover:bg-primary/95 text-slate-950 shadow-lg hover:shadow-primary/20"
              )}
            >
              {requestingPermission ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : permissionStatus === 'granted' && fcmToken ? (
                <>
                  <CheckCircle2 size={14} />
                  Push Active & Registered
                </>
              ) : (
                <>
                  <Power size={14} />
                  Enable Push Notifications
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-4 border-t border-slate-800/60">
            {/* status item 1: IFrame Block Detection */}
            <div className={cn(
              "p-4 rounded-2xl border flex items-start gap-3",
              inIframe 
                ? "bg-amber-500/5 border-amber-500/10 text-amber-200"
                : "bg-emerald-500/5 border-emerald-500/10 text-emerald-200"
            )}>
              <div className="mt-0.5">
                {inIframe ? <AlertTriangle className="text-amber-500 w-4 h-4 flex-shrink-0" /> : <Monitor className="text-emerald-500 w-4 h-4 flex-shrink-0" />}
              </div>
              <div className="w-full min-w-0">
                <p className="font-bold uppercase tracking-wide">Security Sandbox Check</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed italic font-medium">
                  {inIframe 
                    ? "Currently running inside an iFrame container. Browsers block native notification requests in nested frames. Open in New Tab to trigger permission." 
                    : "Running in top-level window. Ready to trigger standard permission requests."}
                </p>
                {inIframe && (
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="mt-2 text-[10px] text-amber-500 underline flex items-center gap-1 font-bold uppercase tracking-wider hover:text-amber-400"
                  >
                    Open in New Tab
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {/* status item 2: Firebase Credentials Check */}
            <div className={cn(
              "p-4 rounded-2xl border bg-slate-950/40 flex items-start gap-3",
              hasFirebaseConfig ? "border-emerald-500/10 text-emerald-200" : "border-red-500/10 text-red-200"
            )}>
              <div className="mt-0.5">
                {hasFirebaseConfig ? <Key className="text-emerald-500 w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="text-red-500 w-4 h-4 flex-shrink-0" />}
              </div>
              <div>
                <p className="font-bold uppercase tracking-wide">FCM Configuration</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed italic font-medium">
                  {hasFirebaseConfig 
                    ? "FCM credentials fully validated and authenticated." 
                    : "Firebase variables are missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_MESSAGING_SENDER_ID and VITE_FIREBASE_VAPID_KEY."}
                </p>
              </div>
            </div>

            {/* status item 3: Permission & Device Sync status */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-start gap-3 text-slate-300">
              <div className="mt-0.5">
                <Bell className="text-zinc-400 w-4 h-4 flex-shrink-0" />
              </div>
              <div className="w-full min-w-0">
                <p className="font-bold uppercase tracking-wide text-white">Permission & Token Status</p>
                <p className="text-[10px] text-slate-400 mt-1.5 flex justify-between gap-2 border-b border-slate-800 pb-1 italic">
                  <span>Permission:</span>
                  <span className={cn(
                    "font-bold uppercase",
                    permissionStatus === 'granted' ? "text-emerald-400" : permissionStatus === 'default' ? "text-slate-400" : "text-red-400"
                  )}>
                    {permissionStatus}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1 flex justify-between gap-2 italic">
                  <span>Database Sync:</span>
                  <span className={cn("font-bold uppercase", fcmToken ? "text-emerald-400" : "text-amber-400")}>
                    {fcmToken ? "Tokens synced" : "Offline / Pending"}
                  </span>
                </p>
                {fcmToken && (
                  <div className="mt-2 text-[9px] bg-slate-900 border border-slate-800 p-1.5 rounded-lg flex flex-col font-mono w-full">
                    <span className="text-slate-500 font-bold uppercase text-[8px]">Token preview:</span>
                    <span className="text-slate-400 select-all truncate mt-0.5">{fcmToken}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
