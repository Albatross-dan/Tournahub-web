import React from 'react';
import { cn } from '../../lib/utils';

interface TournamentLifecycleStatsProps {
  matches: any[];
  className?: string;
}

export const TournamentLifecycleStats: React.FC<TournamentLifecycleStatsProps> = ({ matches, className }) => {
  const counts = matches.reduce((acc: Record<string, number>, m) => {
    // Handle status mapping carefully
    const status = m.status;
    if (status === 'waiting_for_players') {
        acc['scheduled'] = (acc['scheduled'] || 0) + 1;
    } else {
        acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {
    pending: 0,
    scheduled: 0,
    in_progress: 0,
    under_review: 0,
    completed: 0
  });

  const stats = [
    { label: 'Pending', count: counts.pending, color: 'text-slate-400' },
    { label: 'Sched', count: counts.scheduled, color: 'text-blue-500' },
    { label: 'Live', count: counts.in_progress, color: 'text-emerald-500' },
    { label: 'Review', count: counts.under_review, color: 'text-purple-500' },
    { label: 'Final', count: counts.completed, color: 'text-emerald-600' }
  ];

  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      {stats.map((s, i) => (
        <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 text-center">
          <p className={cn("text-lg font-black italic leading-none mb-1", s.color)}>
            {s.count}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 leading-none">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
};
