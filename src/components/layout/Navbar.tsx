import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, Wallet, RefreshCw, LayoutDashboard, 
  Calendar, MessageSquare, Shield, Bell, Menu, X, Tv,
  HelpCircle, Download, Store, Sparkles, Share, AlertCircle
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import NotificationBell from '../notifications/NotificationBell';
import { walletService } from '../../services/walletService';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

const logoUrl = '/android-chrome-512x512.png';

export default function Navbar() {
  const { profile, user, isAdmin, walletSummary, unreadNotificationsCount, unreadChatCount } = useAuth();
  const { isInstallable, installApp, isInAppBrowser, isIOS, hasNativePrompt } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const location = useLocation();
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const initial = React.useMemo(() => 
    (profile?.username || user?.email || 'U')[0].toUpperCase(), 
  [profile?.username, user?.email]);

  const balance = walletSummary?.balance_usd ?? null;
  const unreadCount = unreadNotificationsCount;

  const isStaff = React.useMemo(() => {
    return profile?.role === 'admin' || profile?.role === 'moderator';
  }, [profile?.role]);

  const navItems = React.useMemo(() => {
    const items = [
      { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Matches', path: '/matches', icon: Calendar },
      { name: 'Tournaments', path: '/tournaments', icon: Trophy },
      { name: 'Marketplace', path: '/marketplace', icon: Store },
      { name: 'Chat', path: '/chat', icon: MessageSquare },
      { name: 'Wallet', path: '/wallet', icon: Wallet },
      { name: 'Rules', path: '/rules', icon: HelpCircle },
      { name: 'Live Streams', path: '/streams', icon: Tv },
    ];
    if (isStaff) {
      items.push({ name: 'Staff Hub', path: '/staff', icon: Shield });
    }
    return items;
  }, [isStaff]);

  useEffect(() => {
    if (walletSummary) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [walletSummary]);

  const handleInstallClick = () => {
    if (hasNativePrompt && !isInAppBrowser) {
      installApp();
    } else {
      setShowInstallGuide(true);
    }
  };

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
            {isStaff && (
              <NavLink 
                to="/staff" 
                className="flex items-center space-x-2 sm:px-3.5 px-2.5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all font-black uppercase text-[10px] tracking-wider italic shadow-sm active:scale-95 duration-200 cursor-pointer"
                title="Staff Operations Panel"
              >
                <Shield size={12} className="stroke-[2.5px] text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Staff Hub</span>
              </NavLink>
            )}

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
            
            <NavLink to="/profile" className="flex flex-col items-center group cursor-pointer">
              <div className="w-11 h-11 rounded-full bg-surface border border-border-main flex items-center justify-center text-primary font-black text-sm shadow-sm relative overflow-hidden group-hover:border-primary/50 transition-colors">
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-sm">{initial}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#a3a3c2] group-hover:text-primary mt-1 transition-colors">
                Profile
              </span>
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
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                        
                        const isRelocated = ['Home', 'Tournaments', 'Matches', 'Wallet'].includes(item.name);
                        return cn(
                          "flex items-center space-x-4 px-6 py-5 rounded-2xl transition-all",
                          isRelocated && "hidden md:flex",
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
        </div>
        
        <div className="flex items-center space-x-3">
          {balance !== null && balance === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-[7px] font-black text-amber-500 uppercase tracking-widest animate-pulse"
            >
              Low Funds
            </motion.div>
          )}

          <AnimatePresence>
            {isInstallable && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleInstallClick}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#facc15] text-slate-950 hover:bg-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(250,204,21,0.35)] active:scale-95"
              >
                <Download className="w-3 h-3 shrink-0 text-slate-950" />
                <span>INSTALL APP</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* PWA Install Guidance Dialog */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-md bg-[#0d101d] border border-border-main rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border-main">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-text-main">
                      Install Tournahub
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowInstallGuide(false)}
                    className="w-8 h-8 rounded-lg bg-surface border border-border-main flex items-center justify-center text-text-muted hover:text-text-main transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                {isInAppBrowser ? (
                  <div className="space-y-4">
                    {/* In-App Browser Detected Warning */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-500">
                      <div className="shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-[11px] leading-relaxed font-semibold">
                        <span className="font-bold">In-App Browser Detected:</span> Android restricts full app installation inside other apps (Telegram, Discord, Gmail, etc.), which creates 1x1 shortcut links instead of real apps.
                      </div>
                    </div>

                    <p className="text-[11px] text-text-muted leading-relaxed">
                      To install Tournahub as a real Android application, please open the site in your primary Google Chrome browser:
                    </p>

                    <div className="space-y-3 bg-surface p-4 border border-border-main rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Tap the three dots menu (<span className="font-mono text-xs">⋮</span>) or share icon at the top right of this screen.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Select <span className="text-primary">"Open in Chrome"</span> or <span className="text-primary">"Open in browser"</span>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Once in Chrome, tap the yellow <span className="text-primary uppercase">"Install App"</span> button at the top to complete installation!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      iOS Safari does not support automated prompt installations. Follow these simple steps to install Tournahub on your iPhone or iPad:
                    </p>

                    <div className="space-y-3 bg-surface p-4 border border-border-main rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Tap the <span className="text-primary">Safari Share button</span> (the square box with an arrow pointing up <Share className="w-3.5 h-3.5 inline mx-0.5 text-primary stroke-[2.5px]" />) in Safari's bottom toolbar.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Scroll down the share sheet and select <span className="text-primary">"Add to Home Screen"</span>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Tap <span className="text-primary">"Add"</span> in the top right corner to save Tournahub to your device!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      To install Tournahub as a standalone application on your device:
                    </p>

                    <div className="space-y-3 bg-surface p-4 border border-border-main rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Tap your browser's options menu (<span className="font-mono text-xs">⋮</span> in Chrome, or browser settings).
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <p className="text-[11px] font-bold text-text-main leading-relaxed">
                          Select <span className="text-primary">"Install app"</span> or <span className="text-primary">"Add to Home screen"</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer button */}
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-3 bg-primary text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-colors duration-200 cursor-pointer text-center"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
