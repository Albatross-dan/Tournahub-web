import React from 'react';
import { VerificationStatus } from '../../types/verification.types';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

interface BadgeConfig {
  color: string;
  icon: any;
  text: string;
  animate?: boolean;
}

export default function VerificationStatusBadge({ status, size = 'md' }: VerificationStatusBadgeProps) {
  if (status === 'none') return null;

  const configs: Record<string, BadgeConfig> = {
    single_submission: {
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: Clock,
      text: '1/2 Scores In'
    },
    matched: {
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: CheckCircle2,
      text: 'Auto-Verified',
      animate: true
    },
    disputed: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      icon: AlertTriangle,
      text: 'Disputed',
      animate: true
    },
    verified: {
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: ShieldCheck,
      text: 'Admin Verified'
    }
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <motion.div
      initial={config.animate ? { opacity: 0.8 } : undefined}
      animate={config.animate ? { 
        opacity: [0.8, 1, 0.8],
        scale: [1, 1.02, 1]
      } : undefined}
      transition={config.animate ? { 
        duration: 2, 
        repeat: Infinity,
        ease: "easeInOut" 
      } : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-widest border",
        size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        config.color
      )}
    >
      <Icon className={cn(size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3")} />
      {config.text}
    </motion.div>
  );
}
