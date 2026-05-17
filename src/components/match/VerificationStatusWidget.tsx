import React, { useEffect } from 'react';
import { useMatchVerification } from '../../hooks/useMatchVerification';
import SubmitResultForm from './SubmitResultForm';
import { VerificationStatus } from '../../types/verification.types';
import { CheckCircle2, Gavel, Clock, Trophy, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface VerificationStatusWidgetProps {
  matchId: string;
  currentUserId: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
  onSubmitSuccess?: (result: { verification_status: VerificationStatus, auto_verified?: boolean }) => void;
}

export default function VerificationStatusWidget({
  matchId,
  currentUserId,
  player1Id,
  player2Id,
  player1Username,
  player2Username,
  onSubmitSuccess
}: VerificationStatusWidgetProps) {
  const {
    verificationState,
    isLoading,
    isSubmitting,
    submitError,
    submitSuccess,
    autoVerified,
    currentUserSubmission,
    hasCurrentUserSubmitted,
    submitResult
  } = useMatchVerification(matchId, currentUserId);

  useEffect(() => {
    if (submitSuccess && onSubmitSuccess && verificationState) {
      onSubmitSuccess({
        verification_status: verificationState.verification_status,
        auto_verified: autoVerified
      });
    }
  }, [submitSuccess, verificationState, autoVerified, onSubmitSuccess]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing result state...</p>
      </div>
    );
  }

  if (!verificationState) return null;

  const { ui_state, submissions, final_score1, final_score2, winner } = verificationState;

  const getStorageUrl = (path: string) => {
    return supabase.storage.from('result-screenshots').getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {ui_state === 'awaiting_submissions' && (
          <motion.div 
            key="awaiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 md:p-12"
          >
            <div className="mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Submit Your Result</h3>
              <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Both players must submit their score independently.</p>
            </div>
            
            <SubmitResultForm 
              matchId={matchId}
              submitterId={currentUserId}
              player1Id={player1Id}
              player2Id={player2Id}
              player1Username={player1Username}
              player2Username={player2Username}
              isSubmitting={isSubmitting}
              error={submitError}
              onSubmit={submitResult}
            />
          </motion.div>
        )}

        {ui_state === 'waiting_for_opponent' && (
          <motion.div 
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-12 text-center"
          >
            {hasCurrentUserSubmitted ? (
              <div className="space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                  <div className="relative bg-amber-500/10 p-6 rounded-full border border-amber-500/20">
                    <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Waiting for Opponent</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">Your score has been submitted. Your opponent needs to submit theirs to confirm the result.</p>
                </div>

                {currentUserSubmission && (
                  <div className="bg-black/40 rounded-3xl p-6 border border-white/5 max-w-sm mx-auto">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Your Submission</p>
                    <div className="text-5xl font-black text-white italic tracking-tighter mb-4">
                      {currentUserSubmission.score1} – {currentUserSubmission.score2}
                    </div>
                    {currentUserSubmission.screenshot_url && (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden mb-4 border border-white/5">
                        <img src={getStorageUrl(currentUserSubmission.screenshot_url)} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 uppercase font-bold">
                      Submitted {formatDistanceToNow(new Date(currentUserSubmission.created_at))} ago
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-amber-500 text-slate-900 text-[10px] font-black py-2 rounded-xl uppercase tracking-[0.2em] italic mb-6">
                  ⚡ Your opponent has already submitted their score. Submit yours now!
                </div>
                <SubmitResultForm 
                  matchId={matchId}
                  submitterId={currentUserId}
                  player1Id={player1Id}
                  player2Id={player2Id}
                  player1Username={player1Username}
                  player2Username={player2Username}
                  isSubmitting={isSubmitting}
                  error={submitError}
                  onSubmit={submitResult}
                />
              </div>
            )}
          </motion.div>
        )}

        {(ui_state === 'auto_verified' || ui_state === 'admin_verified') && (
          <motion.div 
            key="verified"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 200,
                damping: 20
              }
            }}
            className={cn(
              "card p-12 text-center overflow-hidden relative",
              ui_state === 'auto_verified' ? "border-emerald-500/20" : "border-primary/20"
            )}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative z-10"
            >
              <CheckCircle2 className={cn(
                "w-20 h-20 mx-auto mb-8",
                ui_state === 'auto_verified' ? "text-emerald-500" : "text-primary"
              )} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
                {ui_state === 'auto_verified' ? 'Result Verified Automatically' : 'Verified by Admin'}
              </h3>
              <p className="text-slate-400 text-sm mb-12">
                {ui_state === 'auto_verified' ? 'Both players submitted matching scores.' : 'An admin reviewed and confirmed this result.'}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center space-x-6 mb-12"
            >
              <div className="bg-white/5 px-10 py-6 rounded-3xl border border-white/5">
                <div className="text-7xl font-black text-white italic tracking-tighter">
                  {final_score1} – {final_score2}
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {winner ? (
                <div className="inline-flex items-center space-x-3 px-6 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                  <span className="text-emerald-500 font-black uppercase italic tracking-tighter">{winner} wins!</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-3 px-6 py-3 bg-slate-500/10 rounded-2xl border border-slate-500/20">
                  <span className="text-slate-500 font-black uppercase italic tracking-tighter">🤝 Match drawn!</span>
                </div>
              )}
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.5 }} 
              transition={{ delay: 0.6 }}
              className="text-[10px] font-bold text-white mt-12 uppercase tracking-[0.2em]"
            >
              {ui_state === 'auto_verified' ? 'No admin review required' : 'Verified by official authority'}
            </motion.p>
          </motion.div>
        )}

        {ui_state === 'under_admin_review' && (
          <motion.div 
            key="disputed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: {
                border: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
            }}
            className="card p-8 md:p-12 border-amber-500/20 relative"
          >
            <motion.div
              animate={{ borderColor: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.5)', 'rgba(245, 158, 11, 0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl border-2 pointer-events-none"
            />

            <div className="text-center mb-12">
              <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                <Gavel className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Under Admin Review</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Your submitted scores don't match your opponent's. An admin has been notified and will review both submissions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {submissions.map((sub, idx) => (
                <div key={sub.id} className="bg-black/40 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{sub.username}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">{formatDistanceToNow(new Date(sub.created_at))} ago</span>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Their score</p>
                      <div className="text-4xl font-black text-white italic tracking-tighter">
                        {sub.score1} – {sub.score2}
                      </div>
                    </div>
                    {sub.screenshot_url && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 group-hover:border-primary transition-colors cursor-pointer">
                        <img src={getStorageUrl(sub.screenshot_url)} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
