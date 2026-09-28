import React, { useState, useEffect } from 'react';
import { X, Key, Copy, Check, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { OrderCredentials } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  requesterId: string;
  isBuyer?: boolean;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  requesterId,
  isBuyer = true,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [credentials, setCredentials] = useState<OrderCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(!isBuyer); // Admins don't need to acknowledge warning
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId || !requesterId) return;
    let isMounted = true;

    const fetchCreds = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await marketplaceService.getCredentials(requesterId, orderId);
        if (!isMounted) return;
        if (res.error) {
          setError(res.error);
          toast.error(res.error);
        } else if (res.credentials) {
          setCredentials(res.credentials);
        } else {
          setError('No credentials found for this order.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'Failed to retrieve credentials.';
        setError(msg);
        toast.error(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCreds();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId, requesterId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-border-main rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-surface border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Key className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                Account Login Credentials
              </h3>
              <p className="text-xs text-text-muted font-bold">
                Escrow Protected Delivery Details
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Persistent Non-dismissible Warning for Buyers */}
          {isBuyer && (
            <div className="bg-red-950/60 border-2 border-red-500/60 rounded-2xl p-4 shadow-lg shadow-red-950/50 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-300">
                    SECURITY MANDATE & — CRITICAL WARNING
                  </h4>
                  <p className="text-xs text-red-200/90 font-bold mt-1 leading-relaxed">
                    Change this account's password and linked email immediately after confirming delivery.
                  </p>
                  <p className="text-[11px] text-red-300/80 font-medium mt-1">
                    Never leave the original seller's recovery email or password unchanged. Verify all players and coins in-game before clicking "Confirm Delivery".
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-2.5 bg-red-900/30 rounded-xl border border-red-500/30 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="w-4 h-4 rounded text-red-500 focus:ring-red-500 accent-red-500 cursor-pointer"
                />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  I understand and will change credentials immediately
                </span>
              </label>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Decrypting Escrow Vault...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-xs font-bold text-red-300">{error}</p>
            </div>
          ) : !acknowledged && isBuyer ? (
            <div className="py-10 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-white/5 p-6">
              <Lock className="w-10 h-10 text-amber-400 mx-auto opacity-60" />
              <h4 className="text-sm font-black text-white uppercase italic">Credentials Locked</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Please check the security acknowledgment box above to reveal and copy the login credentials.
              </p>
            </div>
          ) : credentials ? (
            <div className="space-y-4">
              {/* Login Email/Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Login Email / Username / Konami ID
                </label>
                <div className="flex items-center gap-2 bg-background p-3 rounded-xl border border-white/10">
                  <span className="font-mono font-bold text-sm text-white flex-1 truncate select-all">
                    {credentials.login_email || 'N/A'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(credentials.login_email || '', 'Login Email')}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-all cursor-pointer shrink-0"
                    title="Copy Email/Username"
                  >
                    {copiedField === 'Login Email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Account Password
                </label>
                <div className="flex items-center gap-2 bg-background p-3 rounded-xl border border-white/10">
                  <span className="font-mono font-bold text-sm text-white flex-1 truncate select-all">
                    {credentials.password || 'N/A'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(credentials.password || '', 'Password')}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-all cursor-pointer shrink-0"
                    title="Copy Password"
                  >
                    {copiedField === 'Password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Recovery Info */}
              {credentials.recovery_info && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Backup / Recovery Information
                  </label>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-xl border border-white/10">
                    <span className="font-mono font-bold text-xs text-slate-300 flex-1 whitespace-pre-wrap select-all">
                      {credentials.recovery_info}
                    </span>
                    <button
                      onClick={() => copyToClipboard(credentials.recovery_info || '', 'Recovery Info')}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-all cursor-pointer shrink-0"
                      title="Copy Recovery Info"
                    >
                      {copiedField === 'Recovery Info' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {credentials.notes && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Seller Instructions & Notes
                  </label>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-white/5 text-xs text-slate-300 whitespace-pre-wrap font-medium leading-relaxed">
                    {credentials.notes}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-background/50 border-t border-white/5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
