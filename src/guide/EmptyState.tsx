import React from 'react';
import { ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`w-full py-10 px-4 text-center flex flex-col items-center justify-center rounded-2xl bg-[#0a0d1d]/80 border border-slate-800/80 shadow-sm ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#facc15]/10 border border-[#facc15]/20 flex items-center justify-center text-[#facc15] mb-3.5 shadow-xs">
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
      )}

      {title && (
        <h4 className="text-sm font-black text-white uppercase italic tracking-tight mb-1">
          {title}
        </h4>
      )}

      {message && (
        <p className="text-xs text-slate-400 font-medium max-w-sm mb-4 leading-relaxed">
          {message}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#facc15] hover:bg-white text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
