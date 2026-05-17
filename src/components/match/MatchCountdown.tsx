import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { cn } from '../../lib/utils';

interface MatchCountdownProps {
  state: any;
  onExpired?: () => void;
  serverTimeOffsetMs?: number;
}

export function MatchCountdown({ state, onExpired, serverTimeOffsetMs = 0 }: MatchCountdownProps) {
  if (!state) return null;

  const { countdown_state, scheduled_at, play_window_end, submission_deadline } = state;

  switch (countdown_state) {
    case 'not_scheduled':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
          Not scheduled
        </span>
      );

    case 'pre_match':
      return (
        <div className="flex items-center space-x-2 text-slate-400 font-bold uppercase tracking-tighter italic">
          <Clock className="w-4 h-4" />
          <span>Starts in</span>
          <CountdownTimer 
            target={scheduled_at} 
            serverTimeOffsetMs={serverTimeOffsetMs}
          />
        </div>
      );

    case 'play_window':
      return (
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60 mb-1">Play window closes in</span>
          <CountdownTimer 
            target={play_window_end}
            urgentAt={300} // pulse last 5 min
            serverTimeOffsetMs={serverTimeOffsetMs}
            className="text-green-500 font-mono text-3xl font-black italic tracking-tighter"
            onExpired={onExpired}
          />
        </div>
      );

    case 'submission_window':
      return (
        <div className="p-5 bg-orange-500/5 border border-orange-500/30 rounded-2xl flex flex-col items-center animate-pulse-border">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/70">Submit your result within</span>
          </div>
          <CountdownTimer 
            target={submission_deadline}
            urgentAt={120} // red pulse last 2 min
            serverTimeOffsetMs={serverTimeOffsetMs}
            className="text-orange-500 font-mono text-4xl font-black italic tracking-tight"
            onExpired={onExpired}
          />
          <p className="mt-3 text-[10px] text-orange-500/60 font-medium text-center uppercase tracking-wide">
            ⚠️ Results not submitted before this time will require admin review.
          </p>
        </div>
      );

    case 'deadline_expired':
      return (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center">
          <Clock className="w-3 h-3 mr-2" />
          Deadline passed
        </div>
      );

    case 'finished':
    default:
      return null;
  }
}

interface CountdownTimerProps {
  target: string;
  urgentAt?: number;
  className?: string;
  onExpired?: () => void;
  serverTimeOffsetMs?: number;
}

function CountdownTimer({ target, urgentAt = 0, className, onExpired, serverTimeOffsetMs = 0 }: CountdownTimerProps) {
  const { seconds, isExpired, formatted } = useCountdown(target, serverTimeOffsetMs);

  useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  const isUrgent = seconds > 0 && seconds <= urgentAt;

  return (
    <span 
      aria-live="polite"
      className={cn(
        className,
        isUrgent && "text-red-500 animate-pulse"
      )}
    >
      {formatted}
    </span>
  );
}
