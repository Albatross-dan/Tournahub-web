import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CountdownTimerProps {
  targetDate?: string;
  label?: string;
  className?: string;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, label, className, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; expired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, expired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!targetDate) return null;

  const isUrgent = !timeLeft.expired && timeLeft.hours === 0 && timeLeft.minutes < 60;

  if (timeLeft.expired) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-900/50 rounded-lg text-[10px] font-black uppercase tracking-wider text-red-400 animate-pulse", className)}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{label ? `${label}: Expired` : 'Deadline Expired'}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
        isUrgent
          ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/10 animate-pulse"
          : "bg-slate-800/80 border border-slate-700/60 text-slate-300",
        className
      )}
    >
      <Clock className={cn("w-3.5 h-3.5 shrink-0", isUrgent ? "text-amber-400" : "text-primary")} />
      <span>{label ? `${label}: ` : ''}</span>
      <span className="font-mono font-extrabold text-white">
        {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
};
