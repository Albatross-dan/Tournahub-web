import React from 'react';
import { useAdminDisputes } from '../../hooks/useAdminDisputes';
import DisputeMatchCard from '../../components/admin/DisputeMatchCard';
import SingleSubmissionCard from '../../components/admin/SingleSubmissionCard';
import { Gavel, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function AdminDisputes() {
  const { user } = useAuth();
  const {
    disputes,
    count,
    isLoading,
    isResolving,
    error,
    loadDisputes,
    resolveDispute,
    sendReminder,
    forceApprove
  } = useAdminDisputes(user?.id || '');

  const handleManualRefresh = async () => {
    await loadDisputes();
    toast.success('Disputes refreshed');
  };

  const handleReminder = async (opponentId: string, matchId: string) => {
    try {
      await sendReminder(opponentId, matchId);
      toast.success('Reminder sent to opponent');
    } catch (err: any) {
      toast.error('Failed to send reminder');
    }
  };

  const handleForceApproveAction = async (resultId: string, verifierId: string) => {
    try {
      await forceApprove(resultId, verifierId);
      toast.success('Result force approved');
    } catch (err: any) {
      toast.error('Failed to force approve');
    }
  };

  if (isLoading && disputes.length === 0) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-white/5 rounded-xl animate-pulse" />
        </header>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const conflictMatches = (disputes || []).filter(d => d.verification_status === 'disputed');
  const singleSubMatches = (disputes || []).filter(d => d.verification_status === 'single_submission');

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-red-500/10 p-3 rounded-2xl">
            <Gavel className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center">
              Result Review
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="ml-4 px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Audit and verify conflicting match outcomes</p>
          </div>
        </div>

        <button 
          onClick={handleManualRefresh}
          className="p-4 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-colors"
        >
          <RotateCcw className={cn("w-6 h-6", isLoading && "animate-spin")} />
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center">
          {error}
        </div>
      )}

      {disputes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-20 text-center flex flex-col items-center border-dashed border-2 bg-transparent border-slate-800"
        >
          <div className="bg-emerald-500/10 p-6 rounded-full border border-emerald-500/20 mb-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">All Clear</h3>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No disputed matches requiring review.</p>
        </motion.div>
      ) : (
        <div className="space-y-16">
          {conflictMatches.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.3em] flex items-center">
                <span className="w-8 h-[1px] bg-red-500/30 mr-4" />
                Score Conflicts
                <span className="ml-4 px-2 py-0.5 bg-red-500/10 rounded">{conflictMatches.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-8">
                <AnimatePresence mode="popLayout">
                  {conflictMatches.map((dispute) => (
                    <DisputeMatchCard 
                      key={dispute.match_id} 
                      dispute={dispute} 
                      adminId={user?.id || ''}
                      isResolving={isResolving}
                      onResolve={resolveDispute}
                      onResolved={() => {
                        toast.success('Dispute resolved');
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {singleSubMatches.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] flex items-center">
                <span className="w-8 h-[1px] bg-amber-500/30 mr-4" />
                Awaiting Second Submission
                <span className="ml-4 px-2 py-0.5 bg-amber-500/10 rounded">{singleSubMatches.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {singleSubMatches.map((dispute) => (
                    <SingleSubmissionCard 
                      key={dispute.match_id} 
                      dispute={dispute}
                      adminId={user?.id || ''}
                      onSendReminder={handleReminder}
                      onForceApprove={handleForceApproveAction}
                      onResolved={() => {}}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
