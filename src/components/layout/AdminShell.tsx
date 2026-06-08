import React, { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Trophy, Users, 
  Gamepad2, Wallet, BarChart3, 
  ChevronRight, LogOut, Shield,
  Menu, X, Gavel, Wrench
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAdminDisputes } from '../../hooks/useAdminDisputes';
import { useAuth } from '../../contexts/AuthContext';

const logoUrl = '/android-chrome-512x512.png';
import UpcomingMaintenanceBanner from './UpcomingMaintenanceBanner';
import AnnouncementBanner from './AnnouncementBanner';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Platform Gates', path: '/admin/platform', icon: Wrench },
  { name: 'Tournaments', path: '/admin/tournaments', icon: Trophy },
  { name: 'Fixtures', path: '/admin/fixtures', icon: Gamepad2 },
  { name: 'Disputes', path: '/admin/moderation', icon: Gavel },
  { name: 'Contenders', path: '/admin/players', icon: Users },
  { name: 'Logs', path: '/admin/logs', icon: Shield },
  { name: 'Wallet', path: '/admin/wallet', icon: Wallet },
  { name: 'Standings', path: '/admin/standings', icon: BarChart3 },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, isAdmin } = useAuth();

  useEffect(() => {
    console.log('[AdminShell] Route Entry Evaluation:', {
      timestamp: new Date().toISOString(),
      path: location.pathname,
      loading,
      hasUser: !!user,
      userId: user?.id,
      userRole: profile?.role,
      isAdmin
    });

    if (!loading && (!user || !isAdmin)) {
      console.warn('[AdminShell] Missing admin rights. Redirecting user to /dashboard:', { email: user?.email, isAdmin, role: profile?.role });
      navigate('/dashboard', { replace: true });
    }
  }, [user, profile, isAdmin, loading, navigate, location.pathname]);

  const { disputedMatches = [], singleSubmissionMatches = [], abandonedMatches = [], noShowCount = 0 } = useAdminDisputes(user?.id || '');
  const totalAlerts = disputedMatches.length + singleSubmissionMatches.length + abandonedMatches.length + noShowCount;

  if (loading) {
    console.log('[AdminShell] Loading admin shell credentials verification...');
    return (
      <div className="min-h-screen bg-[#0a0b1e] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 animate-pulse">Running admin credential check...</span>
      </div>
    );
  }

  if (!isAdmin) {
    console.warn('[AdminShell] Rendering null because isAdmin is FALSE. A redirect is initiated.', { email: user?.email, isAdmin });
    return null; // Don't show anything during redirect
  }

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-slate-200 font-sans flex">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[#0d0f26] border-r border-slate-800/50 transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
          isSidebarOpen ? "w-64" : "w-0 border-r-0"
        )}
      >
        <div className="flex flex-col h-full w-64">
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between">
            <Link to="/admin" className="flex items-center space-x-3 group">
              <img src={logoUrl} alt="Admin" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-black text-xl italic uppercase tracking-tighter text-white whitespace-nowrap"
              >
                Admin <span className="text-primary">Hub</span>
              </motion.span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => cn(
                  "flex items-center space-x-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(0,209,255,0.05)]" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div 
                        layoutId="activeAdminNav"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                      />
                    )}
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                    <span className="font-bold text-sm uppercase tracking-widest whitespace-nowrap">
                      {item.name}
                    </span>
                    
                    {item.name === 'Disputes' && totalAlerts > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-4 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center border-2 border-[#0d0f26]"
                      >
                        <span className="text-[10px] font-black text-white">{totalAlerts}</span>
                      </motion.div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0",
        isSidebarOpen ? "md:ml-64" : "md:ml-0"
      )}>
        {/* Unified Header for Desktop & Mobile */}
        <header className="flex items-center justify-between p-4 bg-[#0d0f26] border-b border-slate-800/50">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-slate-800/60 transition-all flex items-center gap-2"
              title={isSidebarOpen ? "Collapse Side Menu" : "Expand Side Menu"}
            >
              <Menu className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isSidebarOpen ? "Hide Menu" : "Show Menu"}
              </span>
            </button>
            <div className="flex items-center space-x-2">
              <img src={logoUrl} alt="Admin" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
              <span className="font-black italic uppercase text-white tracking-widest text-xs hidden sm:inline-block">Admin Control</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link 
              to="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Public App</span>
            </Link>
          </div>
        </header>

        {/* Dynamic warning and alert banners */}
        <UpcomingMaintenanceBanner />
        <AnnouncementBanner />

        <div className="p-6 md:p-10 max-w-7xl w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
