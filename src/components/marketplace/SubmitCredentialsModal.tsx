import React, { useState } from 'react';
import { X, Send, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceService } from '../../services/marketplaceService';

interface SubmitCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  sellerId: string;
  onSuccess: () => void;
  deadline?: string;
}

export const SubmitCredentialsModal: React.FC<SubmitCredentialsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  sellerId,
  onSuccess,
  deadline,
}) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !password.trim()) {
      toast.error('Login Email/Username and Password are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await marketplaceService.submitCredentials(sellerId, orderId, {
        login_email: loginEmail.trim(),
        password: password.trim(),
        recovery_info: recoveryInfo.trim(),
        notes: notes.trim(),
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Credentials submitted securely to Escrow Vault!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-border-main rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-surface border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Lock className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                Submit Account Credentials
              </h3>
              <p className="text-xs text-text-muted font-bold">
                Send Login Details to Buyer via Escrow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed font-medium">
              <strong className="font-black text-amber-400 uppercase tracking-wide block">Escrow Guarantee</strong>
              The buyer's USD funds are currently securely locked in escrow. Once you submit correct credentials, the buyer will review and confirm delivery to release funds to your wallet.
            </div>
          </div>

          {/* Login Email / Username */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Konami ID / Login Email / Username *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. gamer@example.com or konami_id_123"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3 text-xs font-mono font-bold text-white outline-none transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Account Password *
            </label>
            <input
              type="text"
              required
              placeholder="Enter exact account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3 text-xs font-mono font-bold text-white outline-none transition-all"
            />
          </div>

          {/* Recovery Info */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Backup / Recovery Info (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Backup codes, security question answers, or original registration details..."
              value={recoveryInfo}
              onChange={(e) => setRecoveryInfo(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3 text-xs font-mono text-slate-300 outline-none transition-all resize-none"
            />
          </div>

          {/* Notes for Buyer */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Instructions & Notes for Buyer (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please link your own Google Play/Game Center account after login. Don't spend the 500 coins in mailbox..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3 text-xs text-slate-300 outline-none transition-all resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 stroke-[2.5px]" />
              <span>{submitting ? 'Submitting...' : 'Submit to Escrow'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
