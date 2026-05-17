import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { matchService } from '../../services/matchService';
import { MatchVerificationState } from '../../types/verification';
import { CheckCircle2, Clock, AlertTriangle, Gavel, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface VerificationStatusWidgetProps {
  matchId: string;
  onStateChange?: (state: MatchVerificationState) => void;
}

export default function VerificationStatusWidget({ matchId, onStateChange }: VerificationStatusWidgetProps) {
  const { user } = useAuth();
  const [state, setState] = useState<MatchVerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchState();

    const channel = supabase.channel(`match_verification_${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, () => {
        fetchState();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function fetchState() {
    try {
      const data = await matchService.getMatchVerificationState(matchId);
      const prevState = state;
      setState(data);
      if (onStateChange) onStateChange(data);

      // Confetti effect on transition to verified
      if (data && (data.ui_state === 'auto_verified' || data.ui_state === 'admin_verified')) {
        if (!prevState || (prevState.ui_state !== 'auto_verified' && prevState.ui_state !== 'admin_verified')) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Verification State...</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-bold">{error || 'Failed to load verification state'}</p>
      </div>
    );
  }

  const { ui_state, submissions, final_score1, final_score2, winner } = state;
  const mySubmission = submissions.find(s => s.submitted_by === user?.id);

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {ui_state === 'waiting_for_opponent' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-12 bg-amber-500/5 rounded-3xl border border-amber-500/20 text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-pulse rounded-full" />
              <div className="relative bg-amber-500/20 p-4 rounded-full">
                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Waiting for Opponent</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed mb-6">
              Your score has been recorded. We're waiting for your opponent to submit their result for cross-verification.
            </p>
            
            {mySubmission && (
              <div className="w-full max-w-xs bg-black/40 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">You Submitted</p>
                <div className="text-3xl font-black text-white italic tracking-tighter">
                  {mySubmission.score1} - {mySubmission.score2}
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  Submitted {formatDistanceToNow(new Date(mySubmission.created_at))} ago
                </p>
              </div>
            )}
          </motion.div>
        )}

        {(ui_state === 'auto_verified' || ui_state === 'admin_verified') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/5 rounded-3xl border border-emerald-500/20 p-10 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
               <div className="bg-emerald-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter italic">
                 Official
               </div>
            </div>
            
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">
              {ui_state === 'auto_verified' ? 'Verified Automatically' : 'Verified by Admin'}
            </h3>
            <p className="text-slate-400 text-sm mb-8">
              {ui_state === 'auto_verified' ? 'Both players agreed on the score.' : 'This result has been confirmed by a tournament official.'}
            </p>

            <div className="flex items-center justify-center space-x-8 mb-8">
              <div className="text-center">
                <div className="text-6xl font-black text-white italic tracking-tighter">
                  {final_score1} - {final_score2}
                </div>
              </div>
            </div>

            {winner && (
              <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-emerald-500 font-black uppercase italic tracking-tighter mr-2 text-sm">Winner:</span>
                <span className="text-white font-bold">{winner}</span>
              </div>
            )}
          </motion.div>
        )}

        {ui_state === 'under_admin_review' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/5 rounded-3xl border border-red-500/20 p-8 text-center"
          >
            <Gavel className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Under Admin Review</h3>
            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
              The scores submitted by both players do not match. An official is currently investigating the evidence.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {submissions.map((sub, idx) => (
                <div key={sub.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sub.username}</span>
                    {sub.screenshot_url && <ImageIcon className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="text-2xl font-black text-white italic tracking-tighter">{sub.score1} - {sub.score2}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
