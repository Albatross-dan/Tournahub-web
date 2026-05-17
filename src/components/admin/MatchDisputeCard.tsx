import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  RefreshCw, 
  Eye, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { matchService } from '../../services/matchService';
import { supabase } from '../../lib/supabase';

interface MatchDisputeCardProps {
  match: any;
  onResolved: () => void;
  adminId: string;
}

export const MatchDisputeCard: React.FC<MatchDisputeCardProps> = ({ match, onResolved, adminId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [overrideScore1, setOverrideScore1] = useState<string>('');
  const [overrideScore2, setOverrideScore2] = useState<string>('');

  const submissions = match.submissions || [];
  const requiredAction = match.required_action;

  const handleAction = async (action: string, resultId?: string) => {
    setLoadingAction(action);
    console.log(`[MatchDisputeCard] Action Request: ${action}`, { 
      resultId, 
      matchId: match.match_id, 
      requiredAction: match.required_action,
      submissionCount: submissions.length 
    });
    
    if (!match.match_id) {
      console.error('[MatchDisputeCard] Critical Error: Match object is missing match_id', match);
      alert('Internal Reference Error: This match data is malformed and missing its unique identifier. Please refresh the page.');
      setLoadingAction(null);
      return;
    }

    try {
      if (action === 'approve') {
        const isSingleSubFlow = requiredAction === 'approve_or_reject_single_submission' || (submissions.length === 1 && match.verification_status !== 'disputed');
        
        if (isSingleSubFlow) {
          console.log('[MatchDisputeCard] Executing adminVerifyResult Flow');
          const targetId = resultId || (submissions[0]?.id);
          if (!targetId) throw new Error('Internal Error: No valid submission footprint detected for approval.');
          await matchService.adminVerifyResult(targetId, adminId, 'approve', adminNotes);
        } else {
          console.log('[MatchDisputeCard] Executing resolveDispute Flow');
          // Resolve dispute requires a winning submission if possible, but can also work with overrides
          await matchService.resolveDispute({
            adminId,
            matchId: match.match_id,
            winningSubId: resultId,
            adminNotes: adminNotes || 'Administrative consensus resolution',
          });
        }
      } else if (action === 'no_show_p1' || action === 'no_show_p2') {
        // Resolve as forfeit
        const score1 = action === 'no_show_p2' ? 3 : 0;
        const score2 = action === 'no_show_p1' ? 3 : 0;
        console.log(`[MatchDisputeCard] Resolving as no-show for ${action === 'no_show_p1' ? 'P1' : 'P2'}`);
        await matchService.resolveDispute({
          adminId,
          matchId: match.match_id,
          overrideScore1: score1,
          overrideScore2: score2,
          adminNotes: adminNotes || `System Resolution: No-show forfeit awarded to ${action === 'no_show_p2' ? 'P1' : 'P2'}`,
        });
      } else if (action === 'cancel') {
        console.log('[MatchDisputeCard] Resolving as match cancellation');
        await matchService.resolveDispute({
          adminId,
          matchId: match.match_id,
          overrideScore1: 0,
          overrideScore2: 0,
          adminNotes: adminNotes || 'Protocol: Match nullified by administrative authority',
        });
      } else if (action === 'reschedule') {
        // If we have a reschedule flow, call it here. For now at least try to call resolveDispute if suitable
        // but resolveDispute with no scores/winningSub might fail depending on SQL constraints.
        throw new Error('Rescheduling requires setting a new timeline. Please use the Match Edit interface.');
      }
      
      console.log('[MatchDisputeCard] Action success');
      onResolved();
    } catch (err: any) {
      console.error('[MatchDisputeCard] Critical action failure:', err);
      alert(err.message || 'Standard Operation failed. Check logs for decryption.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOverrideSubmit = async () => {
    setLoadingAction('override');
    try {
      await matchService.resolveDispute({
        adminId,
        matchId: match.match_id,
        overrideScore1: parseInt(overrideScore1),
        overrideScore2: parseInt(overrideScore2),
        adminNotes,
      });
      setShowOverrideModal(false);
      onResolved();
    } catch (err: any) {
      alert(err.message || 'Override failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const getSubUrl = (sub: any) => {
    if (!sub?.screenshot_url) return null;
    return supabase.storage.from('result-screenshots').getPublicUrl(sub.screenshot_url).data.publicUrl;
  };

  console.log(`[MatchDisputeCard:${match.match_id}] Render State:`, { 
    requiredAction: match.required_action, 
    status: match.verification_status,
    submissions: submissions.length 
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase italic tracking-widest leading-tight">
              {match.tournament_name || 'Tournament Match'} • Round {match.round || '?'}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                match.verification_status === 'disputed' ? "bg-red-500/10 text-red-500" : 
                match.verification_status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                "bg-orange-500/10 text-orange-500"
              )}>
                {match.verification_status || 'Under Review'}
              </span>
              {match.verification_status !== 'completed' && (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  {match.submission_count || 0} Submissions
                </span>
              )}
            </div>
          </div>
        </div>
        
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse match details" : "Expand match details for examination"}
            className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all flex items-center space-x-2"
          >
          <span className="text-[10px] font-black uppercase tracking-widest">{isExpanded ? 'Collapse' : match.verification_status === 'completed' ? 'View Intel' : 'Examine Intel'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center space-x-8 py-4 relative">
          <div className="text-center group">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mb-3 mx-auto">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 1</span>
            <span className="text-sm font-black text-white uppercase tracking-tight">{match.player1_username || match.player1?.username || 'Operator A'}</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-2xl font-black italic text-slate-700">VS</div>
            {match.verification_status === 'completed' && (
              <div className="mt-2 text-2xl font-black text-primary italic tracking-tight">
                {match.score1} – {match.score2}
              </div>
            )}
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mb-3 mx-auto">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Player 2</span>
            <span className="text-sm font-black text-white uppercase tracking-tight">{match.player2_username || match.player2?.username || 'Operator B'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            {/* Submissions Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.length > 0 ? submissions.map((sub: any, idx: number) => (
                <div key={sub.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intel #{idx + 1}</span>
                    <span className="text-[10px] font-bold text-primary uppercase">{sub.username}</span>
                  </div>
                  <div className="flex items-center justify-center py-6 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <span className="text-4xl font-black italic text-white">{sub.player1_score} – {sub.player2_score}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-600">Verification Image</span>
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group relative">
                      <img src={getSubUrl(sub) || undefined} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={`Match result screenshot submitted by ${sub.username}`} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/60">
                        <button 
                          className="p-3 bg-white text-black rounded-full shadow-xl"
                          aria-label={`View full size screenshot from ${sub.username}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Approve Specific Button */}
                  {requiredAction === 'pick_winner_or_override' && match.verification_status !== 'completed' && (
                    <button 
                      onClick={() => handleAction('approve', sub.id)}
                      disabled={!!loadingAction}
                      aria-label={`Approve score for ${sub.username}`}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {loadingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{loadingAction === 'approve' ? 'Processing...' : 'Approve This Score'}</span>
                    </button>
                  )}
                </div>
              )) : match.verification_status !== 'completed' ? (
                <div className="col-span-2 p-12 text-center bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl">
                  <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">No active signal transmissions found</span>
                </div>
              ) : (
                <div className="col-span-2 p-12 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">Operation Finalized</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">The conflict has been resolved by general consensus or administrative decision.</p>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {match.verification_status === 'completed' ? (
              match.admin_notes && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderator Logs</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-400 italic">
                    {match.admin_notes}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderator Logs (Visibility: Internal)</label>
                <textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter justification for resolution protocol..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-primary focus:ring-0 transition-all h-24 resize-none outline-none focus:border-primary/50"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Actions */}
      {match.verification_status !== 'completed' && (
          <div className="pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {requiredAction === 'pick_winner_or_override' || match.verification_status === 'disputed' ? (
            <>
              <button 
                onClick={() => setShowOverrideModal(true)}
                disabled={!!loadingAction}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center justify-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Override</span>
              </button>
              <button 
                onClick={() => handleAction('reschedule')}
                disabled={!!loadingAction}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reschedule</span>
              </button>
            </>
          ) : (requiredAction === 'approve_or_reject_single_submission' || match.verification_status === 'awaiting_admin_review' || (submissions.length === 1 && match.verification_status === 'disputed')) ? (
            <>
              <button 
                onClick={() => {
                  if (submissions[0]) {
                    handleAction('approve', submissions[0].id);
                  } else {
                    console.error('[MatchDisputeCard] Approval failed: submissions array is empty', match);
                    alert('Configuration Error: Unable to approve because no submission data was found for this match. This may be a synchronization issue.');
                  }
                }}
                disabled={!!loadingAction}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loadingAction === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{loadingAction === 'approve' ? 'Processing...' : 'Approve One'}</span>
              </button>
              <button 
                onClick={() => handleAction('no_show_p2')} // Assuming P2 is the one who didn't submit
                disabled={!!loadingAction}
                className="py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loadingAction === 'no_show_p2' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>No-Show P2</span>
              </button>
            </>
          ) : (
             <button 
                onClick={() => handleAction('cancel')}
                disabled={!!loadingAction}
                className="col-span-2 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loadingAction === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Eradicate Match</span>
              </button>
          )}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
            <h5 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6">Manual <span className="text-primary">Echelon Override</span></h5>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final P1 Score</label>
                <input 
                  type="number"
                  value={overrideScore1}
                  onChange={(e) => setOverrideScore1(e.target.value)}
                  className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-2xl font-black text-center text-white focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final P2 Score</label>
                <input 
                  type="number"
                  value={overrideScore2}
                  onChange={(e) => setOverrideScore2(e.target.value)}
                  className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl text-2xl font-black text-center text-white focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleOverrideSubmit}
                disabled={!overrideScore1 || !overrideScore2 || loadingAction === 'override'}
                className="w-full py-5 bg-primary text-black font-black uppercase italic tracking-widest rounded-2xl hover:bg-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center disabled:opacity-50"
              >
                {loadingAction === 'override' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Confirm Override'}
              </button>
              <button 
                onClick={() => setShowOverrideModal(false)}
                className="w-full py-5 bg-slate-800 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
              >
                Abort Protocol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
