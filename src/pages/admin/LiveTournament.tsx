import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Trophy, Radio, ArrowLeft, Loader2,
  Calendar, Zap, Timer
} from 'lucide-react';
import { matchService } from '../../services/matchService';
import LoadingState from '../../components/ui/LoadingState';
import { LiveMatchMonitor } from '../../components/admin/LiveMatchMonitor';

export default function LiveTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
  }, [id]);

  async function fetchTournament() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    setTournament(data);
    setLoading(false);
  }

  const handleForceActivate = async () => {
    setBusy(true);
    try {
      const res = await matchService.transitionScheduledMatches();
      alert(`Manual transition complete: ${res.activated} matches activated.`);
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState fullPage message="Establishing Secure Feed..." />;

  return (
    <AdminShell>
      <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => navigate(`/admin/tournaments/${id}/schedule`)}
              className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3 mr-2" />
              Return to Logistics
            </button>
            <div className="space-y-2">
               <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                 Live <span className="text-emerald-500 italic">Monitor</span>
               </h1>
               <div className="flex items-center space-x-3">
                  <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest italic rounded border border-emerald-500/20 animate-pulse">
                     Active Interface
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{tournament?.name}</p>
               </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic leading-none mb-1">System Clock</p>
                   <p className="text-sm font-black text-white italic uppercase tracking-tighter">{new Date().toLocaleTimeString([], { hour12: false })} UTC</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                   <Timer className="w-5 h-5" />
                </div>
             </div>
          </div>
        </div>

        {/* monitor component */}
        <div className="card p-8 bg-surface/40 backdrop-blur-md border-slate-800">
           <LiveMatchMonitor tournamentId={id!} />
        </div>

        {/* Advanced section */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">Advanced Fallback Systems</h3>
           <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div className="text-left">
                    <h4 className="text-sm font-black text-white italic uppercase tracking-tight">Manual State Synchronization</h4>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Use only if pg_cron automation heartbeat fails</p>
                 </div>
              </div>
              <button 
                 onClick={handleForceActivate}
                 disabled={busy}
                 className="px-8 py-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest italic rounded-2xl border border-red-500/20 disabled:opacity-50"
              >
                 {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Transition Matches"}
              </button>
           </div>
        </div>
      </div>
    </AdminShell>
  );
}
