import React, { useState, useEffect } from 'react';
import { DisputedMatch } from '../../types/verification.types';
import { Clock, Bell, Zap, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn, getStorageUrl } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface SingleSubmissionCardProps {
  dispute: DisputedMatch;
  adminId: string;
  onResolved: (matchId: string) => void;
  onSendReminder: (opponentId: string, matchId: string) => Promise<void>;
  onForceApprove: (matchId: string, verifierId: string) => Promise<void>;
  key?: React.Key;
}

export default function SingleSubmissionCard({
  dispute,
  adminId,
  onResolved,
  onSendReminder,
  onForceApprove
}: SingleSubmissionCardProps) {
  const [loading, setLoading] = useState(false);
  const [reminderCooldown, setReminderCooldown] = useState(0);

  const sub = dispute.submissions[0];
  const noSubPlayerId = sub.submitted_by === dispute.player1_id ? dispute.player2_id : dispute.player1_id;
  const noSubUsername = sub.submitted_by === dispute.player1_id ? dispute.player2_username : dispute.player1_username;

  useEffect(() => {
    if (reminderCooldown > 0) {
      const timer = setTimeout(() => setReminderCooldown(reminderCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [reminderCooldown]);

  const handleSendReminder = async () => {
    try {
      await onSendReminder(noSubPlayerId, dispute.match_id);
      setReminderCooldown(30);
    } catch (err) {
      console.error('Failed to send reminder:', err);
    }
  };

  const handleForceApprove = async () => {
    const s1 = (sub.player1_score ?? sub.score1) ?? 0;
    const s2 = (sub.player2_score ?? sub.score2) ?? 0;
    if (!confirm(`Force approve ${sub.username}'s result of ${s1}–${s2}? This will skip opponent verification.`)) {
      return;
    }
    setLoading(true);
    try {
      // For force approve, we use the submission ID
      // But the RPC expects p_result_id which is the submission ID
      await onForceApprove(sub.id, adminId);
      onResolved(dispute.match_id);
    } catch (err) {
      console.error('Force approve failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-slate-900 border-l-4 border-amber-500 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-black text-white italic uppercase tracking-tighter">{dispute.tournament_name}</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Round {dispute.round} · {dispute.stage}
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-center md:text-left">
            <p className="text-xs font-black text-white italic uppercase tracking-tighter">{dispute.player1_username} vs {dispute.player2_username}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              <span className="font-bold text-amber-500">{sub.username}</span> submitted: {(sub.player1_score ?? sub.score1) ?? 0}–{(sub.player2_score ?? sub.score2) ?? 0}
            </p>
          </div>
          
          {sub.screenshot_url && (
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
              <img src={getStorageUrl('result-screenshots', sub.screenshot_url) || ''} alt="Evidence" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Submitted {formatDistanceToNow(new Date(sub.created_at))} ago</span>
          <span className="text-[10px] font-black text-amber-500 uppercase italic tracking-tighter ml-4">
            ⏳ Waiting for {noSubUsername}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={handleSendReminder}
          disabled={reminderCooldown > 0}
          className="flex-1 md:flex-none px-6 py-3 bg-slate-800 text-white rounded-xl font-black uppercase italic tracking-tighter text-[10px] flex items-center justify-center space-x-2 hover:bg-slate-750 transition-colors disabled:opacity-50"
        >
          <Bell className="w-4 h-4" />
          <span>{reminderCooldown > 0 ? `Sent (${reminderCooldown}s)` : 'Send Reminder'}</span>
        </button>

        <button
          onClick={handleForceApprove}
          disabled={loading}
          className="flex-1 md:flex-none px-6 py-3 bg-amber-500 text-slate-900 rounded-xl font-black uppercase italic tracking-tighter text-[10px] flex items-center justify-center space-x-2 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          <span>Force Approve</span>
        </button>
      </div>
    </div>
  );
}
