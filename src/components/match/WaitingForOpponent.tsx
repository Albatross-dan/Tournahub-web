import React from 'react';
import { Loader2, Clock, MapPin } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';

interface WaitingForOpponentProps {
  submission: any;
  deadline: string;
  opponentUsername: string;
  serverTimeOffsetMs?: number;
}

export function WaitingForOpponent({ submission, deadline, opponentUsername, serverTimeOffsetMs = 0 }: WaitingForOpponentProps) {
  const { seconds, formatted, isExpired } = useCountdown(deadline, serverTimeOffsetMs);
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 space-y-10">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 animate-pulse">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
              <Clock className="w-4 h-4 text-primary" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Result Submitted!</h3>
            <p className="text-slate-400 font-bold tracking-tight text-sm">
              Waiting for <span className="text-white font-extrabold">{opponentUsername}</span> to confirm.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block mb-2">My Submission</span>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/20 text-primary w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black italic">
                {(submission?.player1_score ?? submission?.score1) ?? 0} – {(submission?.player2_score ?? submission?.score2) ?? 0}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase text-white block">Transmitted</span>
                <span className="text-[10px] text-slate-500">Awaiting parity check</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1">Window Closes In</span>
              <span className={cn(
                "text-xl font-mono font-black italic tracking-tighter",
                seconds <= 120 ? "text-red-500 animate-pulse" : "text-white"
              )}>
                {formatted}
              </span>
            </div>
          </div>
        </div>

        {submission?.screenshot_url && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Submitted Evidence</span>
            <StorageImage 
              bucket="result-screenshots" 
              path={submission.screenshot_url} 
              alt="Proof" 
              className="w-full aspect-video rounded-2xl border border-slate-800 grayscale hover:grayscale-0 transition-all duration-500" 
            />
          </div>
        )}
      </div>

      <div className="px-8 py-4 bg-orange-500/5 border-t border-orange-500/10">
        <p className="text-orange-500/80 text-[10px] font-black uppercase tracking-[0.1em] text-center italic">
          ⚠️ Protocol Note: If opponent fails to upload before the deadline, an admin review will be triggered.
        </p>
      </div>
    </div>
  );
}
