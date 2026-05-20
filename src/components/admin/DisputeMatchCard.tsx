import React, { useState } from 'react';
import { DisputedMatch, ResultSubmission } from '../../types/verification.types';
import { Gavel, ImageOff, ExternalLink, ThumbsUp, AlertCircle, Loader2, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn, getPublicIdentity, getSignedUrl } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import FullScreenImageViewer from '../common/FullScreenImageViewer';
import ApproveConfirmDialog from './ApproveConfirmDialog';
import StorageImage from '../common/StorageImage';

interface DisputeMatchCardProps {
  dispute: DisputedMatch;
  adminId: string;
  onResolved: (matchId: string) => void;
  isResolving: boolean;
  onResolve: (payload: any) => Promise<void>;
  key?: React.Key;
}

export default function DisputeMatchCard({
  dispute,
  adminId,
  onResolved,
  isResolving,
  onResolve
}: DisputeMatchCardProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [selectedSub, setSelectedSub] = useState<ResultSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [overrideScore1, setOverrideScore1] = useState(0);
  const [overrideScore2, setOverrideScore2] = useState(0);

  const p1Name = getPublicIdentity(dispute.player1_username);
  const p2Name = getPublicIdentity(dispute.player2_username);

  const handleApproveSubmission = async (notes: string) => {
    if (!selectedSub) return;
    try {
      await onResolve({
        adminId,
        matchId: dispute.match_id,
        winningSubId: selectedSub.id,
        adminNotes: notes || adminNotes
      });
      setSelectedSub(null);
      onResolved(dispute.match_id);
    } catch (err) {
      console.error('Resolution failed:', err);
    }
  };

  const handleOverride = async () => {
    if (dispute.tournament_type === 'knockout' && overrideScore1 === overrideScore2) {
      alert('Knockout matches cannot end in a draw');
      return;
    }

    try {
      await onResolve({
        adminId,
        matchId: dispute.match_id,
        overrideScore1,
        overrideScore2,
        adminNotes
      });
      onResolved(dispute.match_id);
    } catch (err) {
      console.error('Override failed:', err);
    }
  };

  return (
    <motion.div
      layout
      exit={{ scale: 0.95, opacity: 0 }}
      className="card bg-slate-900 border-l-4 border-red-500 overflow-hidden relative shadow-2xl"
    >
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{dispute.tournament_name}</h3>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black italic uppercase tracking-widest text-slate-400">
                {dispute.tournament_type}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Round {dispute.round} · {dispute.stage} · {dispute.match_status}
            </p>
          </div>
          <div className="text-[10px] font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
            Conflict Reported
          </div>
        </div>

        <div className="flex items-center justify-center space-x-12 mb-12 py-4 border-y border-white/5 bg-white/[0.02]">
          <div className="text-center">
            <p className="text-lg font-black text-white italic uppercase tracking-tighter">{p1Name}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contender Alpha</p>
          </div>
          <div className="text-3xl font-black text-slate-800 italic">VS</div>
          <div className="text-center">
            <p className="text-lg font-black text-white italic uppercase tracking-tighter">{p2Name}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contender Beta</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(dispute.submissions || []).map((sub) => (
            <div key={sub.id} className="bg-black/40 rounded-3xl border border-white/5 p-6 relative group h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">{getPublicIdentity(sub)}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">{formatDistanceToNow(new Date(sub.created_at))} ago</span>
              </div>
 
              <div className="flex items-end justify-between flex-grow">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Claimed Result</p>
                  <div className="text-5xl font-black text-white italic tracking-tighter">
                    {(sub.player1_score ?? sub.score1) ?? 0} – {(sub.player2_score ?? sub.score2) ?? 0}
                  </div>
                </div>

                <div className="relative">
                  {sub.screenshot_url ? (
                    <div 
                      onClick={async () => {
                        const url = await getSignedUrl('result-screenshots', sub.screenshot_url);
                        setViewerImage(url);
                      }}
                      className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-primary transition-all cursor-zoom-in relative"
                    >
                      <StorageImage 
                        bucket="result-screenshots" 
                        path={sub.screenshot_url} 
                        alt="Evidence" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-800 flex flex-col items-center justify-center border-2 border-white/5">
                      <ImageOff className="w-6 h-6 text-slate-600 mb-1" />
                      <span className="text-[8px] font-bold text-slate-600 uppercase">No Screenshot</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setSelectedSub(sub)}
                  disabled={isResolving}
                  className="w-full py-4 border-2 border-emerald-500/20 text-emerald-500 rounded-2xl font-black uppercase italic tracking-tighter text-xs flex items-center justify-center space-x-2 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Approve This Score</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-8">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
            <AlertCircle className="w-3 h-3 mr-2" />
            Decision Audit Notes
          </label>
          <textarea
            placeholder="Why are you making this choice? (Players can see this)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:border-primary outline-none min-h-[100px]"
          />
        </div>

        <div className="flex flex-col space-y-4 pt-6 border-t border-white/5">
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors w-fit"
          >
            {showOverride ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>✏️ Manual Override Score</span>
          </button>

          <AnimatePresence>
            {showOverride && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">{p1Name} Goals</label>
                      <input 
                        type="number" 
                        value={overrideScore1}
                        onChange={(e) => setOverrideScore1(parseInt(e.target.value) || 0)}
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-2xl font-black italic outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase">{p2Name} Goals</label>
                       <input 
                        type="number" 
                        value={overrideScore2}
                        onChange={(e) => setOverrideScore2(parseInt(e.target.value) || 0)}
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-2xl font-black italic outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleOverride}
                    disabled={isResolving}
                    className="w-full py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter"
                  >
                    Apply Absolute Override
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isResolving && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-white font-black italic uppercase tracking-tighter">Resolving Dispute...</p>
          </div>
        </div>
      )}

      <FullScreenImageViewer 
        isOpen={!!viewerImage} 
        imageUrl={viewerImage || ''} 
        onClose={() => setViewerImage(null)} 
        caption="Match Evidence Screenshot"
      />

      <ApproveConfirmDialog
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        onConfirm={handleApproveSubmission}
        playerUsername={getPublicIdentity(selectedSub)}
        score1={(selectedSub?.player1_score ?? selectedSub?.score1) ?? 0}
        score2={(selectedSub?.player2_score ?? selectedSub?.score2) ?? 0}
        isLoading={isResolving}
      />
    </motion.div>
  );
}
