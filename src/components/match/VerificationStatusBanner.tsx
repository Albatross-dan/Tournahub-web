import React from 'react';
import { VerificationStatus } from '../../types/verification.types';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface VerificationStatusBannerProps {
  status: VerificationStatus;
  score1?: number | null;
  score2?: number | null;
  winnerUsername?: string | null;
}

export default function VerificationStatusBanner({ 
  status, 
  score1, 
  score2, 
  winnerUsername 
}: VerificationStatusBannerProps) {
  if (status === 'none') return null;

  const content = {
    single_submission: {
      bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: Clock,
      text: "Awaiting opponent's score submission"
    },
    matched: {
      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: CheckCircle2,
      text: `Auto-verified: ${score1} – ${score2}`
    },
    disputed: {
      bg: 'bg-red-500/10 text-red-500 border-red-500/20',
      icon: AlertTriangle,
      text: "Disputed — Admin reviewing"
    },
    verified: {
      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: CheckCircle2,
      text: `Verified: ${score1} – ${score2}`
    }
  };

  const config = content[status as keyof typeof content];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter italic border",
      config.bg
    )}>
      <Icon className="w-4 h-4" />
      {config.text}
    </div>
  );
}
