import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Star, ShieldCheck, TrendingUp, Crown } from 'lucide-react';
import { ChampionCardData, PrizeCurrency } from '../../types/champion';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface ChampionCardProps {
  data: ChampionCardData;
}

const currencySymbols: Record<PrizeCurrency, string> = {
  USD: '$',
  KES: 'KSh',
  NGN: '₦',
  GHS: '₵',
  UGX: 'USh',
  ZAR: 'R'
};

const badgeEmojis: Record<string, string> = {
  'gold': '🥇',
  'silver': '🥈',
  'bronze': '🥉',
  'crown': '👑',
  'star': '⭐',
  'fire': '🔥',
  'diamond': '💎',
  'pro': '🎮',
  'legend': '🐉'
};

export default function ChampionCard({ data }: ChampionCardProps) {
  useEffect(() => {
    if (!data?.winner?.id) return;
    if (data.is_paid) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [data.is_paid]);

  const getThemeColors = () => {
    switch (data.champion_title) {
      case 'Legendary Champion':
        return {
          glow: 'rgba(255, 215, 0, 0.3)',
          border: 'border-[#FFD700]/50',
          text: 'text-[#FFD700]',
          bg: 'bg-[#FFD700]/10',
          accent: '#FFD700'
        };
      case 'Pro Champion':
        return {
          glow: 'rgba(0, 229, 255, 0.3)',
          border: 'border-[#00E5FF]/50',
          text: 'text-[#00E5FF]',
          bg: 'bg-[#00E5FF]/10',
          accent: '#00E5FF'
        };
      default:
        return {
          glow: 'rgba(168, 255, 120, 0.3)',
          border: 'border-[#A8FF78]/50',
          text: 'text-[#A8FF78]',
          bg: 'bg-[#A8FF78]/10',
          accent: '#A8FF78'
        };
    }
  };

  const theme = getThemeColors();

  if (data.poster_ready && data.poster_image_url) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative w-full max-w-lg mx-auto overflow-hidden rounded-[2.5rem] border backdrop-blur-xl bg-black/80",
          theme.border
        )}
        style={{ boxShadow: `0 0 40px ${theme.glow}` }}
      >
        <div className="relative w-full aspect-[9/16] flex items-center justify-center bg-black overflow-hidden rounded-[2.5rem]">
          <img
            src={data.poster_image_url}
            alt={`${data.winner?.username || 'Champion'} Tournament Poster`}
            className="w-full h-full object-contain rounded-[2.5rem]"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative w-full max-w-lg mx-auto overflow-hidden rounded-[2.5rem] border backdrop-blur-xl bg-black/80",
        theme.border
      )}
      style={{ boxShadow: `0 0 40px ${theme.glow}` }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[80px] opacity-20"
          style={{ backgroundColor: theme.accent }}
        />
        <div 
          className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20"
          style={{ backgroundColor: theme.accent }}
        />
      </div>

      <div className="relative p-8 flex flex-col items-center">
        {/* Header Title */}
        <div className="flex flex-col items-center mb-8 gap-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn("font-display text-5xl tracking-widest uppercase text-center", theme.text)}
          >
            {data.champion_title}
          </motion.div>
          {data.runner_up && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs font-bold text-slate-300 uppercase tracking-wide px-4 py-1.5 bg-white/5 rounded-full border border-white/5 mt-1 text-center"
            >
              Beat {data.runner_up.username} {data.winner.score ?? 0}-{data.runner_up.score ?? 0} in the Final
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1"
          >
            {data.tournament_name}
          </motion.div>
        </div>

        {/* Winner Section */}
        <div className="relative mb-8 pt-4">
          {data?.winner ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.6 }}
              className="relative z-10"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                <Crown className={cn(
                  "w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
                  data.champion_title === 'Legendary Champion' ? "text-[#FFD700] fill-[#FFD700]/20" :
                  data.champion_title === 'Pro Champion' ? "text-[#00E5FF] fill-[#00E5FF]/20" :
                  "text-[#A8FF78] fill-[#A8FF78]/20"
                )} />
              </div>

              <Link 
                to={`/players/${data.winner.username}`}
                className="block hover:scale-105 transition-transform"
              >
                <div className={cn(
                  "p-1 rounded-full bg-gradient-to-tr",
                  data.champion_title === 'Legendary Champion' ? "from-[#FFD700] to-yellow-600" :
                  data.champion_title === 'Pro Champion' ? "from-[#00E5FF] to-blue-600" :
                  "from-[#A8FF78] to-emerald-600"
                )}>
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black bg-slate-900">
                    {data.winner.avatar_url ? (
                      <img src={data.winner.avatar_url} alt={data.winner.username || 'Winner'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-display text-slate-400">
                        {(data.winner.username || 'W').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {/* Badge */}
              <div className="absolute -bottom-2 -right-2 bg-black border border-slate-800 p-2 rounded-xl shadow-lg flex items-center justify-center text-2xl">
                {badgeEmojis[data.winner.badge_id || ''] || '🏆'}
              </div>
            </motion.div>
          ) : (
             <div className="w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-900 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-slate-700" />
             </div>
          )}
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <Link 
              to={`/players/${data.winner?.username}`}
              className="hover:text-primary transition-colors inline-block"
            >
              <h3 className="text-3xl font-display tracking-wide uppercase mb-1">
                {data.winner?.username || 'Undisclosed Winner'}
              </h3>
            </Link>
            <div className="flex items-center justify-center gap-3">
              {data.is_paid && data.winner && data.winner.prize_amount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-black uppercase tracking-wider">
                  🏆 {data.prize_currency} {data.winner.prize_amount.toLocaleString()}
                </div>
              )}
              {data.winner?.score !== null && (
                <div className="font-mono text-sm font-bold text-slate-400 flex items-center gap-2">
                  <span>SCORE: {data.winner?.score}</span>
                  {data.is_paid && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Result</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Runner Up Section */}
        {data.runner_up && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full border-t border-slate-800/50 mt-4 pt-6 pb-2"
          >
            <div className="flex items-center justify-between px-2">
              <Link 
                to={`/players/${data.runner_up.username}`}
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform">
                  {data.runner_up.avatar_url ? (
                    <img src={data.runner_up.avatar_url} alt={data.runner_up.username || 'Runner Up'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-display text-slate-500">
                      {(data.runner_up.username || 'R').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-tighter">Runner Up</div>
                  <div className="font-display text-lg uppercase tracking-tight group-hover:text-primary transition-colors">{data.runner_up.username}</div>
                </div>
              </Link>
              <div className="text-right">
                {data.winner.score !== null && data.runner_up.score !== null && (
                   <div className="font-mono text-sm text-slate-500 mb-1">
                    {data.winner.score} vs {data.runner_up.score}
                  </div>
                )}
                {data.is_paid && (
                  <div className="font-mono text-[10px] text-slate-400 uppercase">
                    Prize: {currencySymbols[data.prize_currency]}{data.runner_up.prize_amount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="w-full mt-8 flex flex-col items-center gap-6"
        >
          {data.is_paid && (
             <div className="flex items-center gap-4 text-slate-500">
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-tighter">Total Prize Pool</span>
                <span className="font-display text-xl text-slate-200">
                  {currencySymbols[data.prize_currency]}{data.prize_pool.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-tighter">Status</span>
                <span className={cn(
                  "font-display text-xl uppercase",
                  data.winnings_awarded ? "text-emerald-400" : "text-amber-400"
                )}>
                  {data.winnings_awarded ? 'Distributed' : 'Pending'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              TOURNAHUB · VERIFIED RESULT
            </span>
          </div>
        </motion.div>
      </div>

      {/* Hidden 1080x1920 story-format capture element for Share Victory */}
      <div
        id="story-capture-card"
        className="fixed flex flex-col items-center justify-between p-24 bg-black overflow-hidden select-none z-[-50] pointer-events-none rounded-[3rem]"
        style={{
          width: '1080px',
          height: '1920px',
          left: '-9999px',
          top: '-9999px',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #151515 0%, #000000 100%)',
          border: `6px solid ${theme.accent}40`,
          boxShadow: `inset 0 0 100px ${theme.glow}`,
        }}
      >
        {/* Background ambient spots */}
        <div 
          className="absolute top-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />
        <div 
          className="absolute bottom-48 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />

        {/* Top Header BRAND */}
        <div className="flex flex-col items-center gap-1.5 mt-8 relative z-10">
          <span className="font-mono text-sm uppercase tracking-[0.4em] text-slate-500">
            TOURNAHUB PLATFORM
          </span>
          <div className="h-px w-24 bg-slate-800" />
        </div>

        {/* Main Content Info Block */}
        <div className="flex flex-col items-center gap-8 w-full relative z-10 my-auto">
          {/* Championship Title */}
          <div className="flex flex-col items-center gap-4 text-center">
            <span className={cn("font-display text-7xl tracking-widest uppercase font-black text-center", theme.text)}>
              {data.champion_title}
            </span>
            {data.runner_up && (
              <div className="text-xl font-bold text-slate-300 uppercase tracking-wide px-8 py-3 bg-white/5 rounded-full border border-white/10 max-w-2xl text-center">
                Beat {data.runner_up.username} {data.winner.score ?? 0}-{data.runner_up.score ?? 0} in the Final
              </div>
            )}
            <span className="font-mono text-lg uppercase tracking-[0.3em] text-slate-500 mt-2">
              {data.tournament_name}
            </span>
          </div>

          {/* Winner Profile Photo Sphere */}
          <div className="relative my-8 scale-110">
            {/* Crown */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
              <Crown className={cn(
                "w-16 h-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]",
                data.champion_title === 'Legendary Champion' ? "text-[#FFD700] fill-[#FFD700]/20" :
                data.champion_title === 'Pro Champion' ? "text-[#00E5FF] fill-[#00E5FF]/20" :
                "text-[#A8FF78] fill-[#A8FF78]/20"
              )} />
            </div>

            <div className={cn(
              "p-1.5 rounded-full bg-gradient-to-tr",
              data.champion_title === 'Legendary Champion' ? "from-[#FFD700] to-yellow-600" :
              data.champion_title === 'Pro Champion' ? "from-[#00E5FF] to-blue-600" :
              "from-[#A8FF78] to-emerald-600"
            )}>
              <div className="w-56 h-56 rounded-full overflow-hidden border-8 border-black bg-slate-900">
                {data.winner.avatar_url ? (
                  <img src={data.winner.avatar_url} alt={data.winner.username || 'Winner'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-display text-slate-400">
                    {(data.winner.username || 'W').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Winner Badge Icon */}
            <div className="absolute -bottom-4 -right-4 bg-black border-2 border-slate-800 p-3.5 rounded-2xl shadow-xl flex items-center justify-center text-4xl">
              {badgeEmojis[data.winner.badge_id || ''] || '🏆'}
            </div>
          </div>

          {/* Winner Text Details */}
          <div className="text-center space-y-4">
            <h3 className="text-6xl font-display tracking-wider uppercase font-black text-white">
              {data.winner?.username || 'Undisclosed Winner'}
            </h3>

            <div className="flex items-center justify-center gap-4">
              {data.is_paid && data.winner && data.winner.prize_amount > 0 && (
                <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-lg font-black tracking-wider uppercase">
                  🏆 {data.prize_currency} {data.winner.prize_amount.toLocaleString()}
                </div>
              )}
              {data.winner?.score !== null && (
                <div className="font-mono text-xl font-bold text-slate-400 flex items-center gap-3">
                  <span>SCORE: {data.winner?.score}</span>
                  {data.is_paid && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded uppercase">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Result</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Runner Up Block */}
          {data.runner_up && (
            <div className="w-full max-w-xl border-2 border-dashed border-slate-800/80 bg-slate-950/30 rounded-3xl p-6 mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-900 border-2 border-slate-800 shrink-0">
                    {data.runner_up.avatar_url ? (
                      <img src={data.runner_up.avatar_url} alt={data.runner_up.username || 'Runner Up'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-display text-slate-500">
                        {(data.runner_up.username || 'R').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-mono text-xs text-slate-500 uppercase tracking-wider block">Runner Up</span>
                    <span className="font-display text-2xl uppercase tracking-tight text-slate-200">{data.runner_up.username}</span>
                  </div>
                </div>

                <div className="text-right">
                  {data.winner.score !== null && data.runner_up.score !== null && (
                    <div className="font-mono text-lg text-slate-400 mb-1">
                      {data.winner.score} vs {data.runner_up.score}
                    </div>
                  )}
                  {data.is_paid && (
                    <div className="font-mono text-xs text-slate-500 uppercase">
                      Prize: {currencySymbols[data.prize_currency]}{data.runner_up.prize_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info BRANDING */}
        <div className="w-full flex flex-col items-center gap-6 mt-auto mb-8 relative z-10">
          <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
              TOURNAHUB · VERIFIED RESULT
            </span>
          </div>

          <div className="text-slate-800 font-display text-7xl tracking-tighter select-none font-black opacity-30 mt-4 uppercase">
            TOURNAHUB
          </div>
        </div>
      </div>
    </motion.div>
  );
}
