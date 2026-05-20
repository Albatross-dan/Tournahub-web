import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Star, ShieldCheck, TrendingUp } from 'lucide-react';
import { ChampionCardData, PrizeCurrency } from '../../types/champion';
import { cn } from '../../lib/utils';

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
            className={cn("font-display text-5xl tracking-widest uppercase", theme.text)}
          >
            {data.champion_title}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500"
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
              <div className={cn(
                "p-1 rounded-full bg-gradient-to-tr",
                data.champion_title === 'Legendary Champion' ? "from-[#FFD700] to-yellow-600" :
                data.champion_title === 'Pro Champion' ? "from-[#00E5FF] to-blue-600" :
                "from-[#A8FF78] to-emerald-600"
              )}>
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black bg-slate-900">
                  {data.winner.avatar_url ? (
                    <img src={data.winner.avatar_url} alt={data.winner.username || 'Winner'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-display text-slate-400">
                      {(data.winner.username || 'W').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
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
            <h3 className="text-3xl font-display tracking-wide uppercase mb-1">
              {data.winner?.username || 'Undisclosed Winner'}
            </h3>
            <div className="flex items-center justify-center gap-3">
              {data.is_paid && data.winner && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
                  <TrendingUp className="w-3 h-3" />
                  {currencySymbols[data.prize_currency]}{data.winner?.prize_amount?.toLocaleString() || '0'}
                </div>
              )}
              {data.winner?.score !== null && (
                <div className="font-mono text-sm font-bold text-slate-400">
                  SCORE: {data.winner?.score}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-900 border border-slate-800">
                  {data.runner_up.avatar_url ? (
                    <img src={data.runner_up.avatar_url} alt={data.runner_up.username || 'Runner Up'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-display text-slate-500">
                      {(data.runner_up.username || 'R').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-tighter">Runner Up</div>
                  <div className="font-display text-lg uppercase tracking-tight">{data.runner_up.username}</div>
                </div>
              </div>
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
    </motion.div>
  );
}
