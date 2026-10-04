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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-white italic uppercase tracking-wider leading-none">Result Submitted</h3>
            <p className="text-zinc-400 font-bold text-xs mt-1 truncate">
              Waiting for <span className="text-white font-extrabold">{opponentUsername}</span> to confirm
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">Window Closes</span>
            <span className={cn(
              "text-xs font-mono font-black italic tracking-tight",
              seconds <= 120 ? "text-red-500 animate-pulse" : "text-white"
            )}>
              {formatted}
            </span>
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="bg-primary/20 text-primary px-2.5 py-1 rounded-lg text-sm font-black italic">
              {(submission?.player1_score ?? submission?.score1) ?? 0} – {(submission?.player2_score ?? submission?.score2) ?? 0}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-white block leading-tight">Your Score Logged</span>
              <span className="text-[10px] text-zinc-500 block leading-tight">Awaiting parity check</span>
            </div>
          </div>
          {submission?.screenshot_url && (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
              <StorageImage 
                bucket="result-screenshots" 
                path={submission.screenshot_url} 
                alt="Proof" 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 bg-amber-500/5 border-t border-amber-500/10">
        <p className="text-amber-500/90 text-[10px] font-black uppercase tracking-wider text-center italic">
          If opponent fails to submit before the deadline, an admin review will trigger.
        </p>
      </div>
    </div>
  );
}
