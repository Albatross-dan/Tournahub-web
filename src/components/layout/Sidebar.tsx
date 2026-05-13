import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, LayoutDashboard, Calendar, 
  Wallet, User, Settings, ShieldCheck, 
  MessageSquare, Bell, LogOut, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { isAdmin, signOut, profile } = useAuth();
  const location = useLocation();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Keep it reasonable on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [location.pathname, setIsOpen]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Matches', path: '/matches', icon: Calendar },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const adminItems = [
    { name: 'Admin Hub', path: '/admin', icon: ShieldCheck },
    { name: 'All Tournaments', path: '/admin/tournaments', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isOpen ? 256 : 80,
        x: (typeof window !== 'undefined' && window.innerWidth < 1024) ? (isOpen ? 0 : -256) : 0
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className={cn(
        "bg-surface border-r border-slate-800 flex flex-col z-40 fixed lg:sticky top-0 h-screen shrink-0 overflow-hidden shadow-2xl lg:shadow-none",
        !isOpen && "lg:w-20"
      )}
    >
      <div className="p-6 flex items-center justify-between h-20 shrink-0">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div 
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center justify-between w-full"
            >
              <span className="text-xl font-bold tracking-tighter text-white flex items-center">
                <Trophy className="w-6 h-6 text-primary mr-2" />
                Tourna<span className="text-primary text-2xl font-extrabold -ml-1">Hub</span>
              </span>
              <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-2">
                <X size={20} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="logo-small"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <Trophy className="w-8 h-8 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <SidebarItem key={item.path} item={item} collapsed={!isOpen} />;
        })}

        {isAdmin && (
          <div className="pt-6 space-y-2">
            {isOpen && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Management</p>}
            {adminItems.map((item) => {
              const Icon = item.icon;
              return <SidebarItem key={item.path} item={item} collapsed={!isOpen} color="hover:bg-primary/10 hover:text-primary" />;
            })}
          </div>
        )}
      </nav>

      {/* Profile Summary in Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-4 mx-3 mb-2 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary italic">
                {(profile?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white italic truncate uppercase tracking-tighter">
                  {profile?.username || 'Gamer'}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {isAdmin ? 'Admin Access' : 'Pro Member'}
                </p>
              </div>
            </div>
            {!isAdmin && (
               <div className="bg-primary/10 rounded-lg p-2 border border-primary/20">
                  <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] text-center">Standard Account</p>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <button 
          type="button"
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 active:scale-95 transition-all group",
            !isOpen && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="ml-3 font-medium">Logout</span>}
        </button>
      </div>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-24 bg-primary text-slate-900 rounded-full p-1 border-4 border-background hover:scale-110 transition-transform hidden lg:block z-50 shadow-xl"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </motion.aside>
  );
}

function SidebarItem({ item, collapsed, color }: { item: any; collapsed: boolean; color?: string; key?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => cn(
        "flex items-center p-3 rounded-xl transition-all group relative",
        isActive ? "bg-primary text-slate-900 shadow-lg shadow-primary/20" : color || "text-slate-400 hover:bg-slate-800 hover:text-white",
        collapsed && "justify-center"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="ml-3 font-medium whitespace-nowrap"
          >
            {item.name}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-800">
          {item.name}
        </div>
      )}
    </NavLink>
  );
}
