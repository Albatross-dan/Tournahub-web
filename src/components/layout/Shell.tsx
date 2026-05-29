import React from 'react';
import Navbar from './Navbar';
import { motion } from 'motion/react';
import UpcomingMaintenanceBanner from './UpcomingMaintenanceBanner';
import AnnouncementBanner from './AnnouncementBanner';
import { Link } from 'react-router-dom';

export default function Shell({ children }: { children: React.ReactNode }) {
  const SUPPORT_EMAIL = 'mailto:support@tournahub.me';
  const COMMUNITY_WHATSAPP = 'https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z';

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden font-sans">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_top,rgba(0,209,255,0.03)_0%,transparent_100%)] pointer-events-none" />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        {/* Navbar */}
        <Navbar />
 
        {/* Top-aligned warnings and banners */}
        <UpcomingMaintenanceBanner />
        <AnnouncementBanner />
 
        {/* Main Content */}
        <main className="flex-1 px-4 overflow-y-auto w-full custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto w-full pb-10 flex flex-col min-h-full justify-between"
          >
            <div>
              {children}
            </div>

            {/* Unified Minimal Esport Footer */}
            <footer className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#a3a3c2] shrink-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <img src="/android-chrome-512x512.png" alt="Tournahub Logo" className="w-5 h-5 object-contain" />
                <span className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                  Tournahub Rules & Policies
                </span>
                <span className="text-zinc-750 hidden sm:inline">|</span>
                <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wide">
                  All rights reserved
                </span>
              </div>
              <div className="flex items-center gap-6 font-black uppercase tracking-widest text-[9px] text-[#a3a3c2]">
                <Link to="/rules" className="text-white hover:text-[#d4af37] transition-all">Rules Page</Link>
                <a href={SUPPORT_EMAIL} className="hover:text-[#d4af37] transition-all">Support</a>
                <a href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-all">Contact</a>
              </div>
            </footer>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
