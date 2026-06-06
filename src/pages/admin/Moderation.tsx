import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, Loader2, Search, Filter, History } from 'lucide-react';
import AdminShell from '../../components/layout/AdminShell';
import { MatchDisputeCard } from '../../components/admin/MatchDisputeCard';
import { matchService } from '../../services/matchService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Moderation() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'disputed' | 'awaiting' | 'abandoned' | 'history'>('disputed');
  const [cutoff] = useState(() => new Date().toISOString());
  const [counts, setCounts] = useState({
    disputed: 0,
    awaiting: 0,
    abandoned: 0,
    history: 0
  });

  const fetchMatches = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      // 1. Fetch disputes using get_disputed_matches RPC (strictly no direct table queries)
      const { data, error } = await (supabase as any).rpc('get_disputed_matches', {
        p_admin_id: user.id
      });
      if (error) throw error;
      const rpcData = data as any;

      // Section badge counts
      const disCount = rpcData?.disputed_count ?? 0;
      const awCount = rpcData?.awaiting_count ?? 0;
      const abCount = rpcData?.abandoned_count ?? 0;
      const histCount = rpcData?.history_count ?? 0;

      setCounts({
        disputed: disCount,
        awaiting: awCount,
        abandoned: abCount,
        history: histCount
      });

      // Mapping function
      const mapMatch = (m: any, defaultStatus: string) => {
        const isRpc = 'match_id' in m;
        const mId = isRpc ? m.match_id : m.id;
        const statusVal = m.verification_status || m.result_verification_status || defaultStatus;
        const player1Obj = isRpc ? { id: m.player1, username: m.player1_username } : m.player1;
        const player2Obj = isRpc ? { id: m.player2, username: m.player2_username } : m.player2;

        return {
          ...m,
          id: mId,
          match_id: mId,
          tournament_name: isRpc ? m.tournament_name : m.tournaments?.name,
          player1_username: isRpc ? m.player1_username : m.player1?.username,
          player2_username: isRpc ? m.player2_username : m.player2?.username,
          player1: player1Obj,
          player2: player2Obj,
          verification_status: statusVal,
          required_action: statusVal === 'disputed' 
            ? 'pick_winner_or_override' 
            : 'approve_or_reject_single_submission'
        };
      };

      const disputedMapped = (rpcData?.disputed || rpcData?.disputes || []).map((m: any) => mapMatch(m, 'disputed'));
      const awaitingMapped = (rpcData?.awaiting || []).map((m: any) => mapMatch(m, 'single_submission'));
      const abandonedMapped = (rpcData?.abandoned || []).map((m: any) => mapMatch(m, 'abandoned'));
      const historyMapped = (rpcData?.history || []).map((m: any) => mapMatch(m, 'completed'));

      const allMapped = [...disputedMapped, ...awaitingMapped, ...abandonedMapped, ...historyMapped];
      setMatches(allMapped);
    } catch (err) {
      console.error('[Moderation] General Signal fetch failure:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMatches(true);

    // Real-time listener for result changes
    const channel = supabase.channel('moderation-updates')
      .on('postgres_changes' as any, { 
        event: '*', 
        table: 'matches' 
      }, (payload: any) => {
        const allowed = ['disputed', 'awaiting_admin_review', 'abandoned', 'single_submission'];
        if (payload?.new && !allowed.includes(payload.new.result_verification_status)) return;
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches]);

  const filteredMatches = matches.filter(m => {
    if (activeTab === 'disputed') return m.verification_status === 'disputed';
    if (activeTab === 'awaiting') return m.verification_status === 'awaiting_admin_review' || m.verification_status === 'single_submission';
    if (activeTab === 'abandoned') return m.verification_status === 'abandoned';
    if (activeTab === 'history') return m.verification_status === 'completed' || m.verification_status === 'verified';
    return false;
  });

  const getCount = (status: string) => {
    if (status === 'disputed') return counts.disputed;
    if (status === 'awaiting_admin_review' || status === 'awaiting' || status === 'single_submission') return counts.awaiting;
    if (status === 'abandoned') return counts.abandoned;
    if (status === 'completed' || status === 'history' || status === 'verified') return counts.history;
    return 0;
  };

  return (
    <AdminShell>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
              Control <span className="text-primary text-outline-sm">Moderation</span> HQ
            </h2>
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">
                Scanning global frequency... {counts.disputed + counts.awaiting + counts.abandoned} anomalies detected
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
             <button 
              onClick={() => fetchMatches()}
              disabled={refreshing}
              className="p-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg hover:border-primary/30"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Refresh Intel</span>
            </button>
          </div>
        </div>

        {/* Tactical Nav */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            { id: 'disputed', label: 'Disputed Conflicts', count: getCount('disputed'), color: 'red' },
            { id: 'awaiting', label: 'Awaiting Extraction', count: getCount('awaiting_admin_review'), color: 'orange' },
            { id: 'abandoned', label: 'Abandoned Signals', count: getCount('abandoned'), color: 'slate' },
            { id: 'history', label: 'Results History', count: getCount('completed'), color: 'emerald' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-4 rounded-2xl font-black uppercase italic tracking-widest text-[10px] transition-all flex items-center space-x-3 border-2",
                  activeTab === tab.id
                    ? tab.id === 'disputed' ? "bg-red-500/10 border-red-500/50 text-white shadow-xl shadow-red-500/10" :
                      tab.id === 'awaiting' ? "bg-orange-500/10 border-orange-500/50 text-white shadow-xl shadow-orange-500/10" :
                      tab.id === 'abandoned' ? "bg-slate-500/10 border-slate-500/50 text-white shadow-xl shadow-slate-500/10" :
                      "bg-emerald-500/10 border-emerald-500/50 text-white shadow-xl shadow-emerald-500/10"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black tabular-nums border",
                activeTab === tab.id ? `bg-white text-black border-white` : "bg-slate-800 text-slate-500 border-slate-700"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center bg-slate-900/30 rounded-[3rem] border border-slate-800/50 border-dashed animate-pulse">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <span className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Decrypting Tactical Data...</span>
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredMatches.map(match => (
              <MatchDisputeCard 
                key={match.match_id || match.id} 
                match={match} 
                onResolved={fetchMatches}
                adminId={user?.id || ''}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center bg-slate-900/30 rounded-[3rem] border border-slate-800/50 border-dashed">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20">
              <ShieldAlert className="w-10 h-10 text-emerald-500/30" />
            </div>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2 leading-none">Sector Clear</h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No anomalies requiring administrative extraction in this sector.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

// Utility to merge tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
