import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, Wallet, RefreshCw, LayoutDashboard, 
  Calendar, MessageSquare, Shield, Bell, Menu, X, Tv
} from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { walletService } from '../../services/walletService';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const logoUrl = '/android-chrome-512x512.png';

export default function Navbar() {
  const { profile, user, isAdmin } = useAuth();
  const location = useLocation();
  const [balance, setBalance] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isInstallable, installApp } = usePWAInstall();
  const initial = React.useMemo(() => 
    (profile?.username || user?.email || 'U')[0].toUpperCase(), 
  [profile?.username, user?.email]);

  const navItems = React.useMemo(() => {
    const items = [
      { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Matches', path: '/matches', icon: Calendar },
      { name: 'Tournaments', path: '/tournaments', icon: Trophy },
      { name: 'Chat', path: '/chat', icon: MessageSquare },
      { name: 'Wallet', path: '/wallet', icon: Wallet },
      { name: 'Live Streams', path: '/streams', icon: Tv },
    ];
    if (isAdmin) {
      items.push({ name: 'Admin', path: '/admin', icon: Shield });
    }
    return items;
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchUnread();
      fetchChatUnread();
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchBalance, 30000);

      const notificationsChannel = supabase
        .channel(`nav-notifications-${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchUnread();
        })
        .subscribe();

      const messagesChannel = supabase
        .channel(`nav-messages-${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchChatUnread();
        })
        .subscribe();

      const walletChannel = supabase
        .channel(`nav-wallet-${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setBalance(payload.new.balance);
          setLastUpdated(new Date().toLocaleTimeString());
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(walletChannel);
      };
    }
  }, [user]);

  async function fetchBalance() {
    if (!user) return;
    try {
      const summary = await walletService.getWalletSummary();
      if (summary) {
        setBalance(summary.balance_usd);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch balance in Navbar:', err);
    }
  }

  async function fetchUnread() {
    if (!user) return;
    const { count } = await (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }

  async function fetchChatUnread() {
    if (!user) return;
    try {
      // Find all conversations the user is in through matches
      // RLS (match_conv_select_v3) already restricts this to the user's matches
      const { data: conversations } = await (supabase as any)
        .from('match_conversations')
        .select(`
          id,
          matches!inner:match_id (
            player1,
            player2
          )
        `);

      if (!conversations || conversations.length === 0) {
        setUnreadChatCount(0);
        return;
      }

      const conversationIds = conversations.map((c: any) => c.id);

      // Count unread messages in those conversations
      const { count } = await (supabase as any)
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .not('read_by', 'cs', `["${user.id}"]`);
      
      setUnreadChatCount(count || 0);
    } catch (err) {
      console.error('Error fetching chat unread count:', err);
    }
  }

  return (
    <header className="px-6 py-4 border-b border-border-main bg-background/80 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center space-x-4 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={logoUrl} alt="TournaHub" className="w-10 h-10 object-contain relative z-10" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-main italic -tracking-widest uppercase transition-colors group-hover:text-primary">
              Tourna<span className="text-primary italic">Hub</span>
            </h1>
          </div>
        </NavLink>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Desktop/Global Menu Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-11 h-11 rounded-xl bg-surface border border-border-main flex items-center justify-center text-primary transition-all active:scale-95 hover:bg-surface-hover shadow-sm"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {user && (
              <div className="w-11 h-11 bg-surface border border-border-main rounded-xl flex items-center justify-center relative shadow-sm">
                <NotificationBell userId={user.id} />
              </div>
            )}
            
            <NavLink to="/profile" className="w-11 h-11 rounded-full bg-surface border border-border-main flex items-center justify-center text-primary font-black text-sm shadow-sm relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 text-sm">{initial}</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Global Menu Dropdown (Shared for Mobile/Desktop) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-surface border-b border-border-main p-6 z-40 backdrop-blur-xl shadow-2xl"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={() => {
                      const currentPath = location.pathname + location.search;
                      let isItemActive = false;
                      if (item.path === '/dashboard') {
                        isItemActive = location.pathname === '/dashboard';
                      } else if (item.path.includes('tab=')) {
                        isItemActive = currentPath.includes(item.path);
                      } else if (item.path === '/matches') {
                        isItemActive = location.pathname === '/matches' && !location.search.includes('tab=');
                      } else {
                        isItemActive = location.pathname.startsWith(item.path);
                      }
                      
                      return cn(
                        "flex items-center space-x-4 px-6 py-5 rounded-2xl transition-all",
                        isItemActive 
                          ? "bg-primary text-slate-900 border border-primary/20 shadow-[0_0_20px_rgba(var(--color-primary),0.3)]" 
                          : "bg-background text-text-muted border border-border-main hover:bg-surface-hover hover:border-primary/30"
                      );
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest italic">{item.name}</span>
                    {item.name === 'Chat' && unreadChatCount > 0 && (
                      <span className="bg-primary text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full ml-auto shadow-lg shadow-primary/20">
                        {unreadChatCount}
                      </span>
                    )}
                    {item.name !== 'Chat' && item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="bg-primary text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full ml-auto shadow-lg shadow-primary/20">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="max-w-7xl mx-auto mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em]">Live Sync Active</span>
          </div>
          <span className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center">
            <RefreshCw className="w-2 h-2 mr-1" />
            Sync: {lastUpdated}
          </span>
          {isInstallable && (
            <button
              onClick={installApp}
              className="px-2 py-0.5 rounded-full bg-primary text-slate-900 border border-primary text-[7px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center hover:bg-white"
            >
              🚀 Install App
            </button>
          )}
        </div>
        
        {balance !== null && balance < 5 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="text-[7px] font-black text-amber-500 uppercase tracking-widest animate-pulse"
          >
            Low Funds
          </motion.div>
        )}
      </div>
    </header>
  );
}
