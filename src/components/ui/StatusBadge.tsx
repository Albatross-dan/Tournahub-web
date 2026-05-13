import React from 'react';
import { cn } from '../../lib/utils';
import { TournamentStatus, TOURNAMENT_STATUS_LABELS } from '../../constants';
import { 
  FileText, Send, Lock, 
  Users, Layers, CheckCircle, 
  Play, CheckCircle2, XCircle,
  Clock
} from 'lucide-react';

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}

export default function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  if (!status) return null;

  const getStatusConfig = (s: string) => {
    const s_norm = s.toLowerCase();
    
    switch (s_norm) {
      case TournamentStatus.DRAFT:
        return { style: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: FileText };
      case TournamentStatus.REGISTRATION_OPEN:
        return { style: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Send };
      case TournamentStatus.REGISTRATION_CLOSED:
        return { style: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Lock };
      case TournamentStatus.SEEDING:
        return { style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Users };
      case TournamentStatus.FIXTURE_GENERATION:
        return { style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Layers };
      case TournamentStatus.READY:
        return { style: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: CheckCircle };
      case TournamentStatus.ONGOING:
        return { style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Play };
      case TournamentStatus.COMPLETED:
        return { style: 'bg-slate-800 text-slate-500 border-slate-700', icon: CheckCircle2 };
      case TournamentStatus.CANCELLED:
        return { style: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle };
      default:
        return { style: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const label = TOURNAMENT_STATUS_LABELS[status as TournamentStatus] || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn(
      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center w-fit italic",
      config.style,
      className
    )}>
      {showIcon && <Icon className="w-3.5 h-3.5 mr-2 stroke-[2.5px]" />}
      {label}
    </span>
  );
}
