import React, { useState, useEffect } from 'react';
import { X, Trophy, CheckCircle2, XCircle, Loader2, ImageIcon, ExternalLink, MessageSquare, AlertCircle } from 'lucide-react';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';
import { getSignedUrl } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import StorageImage from '../common/StorageImage';

interface ResultReviewPanelProps {
  match: any;
  onClose: () => void;
  onSuccess: (winnerId: string, score: string, tournamentComplete: boolean) => void;
}

export const ResultReviewPanel: React.FC<ResultReviewPanelProps> = ({ match, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [match.id]);

  async function fetchResult() {
    try {
      const data = await matchService.getMatchResult(match.id);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!user || !result) return;
    
    if (action === 'reject' && !adminNotes.trim()) {
      setError('Rejection requires mandatory administrative notes.');
      return;
    }

    setBusy(true);
    setError(null);
    
    try {
      const res = await matchService.adminVerifyResult(result.id, user.id, action, adminNotes);
      
      if (action === 'approve') {
        const winner = res.winner_id === match.player1 ? match.player1_profile?.username : match.player2_profile?.username;
        onSuccess(res.winner_id, res.final_score, res.tournament_complete);
      } else {
        onSuccess('', '', false); // Rejection
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
           <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
              <Trophy className="w-5 h-5" />
           </div>
           <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Verify Outcome</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                {match.stage?.replace('_', ' ')} • {((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 1) ? 'Quarter Final' :
                 ((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 2) ? 'Semi Final' :
                 ((match.stage === 'playoffs' || match.stage === 'playoff' || match.stage === 'play_off') && Number(match.round) === 3) ? 'Final' :
                 `Round ${match.round}`}
              </p>
           </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Fetching Encrypted Claims..." />
        </div>
      ) : !result ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
           <AlertCircle className="w-12 h-12 text-slate-700" />
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No pending submission detected for this match.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Match Header */}
          <div className="card p-6 bg-slate-900/50 border-slate-800">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-3 text-center">Tournament Identity: {match.tournament?.name || 'Tournament'}</p>
             <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                   <p className="text-lg font-black text-white italic uppercase tracking-tighter truncate">{match.player1_profile?.username || 'TBD'}</p>
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Player 1</p>
                </div>
                <div className="px-6">
                   <span className="text-2xl font-black text-primary italic">VS</span>
                </div>
                <div className="text-center flex-1">
                   <p className="text-lg font-black text-white italic uppercase tracking-tighter truncate">{match.player2_profile?.username || 'TBD'}</p>
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Player 2</p>
                </div>
             </div>
          </div>

          {/* Result Data */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">Claimed Results</h4>
                {result.submission_attempt > 1 && (
                   <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> RE-SUBMISSION #{result.submission_attempt}
                   </span>
                )}
             </div>

             <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black">
                      {(result.submitter?.username || 'U')[0].toUpperCase()}
                   </div>
                   <div>
                      <p className="text-xs font-black text-white italic uppercase tracking-tight">{result.submitter?.username}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Submitted By</p>
                   </div>
                </div>

                <div className="flex items-center space-x-4">
                   <div className="text-center">
                      <span className="text-3xl font-black text-white italic">{result.player1_score}</span>
                   </div>
                   <span className="text-slate-700 font-black italic">/</span>
                   <div className="text-center">
                      <span className="text-3xl font-black text-white italic">{result.player2_score}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Screenshot */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">Visual Evidence</h4>
             {result.screenshot_url ? (
                <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-black aspect-video flex items-center justify-center">
                   <StorageImage 
                      bucket="result-screenshots" 
                      path={result.screenshot_url} 
                      alt="Proof" 
                      className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                   />
                </div>
             ) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 space-y-2">
                   <ImageIcon className="w-8 h-8" />
                   <p className="text-[10px] font-black uppercase tracking-widest italic">No image file attached</p>
                </div>
             )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">Administrative Directive (Optional)</label>
             <div className="relative">
                <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
                <textarea
                   value={adminNotes}
                   onChange={(e) => setAdminNotes(e.target.value)}
                   placeholder="Enter verification notes or reason for rejection..."
                   className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold tracking-tight min-h-[120px] focus:border-primary/50 transition-all outline-none resize-none"
                />
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-tight italic">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex space-x-4 pt-4 sticky bottom-0 bg-surface pb-6">
             <button
                onClick={() => handleAction('reject')}
                disabled={busy}
                className="flex-1 py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-black uppercase tracking-widest italic rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center space-x-2"
             >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> <span>Reject</span></>}
             </button>
             <button
                onClick={() => handleAction('approve')}
                disabled={busy}
                className="flex-[2] btn-primary py-4 text-sm font-black italic uppercase tracking-tighter rounded-2xl flex items-center justify-center space-x-2"
             >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> <span>Approve Result</span></>}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
