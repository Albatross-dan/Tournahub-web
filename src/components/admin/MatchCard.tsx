import React from 'react';
import { Calendar, Clock, Eye, RotateCcw, Search, Timer } from 'lucide-react';
import { MatchStatusBadge } from './MatchStatusBadge';
import { cn, getPublicIdentity } from '../../lib/utils';

interface MatchCardProps {
  match: any;
  onAction: (match: any) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onAction }) => {
  const getActionLabel = () => {
    switch (match.status) {
      case 'pending': return 'Set Time';
      case 'waiting_for_players': return 'Pre-Schedule';
      case 'scheduled': return 'Reschedule';
      case 'under_review': return 'Review Result';
      case 'completed': return 'View Result';
      case 'cancelled': return 'Reinstate';
      default: return null;
    }
  };

  const actionLabel = getActionLabel();

  return (
    <div className="card p-4 hover:border-primary/20 transition-all group bg-surface/40 backdrop-blur-sm border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic truncate max-w-[150px]">
          Match #{match.match_order} • {match.stage?.replace('_', ' ')}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-3 flex-1 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                 <span className="text-xs font-black text-slate-400">{(getPublicIdentity(match.player1) || 'T')[0].toUpperCase()}</span>
              </div>
              <span className="text-sm font-black text-white italic uppercase truncate tracking-tight">{getPublicIdentity(match.player1)}</span>
           </div>
           
           {match.status === 'completed' && (
              <span className="text-xl font-black text-primary italic ml-4">{match.score1}</span>
           )}
        </div>

        <div className="flex items-center space-x-4">
           <div className="h-[1px] flex-1 bg-slate-800/50"></div>
           <span className="text-[10px] font-black text-slate-600 italic uppercase">VS</span>
           <div className="h-[1px] flex-1 bg-slate-800/50"></div>
        </div>

        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-3 flex-1 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                 <span className="text-xs font-black text-slate-400">{(getPublicIdentity(match.player2) || 'T')[0].toUpperCase()}</span>
              </div>
              <span className="text-sm font-black text-white italic uppercase truncate tracking-tight">{getPublicIdentity(match.player2)}</span>
           </div>

           {match.status === 'completed' && (
              <span className="text-xl font-black text-primary italic ml-4">{match.score2}</span>
           )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
        <div className="flex flex-col text-left">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Scheduled Time</p>
          <div className="flex items-center text-[10px] font-black text-white uppercase italic">
            {match.scheduled_at ? (
               <>
                  <Clock className="w-3 h-3 mr-1 text-primary" />
                  {new Date(match.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
               </>
            ) : (
               <span className="text-slate-600">UNSCHEDULED</span>
            )}
          </div>
        </div>

        {actionLabel && (
          <button 
            onClick={() => onAction(match)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-primary group-hover:text-white rounded-xl transition-all text-slate-400"
          >
            <span className="text-[10px] font-black uppercase tracking-widest italic">{actionLabel}</span>
          </button>
        )}
      </div>

      {match.status === 'in_progress' && (
         <div className="mt-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center space-x-2">
            <Timer className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic text-center">Live Monitor Active</span>
         </div>
      )}
    </div>
  );
};
