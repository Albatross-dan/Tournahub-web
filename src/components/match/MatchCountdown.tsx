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

  const { countdown_state, scheduled_at, match_deadline } = state;

  switch (countdown_state) {
    case 'not_scheduled':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-850 text-slate-400 border border-slate-850">
          Awaiting schedule
        </span>
      );

    case 'pre_match':
      return (
        <div className="flex items-center space-x-2 text-sky-400 font-bold uppercase tracking-tighter italic">
          <Clock className="w-4 h-4" />
          <span>Starts in</span>
          <CountdownTimer 
            target={scheduled_at} 
            serverTimeOffsetMs={serverTimeOffsetMs}
          />
        </div>
      );

    case 'active':
      return (
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60 mb-1">Time remaining</span>
          <CountdownTimer 
            target={match_deadline}
            urgentAt={300} // pulse last 5 min
            serverTimeOffsetMs={serverTimeOffsetMs}
            className="text-green-500 font-mono text-3xl font-black italic tracking-tighter"
            onExpired={onExpired}
          />
        </div>
      );

    case 'deadline_expired':
      return (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center">
          <Clock className="w-3 h-3 mr-2" />
          Time's up
        </div>
      );

    case 'finished':
      return (
        <div className="px-4 py-2 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center">
          Match complete
        </div>
      );

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
