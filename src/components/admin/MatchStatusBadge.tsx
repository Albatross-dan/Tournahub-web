import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, XCircle } from 'lucide-react';

interface MatchStatusBadgeProps {
  status: string;
  className?: string;
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, className }) => {
  const config: Record<string, { label: string; bg: string; text: string; icon: any; pulse?: boolean }> = {
    pending: { label: 'Pending', bg: 'bg-slate-800/50', text: 'text-slate-400', icon: Clock },
    waiting_for_players: { label: 'Waiting', bg: 'bg-amber-500/10', text: 'text-amber-500', icon: AlertCircle },
    scheduled: { label: 'Scheduled', bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Clock },
    in_progress: { label: 'Live', bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: PlayCircle, pulse: true },
    under_review: { label: 'Review', bg: 'bg-purple-500/10', text: 'text-purple-500', icon: AlertCircle },
    completed: { label: 'Final', bg: 'bg-emerald-500/20', text: 'text-emerald-500', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-500', icon: XCircle },
  };

  const current = config[status] || { label: status, bg: 'bg-slate-800/50', text: 'text-slate-400', icon: Clock, pulse: false };
  const Icon = current.icon;

  return (
    <div className={cn(
      "flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic border border-white/5",
      current.bg,
      current.text,
      className
    )}>
      {current.pulse ? (
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
      ) : (
        <Icon className="w-2.5 h-2.5 mr-1.5 stroke-[3px]" />
      )}
      {current.label}
    </div>
  );
};
