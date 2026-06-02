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
      const { data, error } = await (supabase as any).rpc('admin_get_schedulable_matches', { p_tournament_id: id });
      if (error) {
        throw error;
      }
      
      const rawMatches = (data as any)?.matches || [];
      const mappedMatches = rawMatches.map((m: any, idx: number) => ({
        id: m.match_id,
        match_id: m.match_id,
        tournament_id: id,
        stage: m.stage,
        round: m.round,
        group_name: m.group_name,
        status: m.status,
        scheduled_at: m.scheduled_at,
        player1: m.player1_username ? { username: m.player1_username } : null,
        player2: m.player2_username ? { username: m.player2_username } : null,
        player1_username: m.player1_username,
        player2_username: m.player2_username,
        players_known: m.players_known,
        is_scheduled: m.is_scheduled,
        fixture_id: m.fixture_id,
        scheduled_date: m.scheduled_date,
        scheduled_time: m.scheduled_time,
        timezone: m.timezone || 'UTC',
        location: m.location,
        notes: m.notes,
        match_order: m.match_order || (idx + 1)
      }));

      setMatches(mappedMatches);
    } catch (err) {
      console.error('[ScheduleTournament] Error loading matches:', err);
    }
  }

  // Format stage name beautifully (e.g. group_stage -> Group Stage, playoffs -> Playoffs)
  const formatStageName = (stage: string) => {
    if (!stage) return '';
    return stage
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Compute dynamic tabs based on all fetched matches to support multi-stage/playoff matches
  interface TabItem {
    id: string;
    label: string;
    stage: string;
    group_name: string | null;
    round: number | null;
  }

  const dynamicTabs: TabItem[] = [];
  matches.forEach((m: any) => {
    const stageLabel = formatStageName(m.stage);
    let detailLabel = '';
    if (m.group_name) {
      detailLabel = `Group ${m.group_name}`;
    } else if (m.round !== undefined && m.round !== null) {
      // Format specialized rounds / phases
      if (m.stage === 'playoffs') {
        if (m.round === 4) detailLabel = 'Finals';
        else if (m.round === 3) detailLabel = 'Semifinals';
        else if (m.round === 2) detailLabel = 'Quarterfinals';
        else detailLabel = `Round ${m.round}`;
      } else {
        detailLabel = `Round ${m.round}`;
      }
    } else {
      detailLabel = 'General';
    }

    const label = `${stageLabel} - ${detailLabel}`;
    // Construct unique tab key
    const tabKey = `${m.stage || ''}-${m.group_name || ''}-${m.round !== undefined && m.round !== null ? m.round : ''}`;
    
    if (!dynamicTabs.some(t => t.id === tabKey)) {
      dynamicTabs.push({
        id: tabKey,
        label: label,
        stage: m.stage,
        group_name: m.group_name || null,
        round: m.round !== undefined && m.round !== null ? m.round : null
      });
    }
  });

  // Automatically sync activeTab to first available tab on mount/updates
  useEffect(() => {
    if (dynamicTabs.length > 0 && (!activeTab || !dynamicTabs.some(t => t.id === activeTab))) {
      setActiveTab(dynamicTabs[0].id);
    }
  }, [matches, activeTab]);

  const filteredMatches = matches.filter((m: any) => {
    if (!activeTab) return true;
    const currentTab = dynamicTabs.find(t => t.id === activeTab);
    if (!currentTab) return true;
    
    return m.stage === currentTab.stage && 
           m.group_name === currentTab.group_name && 
           m.round === currentTab.round;
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
              {dynamicTabs.map((tab) => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                       "flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest italic transition-all border shrink-0",
                       activeTab === tab.id
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                    )}
                 >
                    {tab.label}
                 </button>
              ))}
           </div>

           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">
                 Displaying {filteredMatches.length} Matches for {dynamicTabs.find(t => t.id === activeTab)?.label || activeTab}
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
              {filteredMatches.map((match) => {
                 const isTbd = match.players_known === false;
                 return (
                    <div 
                       key={match.id}
                       className={cn(
                          "transition-all duration-300 relative",
                          isTbd && "opacity-55 saturate-[0.4] filter blur-[0.25px] hover:opacity-100 hover:saturate-100 hover:blur-none"
                       )}
                    >
                       <MatchCard 
                          match={match} 
                          onAction={handleAction}
                       />
                       {isTbd && (
                          <div className="text-[8px] font-black text-[#FFD700]/90 text-center mt-1.5 uppercase tracking-widest italic select-none">
                             TBD Spot • Pre-Schedulable
                          </div>
                       )}
                    </div>
                 );
              })}
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
