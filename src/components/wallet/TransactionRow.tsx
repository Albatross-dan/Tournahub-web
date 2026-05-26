import React from 'react';
import type { WalletTransaction } from '../../types/payment';
import { ArrowDownCircle, Trophy, RotateCcw, Settings, AlertTriangle, Clock } from 'lucide-react';

interface TransactionRowProps {
  key?: React.Key;
  transaction: WalletTransaction;
}

// Custom relative time helper to keep layout completely pure and free of complex libraries
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const {
    type,
    amount,
    original_amount,
    original_currency,
    exchange_rate,
    status,
    description,
    tournament_name,
    created_at
  } = transaction;

  // Determine Icon & Color theme per transaction type
  let IconComponent = Settings;
  let iconBgColor = 'bg-slate-800/80 text-slate-400';

  if (type === 'deposit') {
    IconComponent = ArrowDownCircle;
    iconBgColor = 'bg-emerald-500/10 text-emerald-400';
  } else if (type === 'entry_fee') {
    IconComponent = Trophy;
    iconBgColor = 'bg-red-500/10 text-red-400';
  } else if (type === 'prize') {
    IconComponent = Trophy;
    iconBgColor = 'bg-amber-500/10 text-amber-500';
  } else if (type === 'refund') {
    IconComponent = RotateCcw;
    iconBgColor = 'bg-blue-500/10 text-blue-400';
  }

  const isPositive = amount >= 0;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/2 border border-white/5 rounded-xl transition-all gap-4">
      {/* Icon & Label */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-200 uppercase truncate leading-snug">
            {description || 'Transaction Log'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              {formatRelativeTime(created_at)}
            </span>
            {tournament_name && (
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                🏆 {tournament_name}
              </span>
            )}
          </div>
          {original_currency && original_currency !== 'USD' && original_amount && (
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">
              Converted {original_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {original_currency} @ {exchange_rate}
            </p>
          )}
        </div>
      </div>

      {/* Value & Status */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-black italic select-all leading-tight ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : '-'}${Math.abs(amount).toFixed(2)}
        </p>
        
        {/* Status badges for non-completed edge cases */}
        {status !== 'completed' && (
          <span className={`inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
            status === 'pending' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' :
            status === 'failed' ? 'bg-red-500/10 border border-red-500/20 text-red-500' :
            'bg-blue-500/10 border border-blue-500/20 text-blue-500'
          }`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

export default TransactionRow;
