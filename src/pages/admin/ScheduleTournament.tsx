import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { matchService } from '../../services/matchService';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Trophy, Calendar, List, Radio, ChevronRight, 
  ArrowLeft, LayoutGrid, Layers, Loader2,
  CheckCircle2, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import { MatchCard } from '../../components/admin/MatchCard';
import { TournamentLifecycleStats } from '../../components/admin/TournamentLifecycleStats';
import { MatchScheduleModal } from '../../components/admin/MatchScheduleModal';
import { BatchScheduleModal } from '../../components/admin/BatchScheduleModal';
import { ResultReviewPanel } from '../../components/admin/ResultReviewPanel';

export default function ScheduleTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
      
      const channel = supabase
        .channel(`tournament-schedule-${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${id}`,
        }, () => {
          fetchMatches();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  async function fetchData() {
    await Promise.all([fetchTournament(), fetchMatches()]);
    setLoading(false);
  }

  async function fetchTournament() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    setTournament(data);
  }

  async function fetchMatches() {
    try {
      const data = await matchService.getByTournament(id!);
      const safeData = data || [];
      setMatches(safeData);
      
      // Determine initial active tab if not set
      if (safeData.length > 0 && !activeTab) {
        const rounds = Array.from(new Set(safeData.map(m => m.round))).filter((r): r is number => typeof r === 'number').sort((a, b) => a - b);
        const groupNames = Array.from(new Set(safeData.map(m => m.group_name))).filter(Boolean).sort();
        
        if (groupNames.length > 0) {
          setActiveTab(`Group ${groupNames[0]}`);
        } else if (rounds.length > 0) {
          setActiveTab(`Round ${rounds[0]}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  const rounds = Array.from(new Set(matches.map(m => m.round))).filter((r): r is number => typeof r === 'number').sort((a, b) => a - b);
  const groupNames = Array.from(new Set(matches.map(m => m.group_name))).filter(Boolean).sort();
  
  const tabs = groupNames.length > 0 
    ? groupNames.map(g => `Group ${g}`)
    : rounds.map(r => `Round ${r}`);

  const filteredMatches = matches.filter(m => {
    if (activeTab.startsWith('Group ')) {
      return m.group_name === activeTab.replace('Group ', '');
    } else if (activeTab.startsWith('Round ')) {
      return m.round === parseInt(activeTab.replace('Round ', ''));
    }
    return true;
  });

  const handleAction = (match: any) => {
    setSelectedMatch(match);
    if (['pending', 'waiting_for_players', 'scheduled'].includes(match.status)) {
      setScheduleModalOpen(true);
    } else if (match.status === 'under_review') {
      setReviewPanelOpen(true);
    } else {
        // Just preview if completed or cancelled
        setReviewPanelOpen(true);
    }
  };

  if (loading) return <LoadingState fullPage message="Deciphering Deployment Protocols..." />;

  return (
    <AdminShell>
      <div className="space-y-10 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/admin/tournaments')}
              className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3 mr-2" />
              Back to Operations
            </button>
            <div className="space-y-2">
               <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                 Match <span className="text-primary italic">Scheduling</span>
               </h1>
               <div className="flex items-center space-x-3">
                  <div className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest italic rounded border border-white/5">
                     {tournament?.type}
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{tournament?.name}</p>
               </div>
            </div>
          </div>

          <TournamentLifecycleStats matches={matches} className="max-w-md w-full" />
        </div>

        {/* Live Link */}
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
           <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                 <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                 <p className="text-xs font-black text-white italic uppercase tracking-tight leading-none mb-1">Live Combat Feed</p>
                 <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest italic leading-none">Operational visibility available</p>
              </div>
           </div>
           <button 
              onClick={() => navigate(`/admin/tournaments/${id}/live`)}
              className="px-6 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest italic rounded-xl hover:bg-emerald-600 transition-all flex items-center space-x-2"
           >
              <span>Switch to Live</span>
              <ChevronRight className="w-3 h-3" />
           </button>
        </div>

        {/* Tabs and Content */}
        <div className="space-y-6">
           <div className="flex overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide space-x-2">
              {tabs.map((tab) => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                       "flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest italic transition-all border",
                       activeTab === tab
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                    )}
                 >
                    {tab}
                 </button>
              ))}
           </div>

           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">
                 Displaying {filteredMatches.length} Matches for {activeTab}
              </h3>
              
              <button 
                 onClick={() => setBatchModalOpen(true)}
                 className="flex items-center space-x-2 px-6 py-3 bg-white text-slate-900 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl"
              >
                 <Zap className="w-4 h-4 fill-current" />
                 <span className="text-[10px] font-black uppercase tracking-widest italic">Rapid Deploy Round</span>
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMatches.map((match) => (
                 <MatchCard 
                    key={match.id} 
                    match={match} 
                    onAction={handleAction}
                 />
              ))}
           </div>

           {filteredMatches.length === 0 && (
              <div className="card p-20 text-center border-dashed border-2 border-slate-800 flex flex-col items-center justify-center space-y-4">
                 <LayoutGrid className="w-12 h-12 text-slate-800" />
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No match logs available for this sector.</p>
              </div>
           )}
        </div>
      </div>

      {/* Modals */}
      {scheduleModalOpen && selectedMatch && (
        <MatchScheduleModal 
          match={selectedMatch}
          onClose={() => {
              setScheduleModalOpen(false);
              setSelectedMatch(null);
          }}
          onSuccess={() => fetchMatches()}
        />
      )}

      {batchModalOpen && (
        <BatchScheduleModal 
          matches={filteredMatches.filter(m => ['pending', 'waiting_for_players'].includes(m.status))}
          roundName={activeTab}
          onClose={() => setBatchModalOpen(false)}
          onSuccess={(res) => {
            fetchMatches();
          }}
        />
      )}

      {reviewPanelOpen && selectedMatch && (
        <ResultReviewPanel 
          match={selectedMatch}
          onClose={() => {
              setReviewPanelOpen(false);
              setSelectedMatch(null);
          }}
          onSuccess={() => {
            fetchMatches();
          }}
        />
      )}
    </AdminShell>
  );
}
