import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, Loader2 } from 'lucide-react';

interface ApproveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  playerUsername: string;
  score1: number;
  score2: number;
  isLoading: boolean;
}

export default function ApproveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  playerUsername,
  score1,
  score2,
  isLoading
}: ApproveConfirmDialogProps) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="bg-emerald-500/10 p-3 rounded-2xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Confirm Approval</h3>
          <p className="text-slate-400 text-sm mb-6">
            Approve <span className="text-white font-bold">{playerUsername}'s</span> submitted score of <span className="text-white font-bold italic">{score1} – {score2}</span>?
          </p>

          <div className="space-y-4 mb-8">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Decision Notes (Optional)</label>
            <textarea
              placeholder="Reason for approval..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:border-emerald-500 outline-none min-h-[100px]"
            />
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => onConfirm(notes)}
              disabled={isLoading}
              className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✅ Confirm Approval'}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-4 bg-white/5 text-white rounded-2xl font-black uppercase italic tracking-tighter hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
