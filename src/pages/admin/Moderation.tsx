import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Loader2, Search, Filter, History } from 'lucide-react';
import AdminShell from '../../components/layout/AdminShell';
import { MatchDisputeCard } from '../../components/admin/MatchDisputeCard';
import { MatchNoShowReportCard } from '../../components/admin/MatchNoShowReportCard';
import { matchService } from '../../services/matchService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingState from '../../components/ui/LoadingState';

export default function Moderation() {
  const { user, can, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [noShowReports, setNoShowReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'disputed' | 'awaiting' | 'abandoned' | 'no_show' | 'history'>('disputed');
  const [formatFilter, setFormatFilter] = useState<'all' | 'tournaments' | 'challenges'>('all');
  const [cutoff] = useState(() => new Date().toISOString());
  const [counts, setCounts] = useState({
    disputed: 0,
    awaiting: 0,
    abandoned: 0,
    noShow: 0,
    history: 0
  });

  if (authLoading) {
    return <LoadingState />;
  }

  if (!can('manage_disputes')) {
    return <Navigate to="/admin" replace />;
  }

  const fetchMatches = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      // 1. Fetch from v_match_verification_dashboard
      let dashboardMatches: any[] = [];
      try {
        const { data: dashData, error: dashErr } = await (supabase as any)
          .from('v_match_verification_dashboard')
          .select('*');

        if (!dashErr && dashData) {
          dashboardMatches = dashData.map((row: any) => {
            const matchId = row.match_id || row.id;

            const subs: any[] = [];
            if (row.sub_a_id) {
              subs.push({
                id: row.sub_a_id,
                username: row.sub_a_username || row.player1_username || 'Player 1',
                avatar_url: row.player1_avatar || null,
                score1: row.sub_a_score1,
                score2: row.sub_a_score2,
                player1_score: row.sub_a_score1,
                player2_score: row.sub_a_score2,
                screenshot_url: row.sub_a_screenshot || row.sub_a_screenshot_url || null,
                status: row.sub_a_status || 'submitted',
                created_at: row.sub_a_created_at || row.scheduled_at,
                admin_notes: row.sub_a_admin_notes
              });
            }
            if (row.sub_b_id) {
              subs.push({
                id: row.sub_b_id,
                username: row.sub_b_username || row.player2_username || 'Player 2',
                avatar_url: row.player2_avatar || null,
                score1: row.sub_b_score1,
                score2: row.sub_b_score2,
                player1_score: row.sub_b_score1,
                player2_score: row.sub_b_score2,
                screenshot_url: row.sub_b_screenshot || row.sub_b_screenshot_url || null,
                status: row.sub_b_status || 'submitted',
                created_at: row.sub_b_created_at || row.scheduled_at,
                admin_notes: row.sub_b_admin_notes
              });
            }

            let countdownState = row.countdown_state;
            if (!countdownState) {
              if (row.result_verification_status === 'abandoned' || subs.length === 0) {
                countdownState = 'abandoned';
              } else if (row.result_verification_status === 'awaiting_admin_review' || subs.length === 1) {
                countdownState = 'awaiting_review';
              } else if (row.result_verification_status === 'disputed' || subs.length === 2) {
                countdownState = 'disputed';
              } else {
                countdownState = 'needs_review';
              }
            }

            const verifStatus = row.result_verification_status || (
              countdownState === 'abandoned' ? 'abandoned' :
              countdownState === 'awaiting_review' ? 'awaiting_admin_review' :
              countdownState === 'disputed' ? 'disputed' : 'needs_review'
            );

            return {
              ...row,
              id: matchId,
              match_id: matchId,
              tournament_name: row.tournament_name || 'Tournament Match',
              tournament_type: row.tournament_type || 'Tournament',
              round: row.round,
              stage: row.stage,
              group_name: row.group_name,
              match_status: row.match_status,
              result_verification_status: verifStatus,
              verification_status: verifStatus,
              countdown_state: countdownState,
              scheduled_at: row.scheduled_at,
              play_window_end: row.play_window_end,
              submission_deadline: row.submission_deadline,
              player1_id: row.player1_id,
              player1_username: row.player1_username || 'TBD',
              player1_avatar: row.player1_avatar || null,
              player1: row.player1_id ? { id: row.player1_id, username: row.player1_username, avatar_url: row.player1_avatar } : null,
              player2_id: row.player2_id,
              player2_username: row.player2_username || 'TBD',
              player2_avatar: row.player2_avatar || null,
              player2: row.player2_id ? { id: row.player2_id, username: row.player2_username, avatar_url: row.player2_avatar } : null,
              winner_username: row.winner_username || null,
              submissions: subs,
              required_action: verifStatus === 'disputed' ? 'pick_winner_or_override' : 'approve_or_reject_single_submission'
            };
          });
        }
      } catch (dashErr) {
        console.error('[Moderation] Error fetching v_match_verification_dashboard:', dashErr);
      }

      // Legacy RPC fetch
      let rpcData: any = {};
      try {
        const { data, error } = await (supabase as any).rpc('get_disputed_matches', {
          p_admin_id: user.id
        });
        if (!error && data) rpcData = data;
      } catch (e) {
        // Fallback ignored
      }

      // 1.5 Fetch pending no-show reports
      let noShowReportsList: any[] = [];
      try {
        const { data: noShowsData, error: noShowsErr } = await supabase
          .from('no_shows')
          .select(`
            *,
            matches:match_id (
              *,
              tournaments:tournament_id ( name ),
              player1:profiles!matches_player1_fkey ( id, username, avatar_url ),
              player2:profiles!matches_player2_fkey ( id, username, avatar_url )
            )
          `)
          .eq('status', 'pending');

        if (!noShowsErr && noShowsData) {
          noShowReportsList = noShowsData.map((ns: any) => ({
            ...ns,
            report_id: ns.report_id || ns.id,
            whatsapp_screenshot_url: ns.whatsapp_screenshot_url || ns.screenshot_url,
            additional_notes: ns.additional_notes || ns.notes
          }));
        } else {
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('match_no_show_reports')
            .select(`
              *,
              matches:match_id (
                *,
                tournaments:tournament_id ( name ),
                player1:profiles!matches_player1_fkey ( id, username, avatar_url ),
                player2:profiles!matches_player2_fkey ( id, username, avatar_url )
              )
            `)
            .eq('status', 'pending');

          if (fallbackData) {
            noShowReportsList = fallbackData.map((ns: any) => ({
              ...ns,
              report_id: ns.report_id || ns.id,
              whatsapp_screenshot_url: ns.whatsapp_screenshot_url || ns.screenshot_url,
              additional_notes: ns.additional_notes || ns.notes
            }));
          } else {
            console.error('[Moderation] Error fetching no show reports:', noShowsErr, fallbackErr);
          }
        }
      } catch (err) {
        console.error('[Moderation] Exception fetching no shows:', err);
      }
      setNoShowReports(noShowReportsList);

      // Fetch 1v1 challenge disputes
      let challengeDisputesMapped: any[] = [];
      try {
        const { data: challengeMatchesData, error: chErr } = await supabase
          .from('challenge_matches')
          .select(`
            id,
            status,
            result_verification_status,
            score1,
            score2,
            result_deadline,
            player1_id,
            player2_id,
            challenge_id,
            challenges ( title, entry_type, prize_pool, currency ),
            player1:profiles!challenge_matches_player1_id_fkey (
              id, username, avatar_url
            ),
            player2:profiles!challenge_matches_player2_id_fkey (
              id, username, avatar_url
            ),
            challenge_match_results (
              id, submitted_by, player1_score, player2_score,
              screenshot_url, status, created_at
            )
          `)
          .in('status', ['disputed', 'in_progress'])
          .in('result_verification_status', ['disputed', 'pending'])
          .order('result_deadline', { ascending: true });

        const challengeMatches = challengeMatchesData as any[] | null;

        if (!chErr && challengeMatches && challengeMatches.length > 0) {
          challengeDisputesMapped = challengeMatches.map((c: any) => {
            const results = c.challenge_match_results || [];
            const subs = results.map((r: any) => {
              const isP1 = r.submitted_by === c.player1_id;
              const submitterProfile = isP1 ? c.player1 : c.player2;
              return {
                id: r.id,
                username: submitterProfile?.username || 'Unknown',
                avatar_url: submitterProfile?.avatar_url || null,
                score1: r.player1_score,
                score2: r.player2_score,
                player1_score: r.player1_score,
                player2_score: r.player2_score,
                screenshot_url: r.screenshot_url,
                status: r.status,
                created_at: r.created_at,
                is_canonical: r.is_active || false,
                disputed: r.disputed,
                dispute_reason: r.dispute_reason,
                admin_notes: r.admin_notes
              };
            });

            return {
              id: c.id,
              match_id: c.id,
              challenge_id: c.challenge_id,
              tournament_name: c.challenges?.title || '1v1 Challenge',
              tournament_type: '1v1',
              round: 1,
              stage: 'Challenge Match',
              verification_status: c.result_verification_status,
              match_status: c.status,
              player1_username: c.player1?.username || 'Unknown',
              player2_username: c.player2?.username || 'Unknown',
              player1: { id: c.player1_id, username: c.player1?.username },
              player2: { id: c.player2_id, username: c.player2?.username },
              winner_username: null,
              submissions: subs,
              is_challenge: true,
              required_action: c.result_verification_status === 'disputed' 
                ? 'pick_winner_or_override' 
                : 'approve_or_reject_single_submission'
            };
          });
        }
      } catch (err) {
        console.error('[Moderation] Exception fetching challenge disputes:', err);
      }

      // Mapping function for tournament matches
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

      const legacyMapped = [...disputedMapped, ...awaitingMapped, ...abandonedMapped, ...historyMapped];
      const dashIds = new Set(dashboardMatches.map(m => m.id));
      const extraLegacyMapped = legacyMapped.filter(m => !dashIds.has(m.id));

      const allMapped = [...dashboardMatches, ...extraLegacyMapped, ...challengeDisputesMapped];
      setMatches(allMapped);

      // Section badge counts based on actual items
      const disCount = allMapped.filter(m => m.countdown_state === 'disputed' || m.verification_status === 'disputed' || m.verification_status === 'pending').length;
      const awCount = allMapped.filter(m => m.countdown_state === 'awaiting_review' || m.verification_status === 'awaiting_admin_review' || m.verification_status === 'single_submission').length;
      const abCount = allMapped.filter(m => m.countdown_state === 'abandoned' || m.verification_status === 'abandoned').length;
      const noShowCount = noShowReportsList.length;
      const histCount = allMapped.filter(m => m.verification_status === 'completed' || m.verification_status === 'verified').length;

      setCounts({
        disputed: disCount,
        awaiting: awCount,
        abandoned: abCount,
        noShow: noShowCount,
        history: histCount
      });
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

  const activeTabMatches = matches.filter(m => {
    if (activeTab === 'disputed') return m.countdown_state === 'disputed' || m.verification_status === 'disputed' || m.verification_status === 'pending';
    if (activeTab === 'awaiting') return m.countdown_state === 'awaiting_review' || m.verification_status === 'awaiting_admin_review' || m.verification_status === 'single_submission';
    if (activeTab === 'abandoned') return m.countdown_state === 'abandoned' || m.verification_status === 'abandoned';
    if (activeTab === 'history') return m.verification_status === 'completed' || m.verification_status === 'verified';
    return false;
  });

  const tournamentCountInTab = activeTabMatches.filter(m => !m.is_challenge).length;
  const challengeCountInTab = activeTabMatches.filter(m => m.is_challenge).length;

  const filteredMatches = activeTabMatches.filter(m => {
    if (formatFilter === 'tournaments') return !m.is_challenge;
    if (formatFilter === 'challenges') return !!m.is_challenge;
    return true;
  });

  const getCount = (status: string) => {
    if (status === 'disputed') return counts.disputed;
    if (status === 'awaiting_admin_review' || status === 'awaiting' || status === 'single_submission') return counts.awaiting;
    if (status === 'abandoned') return counts.abandoned;
    if (status === 'no_show') return counts.noShow;
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
                Scanning global frequency... {counts.disputed + counts.awaiting + counts.abandoned + counts.noShow} anomalies detected
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
            { id: 'no_show', label: 'No-Show Reports', count: getCount('no_show'), color: 'amber' },
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
                      tab.id === 'no_show' ? "bg-amber-500/10 border-amber-500/50 text-white shadow-xl shadow-amber-500/10" :
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

        {/* Format Sub-Filter (only visible for tabs with matches) */}
        {activeTab !== 'no_show' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-6 bg-slate-900/40 rounded-3xl border border-slate-800/80 justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                TACTICAL FREQUENCY FILTER:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Formats', count: activeTabMatches.length },
                { id: 'tournaments', label: 'Tournament Matches', count: tournamentCountInTab },
                { id: 'challenges', label: '1v1 Challenge Disputes', count: challengeCountInTab }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setFormatFilter(sub.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center space-x-2 border",
                    formatFilter === sub.id
                      ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20"
                      : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                  )}
                >
                  <span>{sub.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px] font-black border",
                    formatFilter === sub.id ? "bg-slate-950 text-primary border-primary/20" : "bg-slate-900 text-slate-500 border-slate-800"
                  )}>
                    {sub.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center bg-slate-900/30 rounded-[3rem] border border-slate-800/50 border-dashed animate-pulse">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <span className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Decrypting Tactical Data...</span>
          </div>
        ) : activeTab === 'no_show' ? (
          noShowReports.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {noShowReports.map(report => (
                <MatchNoShowReportCard
                  key={report.id}
                  report={report}
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
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No pending no-show reports in this sector.</p>
            </div>
          )
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
