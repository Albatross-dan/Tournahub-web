import React from 'react';
import { CheckCircle2, Trophy, ArrowRight, Layout, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';

interface AutoVerifiedResultProps {
  finalScore1: number;
  finalScore2: number;
  submissions?: any[];
  winner?: string;
  matchId: string;
  playerName?: string;
  tournamentId?: string;
  currentUserId?: string;
}

export function AutoVerifiedResult({ finalScore1, finalScore2, submissions = [], winner, matchId, playerName, tournamentId, currentUserId }: AutoVerifiedResultProps) {
  const mySub = currentUserId 
    ? submissions?.find((s: any) => s.submitted_by === currentUserId)
    : (playerName ? submissions?.find((s: any) => s.username === playerName) : null);
  
  let outcomeBadge = null;
  if (mySub) {
    const myScore = mySub.score1;
    const oppScore = mySub.score2;
    if (myScore > oppScore) {
      outcomeBadge = (
        <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-500/30 animate-pulse">
          Victory ✓
        </span>
      );
    } else if (myScore < oppScore) {
      outcomeBadge = (
        <span className="px-4 py-1.5 bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest rounded-full border border-rose-500/30">
          Defeat ✗
        </span>
      );
    } else {
      outcomeBadge = (
        <span className="px-4 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest rounded-full border border-amber-500/30">
          Draw •
        </span>
      );
    }
  } else if (winner) {
    if (winner === playerName) {
      outcomeBadge = (
        <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-500/30 animate-pulse">
          Victory ✓
        </span>
      );
    } else {
      outcomeBadge = (
        <span className="px-4 py-1.5 bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest rounded-full border border-rose-500/30">
          Defeat ✗
        </span>
      );
    }
  }

  return (
    <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-300">
      <div className="bg-emerald-500 px-4 py-3 sm:py-4 flex items-center justify-between gap-3 text-black">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-black/15 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-black" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black italic uppercase tracking-wider leading-none">Match Complete</h3>
            <p className="text-black/80 font-bold uppercase tracking-wider text-[10px] mt-0.5 truncate">
              Consensus: {finalScore1} – {finalScore2}
            </p>
          </div>
        </div>
        {outcomeBadge && (
          <div className="shrink-0">
            {outcomeBadge}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Scores */}
        <div className="flex items-center justify-center space-x-8 bg-zinc-950/60 border border-zinc-800 p-3 rounded-xl">
          <div className="text-center group flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Player 1</span>
            <span className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white tabular-nums">{finalScore1}</span>
          </div>
          <div className="h-10 w-px bg-zinc-800 rotate-[15deg]"></div>
          <div className="text-center group flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Player 2</span>
            <span className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white tabular-nums">{finalScore2}</span>
          </div>
        </div>

        {/* Evidence Grid */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {submissions.map((sub, idx) => (
              <div key={sub.id} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Log #{idx + 1}</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded border border-emerald-500/20">Matching</span>
                </div>
                {sub.screenshot_url && (
                  <StorageImage 
                    bucket="result-screenshots" 
                    path={sub.screenshot_url} 
                    alt={`Proof ${idx + 1}`} 
                    className="w-full aspect-video rounded-lg border border-zinc-800 object-cover" 
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-zinc-800">
          <Link 
            to="/tournaments"
            className="w-full sm:flex-1 h-11 bg-white text-black rounded-xl flex items-center justify-center font-black uppercase italic tracking-wider hover:bg-primary transition-all active:scale-95 text-xs"
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            Tournament Standings
          </Link>
          <Link 
            to="/dashboard"
            className="w-full sm:flex-1 h-11 bg-zinc-800 text-white rounded-xl flex items-center justify-center font-black uppercase italic tracking-wider hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95 text-xs"
          >
            <Layout className="w-3.5 h-3.5 mr-1.5" />
            Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
