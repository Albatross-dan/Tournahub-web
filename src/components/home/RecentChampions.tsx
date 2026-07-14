import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, ArrowUpRight, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RecentChampionFeedItem } from '../../types/champion';
import { Link } from 'react-router-dom';
import { overrideRecentChampionsFeed } from '../../utils/tournamentOverrides';

const CrownIcon = () => (
  <svg className="w-8 h-8 text-[#FFD700] fill-[#FFD700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 4l3 5 7-6 7 6 3-5-3 15H5L2 4z" />
  </svg>
);

const FALLBACK_CHAMPIONS: RecentChampionFeedItem[] = [
  {
    tournament_id: '1',
    tournament_name: 'Groupstage Arena',
    champion_title: 'Tournament Champion',
    winner_id: 'fallback-1',
    winner_username: 'Zeus_Playz',
    winner_avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    completed_at: new Date().toISOString()
  },
  {
    tournament_id: '2',
    tournament_name: 'Alpha Div Pro',
    champion_title: 'Legendary Champion',
    winner_id: 'fallback-2',
    winner_username: 'Viper_Striker',
    winner_avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
    completed_at: new Date().toISOString()
  },
  {
    tournament_id: '3',
    tournament_name: 'Warzone Masters',
    champion_title: 'Pro Champion',
    winner_id: 'fallback-3',
    winner_username: 'Nighthawk',
    winner_avatar_url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=150',
    completed_at: new Date().toISOString()
  }
];

export default function RecentChampions() {
  const { data: remoteChampions = [], status: queryStatus } = useQuery<RecentChampionFeedItem[]>({
    queryKey: ['recent_champions_feed'],
    queryFn: async () => {
      // Safely fetch
      const { data, error } = await (supabase as any).rpc('get_recent_champions_feed', { p_limit: 10 });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });

  const displayChampions = remoteChampions.length > 0
    ? overrideRecentChampionsFeed(remoteChampions)
    : FALLBACK_CHAMPIONS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Auto transition every 4 seconds alternating left and right
  useEffect(() => {
    if (displayChampions.length <= 1) return;
    const timer = setInterval(() => {
      setDirection((prev) => prev * -1);
      setCurrentIndex((prev) => (prev + 1) % displayChampions.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [displayChampions.length]);

  const currentChampion = displayChampions[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : -150,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 220, damping: 25 },
        opacity: { duration: 0.3 }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 150 : -150,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: 'spring', stiffness: 220, damping: 25 },
        opacity: { duration: 0.3 }
      }
    })
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Small Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <h3 className="font-black text-text-main uppercase italic text-xs tracking-wider">Hall of Fame</h3>
        </div>
        <div className="flex items-center space-x-1">
          {displayChampions.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-amber-500 w-3' : 'bg-border-main'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Square Frame Card with custom sliding animation */}
      <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-gradient-to-br from-surface to-background border border-border-main hover:border-amber-500/30 transition-all duration-300 shadow-xl group flex flex-col">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 z-10"
          >
            <Link
              to={`/tournaments/${currentChampion.tournament_id}/champion`}
              className="flex flex-col justify-between p-6 h-full w-full cursor-pointer select-none"
            >
              {/* Upper details */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[8px] font-black text-amber-400 uppercase tracking-widest">
                  <Award className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                  <span>CHAMPION</span>
                </div>
                <div
                  className="w-8 h-8 rounded-full bg-surface border border-border-main flex items-center justify-center text-text-muted group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all active:scale-90"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Glowing Center Core with Avatar and Crown */}
              <div className="flex flex-col items-center justify-center my-auto space-y-3">
                <div className="relative">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                    <CrownIcon />
                  </div>
                  <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950 bg-slate-900">
                      {currentChampion.winner_avatar_url ? (
                        <img
                          src={currentChampion.winner_avatar_url}
                          alt={currentChampion.winner_username}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-amber-400">
                          {(currentChampion.winner_username || 'W').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 w-24 h-4 bg-amber-500/10 blur-md rounded-full -z-10" />
                </div>

                <div className="text-center space-y-1 max-w-full">
                  <h4 className="text-lg font-black text-white uppercase italic tracking-tighter truncate max-w-[180px]">
                    {currentChampion.winner_username}
                  </h4>
                  <div className="flex items-center justify-center gap-1 text-[9px] text-amber-400 font-bold uppercase tracking-widest">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{currentChampion.champion_title || 'Tournament Champion'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Info: Tournament Name */}
              <div className="border-t border-border-main/55 pt-3 flex flex-col justify-end">
                <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] leading-none mb-1">
                  VICTORY ARENA
                </span>
                <p className="text-sm font-black text-text-main italic uppercase tracking-tighter truncate">
                  {currentChampion.tournament_name}
                </p>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
