import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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

const logoUrl = '/logo.png';
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
  const { user } = useAuth();
  const { disputedMatches = [], singleSubmissionMatches = [], abandonedMatches = [] } = useAdminDisputes(user?.id || '');
  const totalAlerts = disputedMatches.length + singleSubmissionMatches.length + abandonedMatches.length;

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-slate-200 font-sans flex">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[#0d0f26] border-r border-slate-800/50 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between">
            <Link to="/admin" className="flex items-center space-x-3 group">
              <img src={logoUrl} alt="Admin" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-xl italic uppercase tracking-tighter text-white whitespace-nowrap"
                  >
                    Admin <span className="text-primary">Hub</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-2 mt-4">
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
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="font-bold text-sm uppercase tracking-widest whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    
                    {item.name === 'Disputes' && totalAlerts > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "absolute right-4 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center border-2 border-[#0d0f26]",
                          !isSidebarOpen && "-top-1 -right-1"
                        )}
                      >
                        <span className="text-[10px] font-black text-white">{totalAlerts}</span>
                      </motion.div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 space-y-2 mb-4 border-t border-slate-800/50 pt-6">
            <Link 
              to="/dashboard"
              className="flex items-center space-x-4 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-sm uppercase tracking-widest whitespace-nowrap"
                  >
                    Public App
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-full flex items-center justify-center p-3 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/5 transition-all hidden md:flex"
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isSidebarOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "md:ml-64" : "md:ml-20"
      )}>
        {/* Top bar for mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0d0f26] border-b border-slate-800/50 mb-6">
          <div className="flex items-center space-x-3">
             <img src={logoUrl} alt="Admin" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
             <span className="font-black italic uppercase text-white tracking-widest">Admin Hub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Dynamic warning and alert banners */}
        <UpcomingMaintenanceBanner />
        <AnnouncementBanner />

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
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
