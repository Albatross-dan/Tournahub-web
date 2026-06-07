import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Clock, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { matchService } from '../../services/matchService';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MatchNoShowReportCardProps {
  report: any;
  onResolved: () => void;
  adminId: string;
}

export const MatchNoShowReportCard: React.FC<MatchNoShowReportCardProps> = ({ report, onResolved, adminId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolvedLocal, setResolvedLocal] = useState(false);

  const match = report.matches || {};
  const reporterId = report.reported_by;
  const absentId = report.absent_player;

  const player1 = match.player1 || {};
  const player2 = match.player2 || {};

  const reporterName = reporterId === player1.id ? (player1.username || 'Player 1') : (player2.username || 'Player 2');
  const absentName = absentId === player1.id ? (player1.username || 'Player 1') : (player2.username || 'Player 2');

  const isReporterP1 = reporterId === player1.id;

  const isMyMatch = adminId && (adminId === player1.id || adminId === player2.id);
  const isFinalised = match.status === 'completed' || match.status === 'played' || report.status === 'resolved';

  const screenshotSrc = report.whatsapp_screenshot_url || report.screenshot_url;
  const additionalNotes = report.additional_notes || report.notes;

  if (resolvedLocal) {
    return null;
  }

  const handleAction = async (action: 'walkover' | 'reschedule' | 'dismiss') => {
    if (isMyMatch) {
      toast.error('Admins cannot resolve disputes for their own matches.');
      return;
    }
    if (isFinalised) {
      toast.error('Match already finalised.');
      return;
    }
    setLoadingAction(action);
    try {
      const reportId = report.report_id || report.id;
      if (!reportId) {
        throw new Error('Report ID is missing or invalid.');
      }

      const { data, error } = await (supabase as any).rpc('admin_resolve_no_show', {
        p_report_id: reportId,
        p_action: action,
        p_admin_notes: adminNotes.trim() || null
      });

      console.log('resolve result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
      }
      const resData = data as any;
      if (resData?.error) {
        console.error('Function error:', resData.error);
      }

      if (resData && resData.success === true) {
        sessionStorage.removeItem('admin_dashboard_cache');
        setResolvedLocal(true);
        toast.success(`Report resolved — ${action}`);
        onResolved();
      } else {
        throw new Error(resData?.error || resData?.message || 'Failed to resolve the no-show report.');
      }
    } catch (err: any) {
      console.error('[MatchNoShowReportCard] admin_resolve_no_show error:', err);
      toast.error(err.message || 'Resolution execution failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase italic tracking-widest leading-tight">
              {match.tournaments?.name || 'Tournament Match'} • No-Show Report
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                PENDING REVIEW
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                Reported by {reporterName}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800 flex items-center justify-center cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Static Summary Area */}
      <div className="p-6 border-b border-slate-850 bg-slate-900/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            {/* Player 1 */}
            <div className={cn(
              "p-3 rounded-2xl border text-center flex-1 min-w-[120px]",
              isReporterP1 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'
            )}>
              <span className="text-[8px] font-black uppercase tracking-wider block text-slate-500 mb-1">Player 1</span>
              <span className="text-sm font-bold text-white block truncate">{player1.username || 'Player 1'}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                {isReporterP1 ? '📢 Reporter' : '❌ Absent'}
              </span>
            </div>

            <div className="text-slate-700 font-extrabold italic text-xs uppercase">vs</div>

            {/* Player 2 */}
            <div className={cn(
              "p-3 rounded-2xl border text-center flex-1 min-w-[120px]",
              !isReporterP1 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'
            )}>
              <span className="text-[8px] font-black uppercase tracking-wider block text-slate-500 mb-1">Player 2</span>
              <span className="text-sm font-bold text-white block truncate">{player2.username || 'Player 2'}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                {!isReporterP1 ? '📢 Reporter' : '❌ Absent'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full md:w-auto px-6 py-3 bg-slate-850 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800"
            >
              Auditing Evidence
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Area */}
      {isExpanded && (
        <div className="p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Evidence Screenshot */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Submitted Proof (WhatsApp Coordination)</label>
                {screenshotSrc ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-video relative group">
                    <img 
                      src={screenshotSrc} 
                      alt="No-Show Proof Screenshot" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <a 
                      href={screenshotSrc} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 bg-black/80 hover:bg-black text-white p-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg border border-zinc-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full View</span>
                    </a>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 border-dashed rounded-2xl aspect-video flex flex-col items-center justify-center text-slate-600">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-wider">No Screenshot Uploaded</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              {/* Reporter Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reporter's Statement</label>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-300 leading-relaxed uppercase tracking-tight min-h-[100px]">
                  {additionalNotes && additionalNotes.trim() ? additionalNotes : 'NO DESCRIPTION PROVIDED'}
                </div>
              </div>

              {/* Moderator Logs */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderator Logs (Visibility: Internal)</label>
                <textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter justification for resolution protocol..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white focus:border-primary focus:ring-0 transition-all h-24 resize-none outline-none focus:border-amber-500/30 font-sans uppercase tracking-tight placeholder-zinc-650"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            {isMyMatch ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>You cannot resolve or override disputes for your own match. Please request another administrator to audit this conflict.</span>
              </div>
            ) : isFinalised ? (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>This match has already been completed, resolved, or finalised.</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleAction('walkover')}
                  disabled={!!loadingAction}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingAction === 'walkover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{loadingAction === 'walkover' ? 'Awarding Walkover...' : 'Award Walkover'}</span>
                </button>

                <button 
                  onClick={() => handleAction('reschedule')}
                  disabled={!!loadingAction}
                  className="flex-1 py-4 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingAction === 'reschedule' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  <span>{loadingAction === 'reschedule' ? 'Rescheduling...' : 'Reschedule'}</span>
                </button>

                <button 
                  onClick={() => handleAction('dismiss')}
                  disabled={!!loadingAction}
                  className="flex-1 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingAction === 'dismiss' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>{loadingAction === 'dismiss' ? 'Dismissing...' : 'Dismiss'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
