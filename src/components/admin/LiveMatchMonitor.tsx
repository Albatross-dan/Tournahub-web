import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Timer, Radio, AlertCircle, CheckCircle2, Gavel } from 'lucide-react';
import { MatchStatusBadge } from './MatchStatusBadge';
import { cn } from '../../lib/utils';

interface LiveMatchMonitorProps {
  tournamentId: string;
}

export const LiveMatchMonitor: React.FC<LiveMatchMonitorProps> = ({ tournamentId }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMatches();

    const channel = supabase
      .channel(`tournament-matches-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, (payload) => {
        setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        // If it's a new live match or review match, we might need to fetch it if it's not in the list
        fetchLiveMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  async function fetchLiveMatches() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, round, stage, status, scheduled_at, result_verification_status,
          player1_profile:profiles!player1(username),
          player2_profile:profiles!player2(username)
        `)
        .eq('tournament_id', tournamentId)
        .in('status', ['in_progress', 'under_review', 'scheduled', 'awaiting_result'])
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic flex items-center">
            <Radio className="w-3 h-3 mr-2 text-emerald-500 animate-pulse" />
            Live Monitor Dashboard
         </h3>
         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">{(matches || []).filter(m => m.status === 'in_progress').length} Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(m => (
          <LiveMatchCard key={m.id} match={m} />
        ))}
      </div>

      {matches.length === 0 && (
        <div className="card p-10 border-dashed border-2 border-slate-800 text-center">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic text-center mx-auto">No active operations detected</p>
        </div>
      )}
    </div>
  );
};

interface LiveMatchCardProps {
  match: any;
  key?: string | number;
}

function LiveMatchCard({ match }: LiveMatchCardProps) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      if (match.status === 'in_progress' && match.scheduled_at) {
        const diff = Math.floor((new Date().getTime() - new Date(match.scheduled_at).getTime()) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setElapsed(`${mins}m ${secs}s`);
      } else if (match.status === 'scheduled' && match.scheduled_at) {
        const diff = Math.floor((new Date(match.scheduled_at).getTime() - new Date().getTime()) / 1000);
        if (diff > 0) {
           const mins = Math.floor(diff / 60);
           const secs = diff % 60;
           setElapsed(`Starts in ${mins}m ${secs}s`);
        } else {
           setElapsed('Transitions imminent');
        }
      } else {
        setElapsed('');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [match.status, match.scheduled_at]);

  return (
    <div className={cn(
       "card p-4 border-slate-800 transition-all bg-surface/40 backdrop-blur-sm",
       match.status === 'under_review' ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : ''
    )}>
       <div className="flex items-center justify-between mb-4">
          <MatchStatusBadge status={match.status} />
          <span className="text-[10px] font-black text-primary italic uppercase tracking-widest">{elapsed}</span>
       </div>

       <div className="flex items-center justify-between px-2">
          <div className="text-center flex-1 overflow-hidden">
             <p className="text-sm font-black text-white italic uppercase truncate">{match.player1_profile?.username || 'TBD'}</p>
          </div>
          <div className="px-3 shrink-0">
             <span className="text-[10px] font-black text-slate-700 italic">VS</span>
          </div>
          <div className="text-center flex-1 overflow-hidden">
             <p className="text-sm font-black text-white italic uppercase truncate">{match.player2_profile?.username || 'TBD'}</p>
          </div>
       </div>

       {match.status === 'under_review' && (
          <div className="mt-4 flex items-center justify-center p-2 bg-purple-500/10 rounded-xl space-x-2">
             <AlertCircle className="w-3 h-3 text-purple-500" />
             <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest italic">Verification Required</span>
          </div>
       )}

       {match.result_verification_status === 'disputed' && (
          <div className="mt-2 flex items-center justify-center p-2 bg-red-500/10 rounded-xl space-x-2 border border-red-500/20 animate-pulse">
             <Gavel className="w-3 h-3 text-red-500" />
             <span className="text-[8px] font-black text-red-500 uppercase tracking-widest italic">Conflict Detected</span>
          </div>
       )}
    </div>
  );
}
