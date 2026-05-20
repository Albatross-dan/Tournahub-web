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
}

export function AutoVerifiedResult({ finalScore1, finalScore2, submissions = [], winner, matchId }: AutoVerifiedResultProps) {
  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="bg-emerald-500 p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-in zoom-in-50 delay-300 duration-500">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Result Verified</h3>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px]">Parity check successful • Consensus reached</p>
        </div>
      </div>

      <div className="p-10 space-y-12">
        {/* Scores */}
        <div className="flex items-center justify-center space-x-12">
          <div className="text-center group">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-4 group-hover:text-primary transition-colors">Player 1</span>
            <span className="text-8xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-xl">{finalScore1}</span>
          </div>
          <div className="h-20 w-px bg-slate-800 rotate-[15deg]"></div>
          <div className="text-center group">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-4 group-hover:text-primary transition-colors">Player 2</span>
            <span className="text-8xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-xl">{finalScore2}</span>
          </div>
        </div>

        {/* Evidence Grid */}
        <div className="grid grid-cols-2 gap-4">
          {submissions.map((sub, idx) => (
            <div key={sub.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log #{idx + 1}</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Matching</span>
              </div>
              <StorageImage 
                bucket="result-screenshots" 
                path={sub.screenshot_url} 
                alt={`Proof ${idx + 1}`} 
                className="w-full aspect-video rounded-xl border border-slate-800 hover:scale-[1.02] transition-transform duration-300 cursor-zoom-in" 
              />
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800">
          <Link 
            to="/tournaments" // Replace with actual tournament link if possible
            className="w-full sm:flex-1 h-14 bg-white text-black rounded-2xl flex items-center justify-center font-black uppercase italic tracking-widest hover:bg-primary transition-all active:scale-95 text-xs"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Tournament Standings
          </Link>
          <Link 
            to="/dashboard"
            className="w-full sm:flex-1 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center font-black uppercase italic tracking-widest hover:bg-slate-700 transition-all border border-slate-700 active:scale-95 text-xs"
          >
            <Layout className="w-4 h-4 mr-2" />
            Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
