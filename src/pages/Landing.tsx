import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Trophy, Flame, Zap, Shield, Activity, Menu, X, 
  ChevronRight, Coins, Mail, Sparkles, MessageSquare, 
  Gamepad2, UserCheck, Star, ArrowUpRight, Award, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEO from '../components/common/SEO';

// Existing assets & routes
const logoUrl = '/android-chrome-512x512.png';
const SUPPORT_EMAIL = 'mailto:support@tournahub.me';
const COMMUNITY_WHATSAPP = 'https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z';
const SOCIAL_FACEBOOK = 'https://www.facebook.com/profile.php?id=61590368578569';
const SOCIAL_TIKTOK = 'https://tiktok.com/@tournahub';
const SOCIAL_INSTAGRAM = 'https://www.instagram.com/tournahub.me?igsh=MWVpNWU3cGI2YjQzdQ==';

export default function Landing() {
  const navigate = useNavigate();
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    setIsHamburgerOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinNow = () => {
    navigate('/signup');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#040511] text-text-main font-sans overflow-x-hidden selection:bg-primary selection:text-black">
      <SEO 
        title="Tournahub – Football & eFootball Tournament Management Platform"
        description="Create and manage professional football and eFootball tournaments with dynamic matches, league standings, brackets, automated reward pipelines, local wallets, and tourney moderation logs."
        path="/"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          "name": "Tournahub",
          "url": "https://tournahub.me",
          "logo": "https://tournahub.me/android-chrome-512x512.png",
          "description": "Create and manage professional football and eFootball tournaments with automated match, standings, league brackets and systems.",
          "sameAs": [
            "https://www.facebook.com/profile.php?id=61590368578569",
            "https://tiktok.com/@tournahub",
            "https://www.instagram.com/tournahub.me",
            "https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z"
          ]
        }}
      />
      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#040511]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Left */}
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer focus:outline-none">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/25 blur-lg rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
              <img src={logoUrl} alt="Tournahub Logo" className="w-10 h-10 object-contain relative z-10 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase">
                Tourna<span className="text-primary font-black italic">hub</span>
              </h1>
            </div>
          </Link>

          {/* Navigation Links - Desktop Only */}
          <nav className="hidden lg:flex items-center space-x-8">
            <button onClick={() => scrollToSection('about')} className="text-xs font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary transition-colors cursor-pointer">About</button>
            <button onClick={() => scrollToSection('tournament-types')} className="text-xs font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary transition-colors cursor-pointer">Tournaments</button>
            <button onClick={() => scrollToSection('prizes')} className="text-xs font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary transition-colors cursor-pointer text-nowrap">Prize Pool</button>
            <a href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary transition-colors cursor-pointer">Community</a>
            <a href={SUPPORT_EMAIL} className="text-xs font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary transition-colors cursor-pointer">Support</a>
          </nav>

          {/* Actions Right - Desktop Only */}
          <div className="hidden lg:flex items-center space-x-4">
            <button 
              onClick={handleLogin}
              className="px-6 py-2.5 bg-transparent border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/5 hover:border-white/30 transition-all cursor-pointer"
            >
              Login
            </button>
            <button 
              onClick={handleJoinNow}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-105 cursor-pointer flex items-center gap-1"
            >
              Sign Up <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hamburger Menu - Mobile Trigger */}
          <button 
            onClick={() => setIsHamburgerOpen(!isHamburgerOpen)} 
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-primary cursor-pointer lg:hidden flex items-center justify-center transition-all"
            aria-label="Toggle Hamburger Menu"
          >
            {isHamburgerOpen ? <X className="w-6 h-6 animate-pulse" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Hamburger Menu Slideout / Fallback Dropdown */}
      <AnimatePresence>
        {isHamburgerOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden fixed top-[73px] left-0 right-0 z-40 bg-[#050614]/98 border-b border-white/15 px-6 py-8 backdrop-blur-3xl overflow-y-auto max-h-[calc(100vh-73px)] shadow-2xl flex flex-col space-y-6"
          >
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('about')} 
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary"
              >
                About Section
              </button>
              <button 
                onClick={() => scrollToSection('tournament-types')} 
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary"
              >
                Tournaments Section
              </button>
              <button 
                onClick={() => scrollToSection('prizes')} 
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary"
              >
                Prize Pool Section
              </button>
              <a 
                href={COMMUNITY_WHATSAPP} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => setIsHamburgerOpen(false)}
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary flex items-center justify-between"
              >
                <span>Community Link</span>
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </a>
              <a 
                href={SUPPORT_EMAIL} 
                onClick={() => setIsHamburgerOpen(false)}
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary flex items-center justify-between"
              >
                <span>Support Link</span>
                <Mail className="w-4 h-4 text-primary" />
              </a>
              <Link 
                to="/privacy-policy" 
                onClick={() => setIsHamburgerOpen(false)}
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                onClick={() => setIsHamburgerOpen(false)}
                className="w-full text-left py-3 border-b border-white/5 text-sm font-black uppercase tracking-widest text-[#a3a3c2] hover:text-primary"
              >
                Terms & Conditions
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button 
                onClick={handleLogin}
                className="w-full py-4 text-center border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                Login
              </button>
              <button 
                onClick={handleJoinNow}
                className="w-full py-4 text-center bg-primary rounded-2xl text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 hover:scale-102 transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 2. HERO SECTION */}
      <section className="relative min-h-[95vh] lg:min-h-screen flex items-center justify-center py-24 px-4 sm:px-6 md:px-12 overflow-hidden border-b border-white/5">
        {/* Cinematic deep dark obsidian graphite pitch background */}
        <div className="absolute inset-0 bg-[#05060b]" />
        
        {/* Layered Golden & Obsidian Lighting system */}
        <div className="absolute top-[5%] left-[10%] w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/10 rounded-full blur-[200px] pointer-events-none" />
        
        {/* Background Grey Esports Grid Aspect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none" />

        {/* Dynamic Stadium Line Vector pitch diagram (Fluorescent SVG lines in perspective) styled with gold and platinum accents */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] md:h-[55%] pointer-events-none opacity-25 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Perspectival grid pitch rendering */}
            <g transform="translate(600, 450) scale(1, 0.45) rotate(0)">
              {/* Outer boundary of pitch */}
              <rect x="-550" y="-400" width="1100" height="800" rx="4" stroke="url(#pitchGlow)" strokeWidth="2.5" />
              {/* Center Circle */}
              <circle cx="0" cy="0" r="160" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.4" />
              <circle cx="0" cy="0" r="4" fill="#d4af37" />
              {/* Center Line */}
              <line x1="-550" y1="0" x2="550" y2="0" stroke="url(#centerLineGlow)" strokeWidth="2" />
              {/* Penalty Boxes & Goal Areas */}
              <rect x="-550" y="-180" width="160" height="360" stroke="#a3a3c2" strokeWidth="1.5" strokeOpacity="0.25" />
              <rect x="390" y="-180" width="160" height="360" stroke="#a3a3c2" strokeWidth="1.5" strokeOpacity="0.25" />
              {/* Corner Arcs */}
              <path d="M -550 -370 A 30 30 0 0 1 -520 -400" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M 550 -370 A 30 30 0 0 0 520 -400" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M -550 370 A 30 30 0 0 0 -520 400" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M 550 370 A 30 30 0 0 1 520 400" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.3" />
            </g>
            <defs>
              <linearGradient id="pitchGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a8a8a" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#4a4a4a" />
              </linearGradient>
              <linearGradient id="centerLineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#333333" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#d4af37" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#333333" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Stadium Golden Spotlight Sweep Effects */}
        <motion.div 
          animate={{ rotate: [-6, 12, -12, -6], opacity: [0.08, 0.18, 0.08] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          className="absolute top-0 left-[15%] w-[1.5px] h-[800px] bg-gradient-to-b from-[#d4af37] via-[#d4af37]/20 to-transparent origin-top blur-[1px] pointer-events-none"
        />
        <motion.div 
          animate={{ rotate: [8, -10, 10, 8], opacity: [0.07, 0.15, 0.07] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          className="absolute top-0 right-[15%] w-[1.5px] h-[800px] bg-gradient-to-b from-amber-500 via-amber-500/20 to-transparent origin-top blur-[1px] pointer-events-none"
        />
        <motion.div 
          animate={{ scaleX: [1, 1.3, 0.9, 1], opacity: [0.05, 0.12, 0.05] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[600px] bg-gradient-to-b from-amber-400/10 via-transparent to-transparent origin-top blur-3xl pointer-events-none"
        />

        {/* Micro Floating Golden Dust Particles */}
        {typeof window !== 'undefined' && [...Array(14)].map((_, i) => {
          const delay = i * 0.7;
          const duration = 12 + (i % 5) * 2;
          const leftVal = 5 + (i * 7) % 90;
          return (
            <motion.div
              key={i}
              initial={{ y: "110%", opacity: 0, scale: 0.5 }}
              animate={{ 
                y: "-10%", 
                opacity: [0, 0.35, 0.35, 0],
                scale: [0.5, 1, 1, 0.5] 
              }}
              transition={{ 
                repeat: Infinity, 
                duration, 
                delay, 
                ease: "linear" 
              }}
              className="absolute w-1 h-1 rounded-full bg-amber-400/60 pointer-events-none"
              style={{ left: `${leftVal}%` }}
            />
          );
        })}

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-10 px-2">
          {/* Gold & Carbon Marquee Indicator Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center space-x-2.5 bg-[#12131a] border border-[#d4af37]/30 backdrop-blur-md rounded-full px-5 py-2.5 shadow-[0_0_20px_rgba(212,175,55,0.08)]"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#d4af37]">
              CHAMPION DIVISION S1 ACTIVE • <span className="text-slate-300 font-extrabold font-sans">15,480 PLAYERS ONLINE</span>
            </span>
          </motion.div>

          {/* Epic Sports Typography Header / Gold & Grey Gradient */}
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-[#ededef]"
            >
              PLAY CRAZY <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e5c158] via-[#f7e09a] to-[#bfa141] filter drop-shadow-[0_0_15px_rgba(212,175,55,0.25)] font-black">
                eFOOTBALL
              </span> <br />
              TOURNAMENTS WORLDWIDE
            </motion.h1>
          </div>

          {/* Graphite border accented subtext */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-sm md:text-lg text-slate-300 max-w-2xl mx-auto font-medium tracking-wide leading-relaxed border-x-0 sm:border-y border-zinc-700/30 sm:py-4 px-4 sm:px-0"
          >
            Join competitive escrow tournaments, win gold prize tokens, showcase your validated gamer statistics, and compete with elite football players globally.
          </motion.p>

          {/* Actions - Graphite & Golden Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3 max-w-sm sm:max-w-none mx-auto"
          >
            <button 
              onClick={handleJoinNow}
              className="group relative w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-[#ffd700] via-[#dfb021] to-[#b8860b] text-black font-black uppercase italic tracking-wider rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:scale-[1.03] active:scale-95 transition-all text-base cursor-pointer overflow-hidden flex items-center justify-center gap-2.5 duration-200"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              <span className="relative z-10 flex items-center gap-2 font-black">
                Join Now <Zap className="w-5 h-5 fill-current animate-pulse text-black" />
              </span>
            </button>
            <button 
              onClick={() => scrollToSection('tournament-types')}
              className="group relative w-full sm:w-auto px-10 py-5 bg-[#171821]/80 border border-zinc-700 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 text-slate-200 font-black uppercase italic tracking-wider rounded-2xl hover:scale-[1.03] active:scale-95 transition-all text-base cursor-pointer overflow-hidden flex items-center justify-center gap-2 duration-200"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Explore Tournaments <ChevronRight className="w-5 h-5 text-[#d4af37] group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </motion.div>

          {/* eFootball Broadcast Match HUD Deck Overlay in grey and gold */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.55 }}
            className="pt-14 max-w-4xl mx-auto"
          >
            <div className="relative rounded-[2rem] bg-gradient-to-b from-zinc-700/30 via-amber-500/5 to-[#05060b] p-1 border border-zinc-800 overflow-hidden shadow-[0_20px_50px_rgba(212,175,55,0.05)]">
              {/* Gold glow halo behind dashboard */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="bg-[#0b0c11]/95 rounded-[1.8rem] overflow-hidden relative min-h-[380px] sm:min-h-[420px] flex flex-col justify-between p-4 sm:p-6 md:p-8">
                {/* Stadium aura gold atmosphere filters */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(212,175,55,0.08)_0%,transparent_65%)] pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                
                {/* Background stadium image with low visibility grey mask */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img 
                    src="/assets/homepage/hero-banner/file_00000000d8b071fda6b369cae5becea2.png" 
                    alt="eFootball Esports Stadium Arena" 
                    className="w-full h-full object-cover opacity-20 filter grayscale"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* 1. LOBBY HEADER BAR OF HUD DISPLAY */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-white border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">
                      VIRTUAL LOBBY // SERVER: GOLD-CENTRAL // ROOM #1209
                    </span>
                  </div>
                  <div className="bg-[#171821] border border-[#d4af37]/20 px-3 py-1 rounded-md">
                    <span className="text-[9px] font-mono tracking-widest text-[#d4af37] font-extrabold">
                      MATCHMAKING PING: 12ms
                    </span>
                  </div>
                </div>

                {/* 2. MATCHUP CONTENT */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-6 md:py-10">
                  
                  {/* Participant Left: Champion */}
                  <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-400/10 blur-md rounded-full" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#1c1d24] to-[#12131a] border border-[#d4af37]/50 p-0.5 shadow-lg flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-[#d4af37]" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight text-white mb-0.5">KINGSLEY_FC</h4>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] font-black">
                        Rank: Grandmaster S1
                      </p>
                      <div className="flex items-center gap-1 justify-center md:justify-end mt-1 text-[9px] font-bold text-slate-400">
                        <span>Win-rate: 76.5%</span> • <span>Streak: 7W</span>
                      </div>
                    </div>
                  </div>

                  {/* VS Middle Circle Deck */}
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="relative flex items-center justify-center h-20 w-20">
                      {/* Interactive glowing spinning ring */}
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-[#d4af37]/30"
                      />
                      <div className="absolute inset-2 bg-[#05060b] border border-zinc-800 rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-xl sm:text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] to-slate-400">
                          VS
                        </span>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] tracking-widest text-amber-400 font-mono font-black uppercase">
                        $500 PRIZE POOL
                      </span>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                        ESTIMATED START: IMMEDIATE
                      </p>
                    </div>
                  </div>

                  {/* Participant Right: Challenger */}
                  <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-zinc-600/10 blur-md rounded-full" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#1c1d24] to-[#12131a] border border-zinc-600 p-0.5 shadow-lg flex items-center justify-center">
                        <Activity className="w-8 h-8 text-slate-300" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight text-white mb-0.5">NEXT_GEN_PRO</h4>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-black">
                        Rank: Challenger V
                      </p>
                      <div className="flex items-center gap-1 justify-center md:justify-start mt-1 text-[9px] font-bold text-slate-400">
                        <span>Win-rate: 71.2%</span> • <span>Streak: 4W</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. LOWER FOOTER OF SPECTATOR MATCH INFO */}
                <div className="relative z-10 grid grid-cols-3 items-center gap-3 border-t border-zinc-800 pt-4 text-center">
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-black italic text-[#d4af37]">CHAMPION DECK</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Elite Group</p>
                  </div>
                  <div className="flex justify-center">
                    <span className="px-4 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[9px] sm:text-xs font-black text-white uppercase tracking-widest">
                      EFOOTBALL MOBILE & CONSOLE
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-black italic text-slate-300">CHALLENGER DECK</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rising Division Star</p>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* 3. SECTION 1 — WHAT IS TOURNAMENT HUB */}
      <section id="about" className="py-24 px-6 md:px-12 bg-[#050616] border-b border-white/5 relative">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Texts */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#a3a3c2]">THE PLATFORM SPECS</span>
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter">
                WHAT IS <span className="text-primary italic">TOURNAMENT HUB</span>
              </h2>

              <p className="text-base text-[#a3a3c2] leading-relaxed font-semibold">
                Tournahub is the ultimate global arena designed strictly for eFootball players. Create, discover, and conquer professional-grade tournaments under secure parameters. Showcase your gaming stats and climb to global supremacy.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wide">Competitive eFootball tournament system</h4>
                    <p className="text-xs text-text-muted mt-1">Structured formats specifically created to handle customized mobile & console eFootball parameters easily.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wide">Players create and join tournaments</h4>
                    <p className="text-xs text-text-muted mt-1">Host custom tournaments with your own custom settings, entry fee, and specific participant requirements instantly.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wide">Real-time competition & matchmaking</h4>
                    <p className="text-xs text-text-muted mt-1">Instantly get paired up, monitor upcoming schedules, chat directly with adversaries on the match panel, and enter scores.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Graphic Placeholder / Folder asset reference */}
            <div className="relative rounded-[2rem] bg-gradient-to-tr from-white/10 via-cyan-500/5 to-white/5 p-1 border border-white/10 overflow-hidden shadow-2xl min-h-[320px] flex flex-col justify-center items-center">
              <div className="absolute inset-0 bg-[#0c0e22] rounded-[1.8rem]" />
              <img 
                src="/assets/homepage/about-section/1779866458270.png" 
                alt="Tournament Hub Esports Ecosystem" 
                className="w-full h-full object-cover rounded-[1.8rem] opacity-90 absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050616] via-transparent to-transparent pointer-events-none rounded-[1.8rem]" />
            </div>
          </div>

          {/* Feature Cards Grid (4 Features requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
            <div className="card p-6 bg-surface/80 border-border-main rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
              <Zap className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-sm font-black uppercase text-white mb-2 italic">Fast tournaments</h3>
              <p className="text-xs text-[#a3a3c2] leading-relaxed">Rapid registration process, automatic match generation, instant scheduling updates without long delays.</p>
            </div>

            <div className="card p-6 bg-surface/80 border-border-main rounded-2xl relative overflow-hidden group hover:border-[#10b981]/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#10b981]/10 transition-colors" />
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-sm font-black uppercase text-white mb-2 italic">Secure system</h3>
              <p className="text-xs text-[#a3a3c2] leading-relaxed">Transparent financial escrows for paid entries, digital tracking, secure wallet mechanics, and dispute systems.</p>
            </div>

            <div className="card p-6 bg-surface/80 border-border-main rounded-2xl relative overflow-hidden group hover:border-[#38bdf8]/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#38bdf8]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#38bdf8]/10 transition-colors" />
              <Award className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-sm font-black uppercase text-white mb-2 italic">Global competition</h3>
              <p className="text-xs text-[#a3a3c2] leading-relaxed">Test your skills against world-class opponents across geographic time zones in unified tournament settings.</p>
            </div>

            <div className="card p-6 bg-surface/80 border-border-main rounded-2xl relative overflow-hidden group hover:border-amber-400/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/10 transition-colors" />
              <Activity className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-sm font-black uppercase text-white mb-2 italic">Live tracking</h3>
              <p className="text-xs text-[#a3a3c2] leading-relaxed">Watch fixture progression live, check standings instantly, and receive instant push notifications on tournament details.</p>
            </div>
          </div>
        </div>
      </section>


      {/* 4. SECTION 2 — TOURNAMENT TYPES */}
      <section id="tournament-types" className="py-24 px-6 md:px-12 bg-[#040511] border-b border-white/5 relative">
        <div className="absolute top-1/2 left-0 w-[200px] h-[350px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded-full">
              <Gamepad2 className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">MULTIPLE FORMATS DEPLOYABLE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter">
              TOURNAMENT <span className="text-primary">TYPES</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
              We support multiple diverse competition standards tailored to test endurance, planning, and raw control.
            </p>
          </div>

          {/* Main Tournament Types Visual Showcase */}
          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group bg-surface/30">
            <div className="absolute inset-0 bg-gradient-to-t from-[#040511] via-transparent to-cyan-500/5 pointer-events-none" />
            <img 
              src="/assets/homepage/tournament-types/1779864606712.png" 
              alt="Tournament Formats Showcase" 
              className="w-full max-h-[350px] object-contain mx-auto relative z-10 p-2 sm:p-4 rounded-3xl"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Visual Cards for Tournament Types (Knockout, League, Swiss) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            
            {/* Type 1: Knockout */}
            <div className="card p-8 bg-surface/40 backdrop-blur-md border border-border-main rounded-3xl relative overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between min-h-[380px]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary to-emerald-400" />
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-white">Knockout format</h3>
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Single Elimination Arena</p>
                </div>
                <p className="text-xs text-[#a3a3c2] leading-relaxed">
                  Lose once = elimination. Under high-tension setups, every single pass and shot dictates survival. Perfectly crafted for dramatic brackets, quick turnarounds, and ultimate high-stakes showdowns.
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-widest">
                <span>Asset: types/knockout-visual.png</span>
                <Trophy className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Type 2: League */}
            <div className="card p-8 bg-surface/40 backdrop-blur-md border border-border-main rounded-3xl relative overflow-hidden group hover:border-cyan-400/50 transition-all flex flex-col justify-between min-h-[380px]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 to-emerald-500" />
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-white">League format</h3>
                  <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">Points-Based Marathon</p>
                </div>
                <p className="text-xs text-[#a3a3c2] leading-relaxed">
                  Points-based global competition models. Consistent playing rewards winners. Earn 3 points for a win, 1 point for a draw, and 0 for a defeat. Climb the official ranking leaderboard until champions claim top glory.
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-widest">
                <span>Asset: types/league-visual.png</span>
                <Coins className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            {/* Type 3: Swiss */}
            <div className="card p-8 bg-surface/40 backdrop-blur-md border border-border-main rounded-3xl relative overflow-hidden group hover:border-emerald-400/50 transition-all flex flex-col justify-between min-h-[380px]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 border border-emerald-400/20">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-white">Swiss format</h3>
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Balanced Matchmaking Systems</p>
                </div>
                <p className="text-xs text-[#a3a3c2] leading-relaxed">
                  Balanced multi-round competition system. Opponents face peers with identical performance records each round. Maximize matches and reduce premature early eliminations for consistent gamers.
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-widest">
                <span>Asset: types/swiss-visual.png</span>
                <Star className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            
          </div>
          
          <div className="text-center text-xs font-mono text-text-muted/60 uppercase pt-4">
            Unified game tracking frameworks.
          </div>
        </div>
      </section>


      {/* 5. SECTION 3 — TROPHIES & PRIZES */}
      <section id="prizes" className="py-24 px-6 md:px-12 bg-[#050616] border-b border-white/5 relative">
        <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Box on Left */}
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-primary/30 to-black/40 p-1 border border-primary/20 overflow-hidden shadow-2xl min-h-[360px] flex items-center justify-center text-center">
              <div className="absolute inset-0 bg-[#0c0e22] rounded-[2.3rem]" />
              
              {/* Electric prize glows */}
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
              
              <img 
                src="/assets/homepage/prizes/1779865574403.png" 
                alt="Elite Prizes Cup" 
                className="w-full h-full object-cover rounded-[2.3rem] opacity-90 absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none rounded-[2.3rem]" />
              
              <div className="relative z-10 p-8 pt-48">
                <h3 className="text-xl sm:text-2xl font-black italic text-white uppercase drop-shadow-md">CHAMPIONSHIP TROPHIES</h3>
                <p className="text-xs text-primary font-bold uppercase tracking-widest leading-relaxed drop-shadow-md">
                  REWARDS & TOURNAMENT POOLS
                </p>
              </div>
            </div>

            {/* Explanations on Right */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-1 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#a3a3c2]">REWARDS & COINS STATE</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter">
                COMPETE FOR <span className="text-primary">TROPHIES & REWARDS</span>
              </h2>

              <p className="text-base text-[#a3a3c2] leading-relaxed font-semibold">
                Gain immense global recognition, write your name on the legends leaderboard, and compete for verified escrow financial prize pools securely managed through our digital architecture.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="bg-white/2 rounded-2xl p-5 border border-white/5 space-y-2">
                  <span className="text-xs font-black text-primary uppercase tracking-widest">01 / Gold Trophies</span>
                  <p className="text-xs text-text-muted">Win official digital winner trophies loaded directly to your validated gamer profile for global ranking showcase.</p>
                </div>

                <div className="bg-white/2 rounded-2xl p-5 border border-white/5 space-y-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">02 / Win Rewards</span>
                  <p className="text-xs text-text-muted">Gain instant financial transfers, entry vouchers, and priority deployment accesses across seasonal structures.</p>
                </div>

                <div className="bg-white/2 rounded-2xl p-5 border border-white/5 space-y-2">
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">03 / Championships</span>
                  <p className="text-xs text-text-muted">Enter elite, exclusive invitationals and seasonal championships hosted by administrators for premium rewards.</p>
                </div>

                <div className="bg-white/2 rounded-2xl p-5 border border-white/5 space-y-2">
                  <span className="text-xs font-black text-amber-500 uppercase tracking-widest">04 / Global Rankings</span>
                  <p className="text-xs text-text-muted">Gain points with every victory to continuously raise your global standing against rivals in weekly tournament groups.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs font-mono text-text-muted/60 uppercase border-t border-white/5 pt-6">
            Compete on high-stakes secure systems.
          </div>
        </div>
      </section>


      {/* 6. SECTION 4 — SHOWCASE YOUR SKILLS */}
      <section className="py-24 px-6 md:px-12 bg-[#040511] border-b border-white/5 relative">
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column Texts */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-1.5 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#a3a3c2]">PERSONAL GAMING RECORD</span>
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter">
                SHOWCASE YOUR <span className="text-primary">SKILLS</span>
              </h2>

              <p className="text-base text-[#a3a3c2] leading-relaxed font-semibold">
                Do not just play, document your destiny. Every victory is verified and added directly to your official profile card. Make opponents realize your pedigree before matches even commence.
              </p>

              <div className="space-y-4 pt-2">
                <div className="bg-surface/50 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">Build Gaming Reputation</h4>
                    <p className="text-xs text-text-muted">Display your active win percentages, total earnings, and current win streaks.</p>
                  </div>
                </div>

                <div className="bg-surface/50 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">Track Wins & Goals</h4>
                    <p className="text-xs text-text-muted">Every game played is calculated, showing goals scored, clean sheets, and historic fixtures.</p>
                  </div>
                </div>

                <div className="bg-surface/50 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">Earn Profile Badges</h4>
                    <p className="text-xs text-text-muted">Claim unique customization badges to represent yourself in live lobbies.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column Profile Showcase Visual */}
            <div className="relative rounded-[2rem] bg-gradient-to-tr from-cyan-500/10 via-emerald-500/5 to-white/5 p-1 border border-white/10 overflow-hidden shadow-2xl min-h-[360px] flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0c0e22] rounded-[1.8rem]" />
              <img 
                src="/assets/homepage/skills-showcase/Screenshot_20260526_203636_TikTok Lite (1).jpg" 
                alt="Player Profile Card Showcase" 
                className="w-full h-full object-cover rounded-[1.8rem] opacity-90 absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040511]/90 via-transparent to-transparent pointer-events-none rounded-[1.8rem]" />
              <div className="relative z-10 p-8 pt-56 text-center">
                <span className="text-[10px] sm:text-xs font-black bg-primary text-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Gamer Identity Card</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs font-mono text-text-muted/60 uppercase pt-4">
            Compete on high-stakes systems.
          </div>
        </div>
      </section>


      {/* 7. SECTION 5 — COMMUNITY */}
      <section className="py-24 px-6 md:px-12 bg-[#050616] border-b border-white/5 relative">
        <div className="absolute top-1/4 right-1/3 w-[250px] h-[250px] bg-[#22c55e]/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#a3a3c2]">JOIN THE REBELLION</span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter">
              JOIN THE <span className="text-primary">COMMUNITY</span>
            </h2>

            <p className="text-xs sm:text-sm text-text-muted uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
              We leverage existing social grids to keep the community growing daily. Connect with admins and fellow rivals instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center pt-8">
            {/* Left explanation and redirect to social/existing links */}
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase italic text-white tracking-tight">GROWING GLOBAL eFOOTBALL COMMUNITY</h3>
              <p className="text-sm text-[#a3a3c2] leading-relaxed">
                Connect and debate with other eFootball gamers, resolve pending questions directly, search out rival squads or leagues, and trade strategy walkthroughs. Always secure, and permanently moderate.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a 
                  href={COMMUNITY_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 text-[#25D366] hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#25D366]/5"
                >
                  Join Telegram Channel <ArrowUpRight className="w-4 h-4" />
                </a>
                <a 
                  href={SOCIAL_FACEBOOK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-[#1877F2] hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#1877F2]/5"
                >
                  Facebook Group <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              {/* Grid of existing social media icons */}
              <div className="pt-6">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-4">Follow us across active streams</p>
                <div className="flex gap-4">
                  <a 
                    href={SOCIAL_TIKTOK} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-12 h-12 rounded-xl bg-white/3 hover:bg-white/10 border border-white/5 hover:border-white/30 flex items-center justify-center text-white transition-all transform hover:-translate-y-1 cursor-pointer"
                    title="TikTok Link"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.14 2.37 1.84 3.84 2.05v3.66c-1.89-.08-3.74-.82-5.13-2.11v6.97c-.01 2.28-1.24 4.41-3.26 5.48-2.02 1.07-4.52.88-6.38-.49-1.86-1.37-2.68-3.73-2.08-5.99.6-2.26 2.65-3.82 5.01-3.82.47 0 .94.05 1.4.15v3.83c-.87-.31-1.84-.18-2.6.35-.76.53-1.18 1.44-1.07 2.38.11.94.75 1.72 1.63 1.99.88.27 1.85-.04 2.4-.78.36-.48.55-1.06.54-1.66V0h.01a.34.34 0 0 0-.25.02z" />
                    </svg>
                  </a>
                  <a 
                    href={SOCIAL_INSTAGRAM} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-12 h-12 rounded-xl bg-white/3 hover:bg-white/10 border border-white/5 hover:border-white/30 flex items-center justify-center text-[#E1306C] transition-all transform hover:-translate-y-1 cursor-pointer"
                    title="Instagram Link"
                  >
                    <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Right community image visual */}
            <div className="relative rounded-[2rem] bg-gradient-to-tr from-emerald-500/10 via-emerald-500/5 to-white/5 p-1 border border-white/10 overflow-hidden shadow-2xl min-h-[300px] flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0c0e22] rounded-[1.8rem]" />
              <img 
                src="/assets/homepage/community/file_0000000095c071fdb7a306d9e22cfcd9.png" 
                alt="Tournahub Global Community Feed" 
                className="w-full h-full object-cover rounded-[1.8rem] opacity-95 absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-[1.8rem]" />
              <div className="relative z-10 text-center p-4">
                <UsersGroupVisual />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 8. SECTION 6 — CALL TO ACTION */}
      <section className="py-28 px-6 md:px-12 bg-gradient-to-b from-[#050616] to-[#040511] relative overflow-hidden text-center border-b border-white/5">
        <div className="absolute inset-0 bg-[#040511]" />
        
        {/* Esports CTA Backdrop Image */}
        <img 
          src="/assets/homepage/cta/file_000000001e5471f5a145064413c9ce19.png" 
          alt="Esports CTA Backdrop" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-lighten"
          referrerPolicy="no-referrer"
        />

        {/* Futuristic Cyber Orbs inside CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -bottom-24 left-10 w-[300px] h-[300px] bg-[#00f0ff]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/30 to-emerald-500/10 border border-primary/40 px-5 py-2 rounded-full">
            <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">IMMEDIATE COGNITION ACTIVE</span>
          </div>

          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-none text-white">
            READY TO <span className="text-primary italic">COMPETE?</span>
          </h2>

          <p className="text-xs sm:text-base text-[#a3a3c2] max-w-lg mx-auto uppercase font-bold tracking-widest leading-relaxed">
            Deployment takes less than two minutes. Create your credentials, sync up your wallets, select your preferred badge and conquer matches.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={handleJoinNow}
              className="w-full sm:w-auto px-10 py-5 bg-primary hover:bg-primary-hover text-black font-black uppercase italic tracking-tighter rounded-2xl shadow-xl shadow-primary/25 hover:scale-105 transition-all text-base cursor-pointer"
            >
              Sign Up For Free
            </button>
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white font-black uppercase italic tracking-tighter rounded-2xl transition-all text-base cursor-pointer"
            >
              Start Playing
            </button>
          </div>

          <p className="text-[10px] font-mono text-text-muted/60 uppercase pt-4">
            Unified Esports tournament network.
          </p>
        </div>
      </section>


      {/* 9. FOOTER */}
      <footer className="bg-[#030409] py-16 px-6 md:px-12 text-[#a3a3c2] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & Meta Column */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center space-x-3">
              <img src={logoUrl} alt="Tournahub Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
              <span className="text-lg font-black uppercase italic text-white tracking-widest">
                Tourna<span className="text-primary font-black italic">hub</span>
              </span>
            </div>
            <p className="text-xs text-text-muted/80 max-w-sm leading-relaxed">
              Global eFootball tournaments aggregator. Manage high-stakes championships, track interactive local leaderboards, and dispute listings transparently.
            </p>
          </div>

          {/* Site Navigation Links (Existing Routes) */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Navigation</h4>
            <div className="flex flex-col space-y-2 text-xs">
              <button onClick={() => scrollToSection('about')} className="text-left text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">About System</button>
              <button onClick={() => scrollToSection('tournament-types')} className="text-left text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Formats</button>
              <button onClick={() => scrollToSection('prizes')} className="text-left text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Prize Trophies</button>
              <a href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Main Channel</a>
            </div>
          </div>

          {/* Legal / Social Column */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Compliances</h4>
            <div className="flex flex-col space-y-2 text-xs">
              <Link to="/rules" className="text-primary hover:text-primary-hover transition-all uppercase tracking-widest font-black flex items-center gap-1">
                Tournahub Rules & Policies
              </Link>
              <Link to="/privacy-policy" className="text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Privacy Policy</Link>
              <Link to="/terms" className="text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Terms & Conditions</Link>
              <a href={SUPPORT_EMAIL} className="text-text-muted hover:text-primary transition-all uppercase tracking-widest font-bold">Direct Support</a>
            </div>
          </div>
        </div>

        {/* Lower copyrights bar */}
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} TOURNAHUB GLOBAL ENTERPRISE. ALL RIGHTS RESERVED.
          </p>
          
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a3a3c2]">Unified Matchmaking Matrix Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Visual layout helper for group members
function UsersGroupVisual() {
  return (
    <div className="flex items-center -space-x-4 justify-center">
      <div className="w-11 h-11 rounded-full border border-white/20 bg-primary/20 flex items-center justify-center font-black italic uppercase text-xs text-primary shadow-xl">U1</div>
      <div className="w-11 h-11 rounded-full border border-white/20 bg-cyan-400/20 flex items-center justify-center font-black italic uppercase text-xs text-cyan-400 shadow-xl">U2</div>
      <div className="w-11 h-11 rounded-full border border-white/20 bg-emerald-400/20 flex items-center justify-center font-black italic uppercase text-xs text-emerald-400 shadow-xl">U3</div>
      <div className="w-11 h-11 rounded-full border border-white/20 bg-[#fe2c55]/20 flex items-center justify-center font-black italic uppercase text-xs text-[#fe2c55] shadow-xl">U4</div>
      <div className="w-11 h-11 rounded-full border border-white/20 bg-[#7c3aed]/20 flex items-center justify-center font-black italic uppercase text-xs text-[#7c3aed] shadow-xl">+9k</div>
    </div>
  );
}
