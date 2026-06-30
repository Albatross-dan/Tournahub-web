import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle, ShieldCheck, UserCheck, Trash2, FileText, User } from 'lucide-react';
import { moderationService } from '../../services/moderationService';
import { supabase } from '../../lib/supabase';

// Helper to handle and format errors correctly
export function handleModerationError(error: any) {
  const msg = error?.message || '';
  const prefix = msg.split(':')[0]?.trim();
  const rest = msg.slice(prefix.length + 1)?.trim();

  if (prefix === 'MODERATION_DENIED') {
    toast.error(`Action not allowed: ${rest || 'Unauthorised operation'}`);
  } else if (prefix === 'INVALID_STATE') {
    toast.error(`Cannot complete: ${rest || 'Current state prevents this action'}`);
  } else if (prefix === 'TARGET_NOT_FOUND') {
    toast.error('User not found');
  } else {
    toast.error(msg || 'An error occurred. Please try again.');
  }
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // user profile details
  onSuccess: () => void;
}

// ==========================================
// MODAL A: BanUserModal
// ==========================================
export const BanUserModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      await moderationService.banUser(target.id, reason.trim());
      toast.success(`✓ @${target.username} has been banned`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-red-500 mb-6">
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Ban User — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs text-red-400 font-bold leading-relaxed">
            Warning: This will permanently ban the user and lock their wallet. They will not be able to log in or perform any actions.
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for Ban *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason (minimum 10 characters)"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-0 resize-none"
            />
            <p className="text-[9px] text-slate-500 text-right font-medium">
              {reason.trim().length}/10 characters min
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 10}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Ban'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL B: SuspendUserModal
// ==========================================
export const SuspendUserModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [duration, setDuration] = useState<number>(7);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required.');
      return;
    }
    if (duration < 1 || duration > 365) {
      toast.error('Duration must be between 1 and 365 days.');
      return;
    }
    setLoading(true);
    try {
      await moderationService.suspendUser(target.id, duration, reason.trim());
      toast.success(`✓ @${target.username} suspended for ${duration} days`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  const presets = [1, 3, 7, 30];
  const computedDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-orange-500 mb-6">
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Suspend User — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-orange-950/20 border border-orange-900/30 rounded-2xl text-xs text-orange-400 font-bold leading-relaxed">
            Warning: User will be suspended and unable to perform any transactions or participate in tournaments until the suspension ends.
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration (Days: 1–365) *</label>
            <input
              type="number"
              min={1}
              max={365}
              value={duration || ''}
              onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              className="w-full h-12 bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-2xl px-4 text-sm font-bold text-white outline-none"
            />
            <div className="flex gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setDuration(p)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                    duration === p
                      ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p} {p === 1 ? 'Day' : 'Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for Suspension *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-0 resize-none"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between">
            <span>Suspended Until:</span>
            <span className="text-orange-400 italic">{computedDate}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || duration < 1 || duration > 365}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Suspension'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL C: RestoreUserModal
// ==========================================
export const RestoreUserModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await moderationService.restoreUser(target.id);
      toast.success(`✓ @${target.username} account restored`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  const status = target.status;
  const isBanned = status === 'banned';
  const isSuspended = status === 'suspended';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-emerald-500 mb-6">
          <ShieldCheck className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Restore User — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs font-bold leading-relaxed text-slate-300">
            {isBanned && (
              <p>
                This user was permanently banned. Current Reason:{' '}
                <span className="text-red-400 italic block mt-1">"{target.banned_reason || 'No reason provided'}"</span>
              </p>
            )}
            {isSuspended && (
              <p>
                This user is suspended until{' '}
                <span className="text-orange-400 font-bold">
                  {target.suspended_until ? new Date(target.suspended_until).toLocaleString() : 'N/A'}
                </span>
                . Current Reason:{' '}
                <span className="text-orange-400 italic block mt-1">"{target.suspension_reason || 'No reason provided'}"</span>
              </p>
            )}
            {!isBanned && !isSuspended && <p>User current status is: <span className="text-white uppercase font-black">{status}</span></p>}
          </div>

          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">
            Are you sure you want to restore this account? This will reactivate the account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Restore Account'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL D: SoftDeleteModal
// ==========================================
export const SoftDeleteModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      await moderationService.softDeleteUser(target.id);
      toast.success(`✓ @${target.username} account deleted`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-red-500 mb-6">
          <Trash2 className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Delete User — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-xs text-slate-300 font-bold leading-relaxed">
            This will mark the account as deleted. The user's data will be preserved but they will be blocked from all platform access. This is reversible ONLY by re-activating via restore.
          </p>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            To permanently delete and erase all data, perform a Permanent Delete afterwards.
          </p>

          <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-950 rounded-2xl border border-slate-850 select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 text-red-600 bg-slate-900 border-slate-800 rounded focus:ring-red-500 focus:ring-offset-slate-900"
            />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              I understand this will block the user immediately
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || !confirmed}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete Account'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL E: PermanentDeleteModal (TWO-STEP)
// ==========================================
export const PermanentDeleteModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset states on reopen
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmUsername('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSoftDeleteFirst = async () => {
    setLoading(true);
    try {
      await moderationService.softDeleteUser(target.id);
      toast.success(`✓ @${target.username} account soft-deleted`);
      onSuccess();
      setStep(1); // remain or refresh
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameMatch = (input: string, username: string) => {
    const cleanInput = input.trim().toLowerCase().replace(/^@/, '');
    const cleanUsername = (username || '').trim().toLowerCase().replace(/^@/, '');
    return cleanInput === cleanUsername && cleanInput.length > 0;
  };

  const handlePermanentlyDelete = async () => {
    if (!checkUsernameMatch(confirmUsername, target.username)) {
      toast.error('Username does not match.');
      return;
    }
    setLoading(true);
    try {
      await moderationService.permanentlyDeleteUser(target.id);
      toast.success(`✓ @${target.username} permanently deleted`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  const isDeletedStatus = target.status === 'deleted';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        {step === 1 ? (
          <div>
            <div className="flex items-center space-x-3 text-red-500 mb-6">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h4 className="text-xl font-black italic uppercase tracking-tighter">⚠️ Permanent Delete</h4>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs text-red-400 font-bold leading-relaxed space-y-2">
                <p className="font-extrabold uppercase tracking-wide">This action is IRREVERSIBLE. It will:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Permanently delete the user account from the auth system</li>
                  <li>Erase all their tournaments, registrations, standings</li>
                  <li>Delete all their storage files (avatars, screenshots)</li>
                  <li>Remove all wallet data</li>
                  <li>This CANNOT be undone.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl text-[10px] uppercase font-black text-slate-500 flex justify-between">
                <span>Current Status:</span>
                <span className={isDeletedStatus ? 'text-emerald-500' : 'text-red-500'}>
                  {target.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>

              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                Requirement notice: User must have status = 'deleted' first.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {isDeletedStatus ? (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-red-950/50 flex items-center justify-center gap-1"
                >
                  I Understand, Proceed →
                </button>
              ) : (
                <button
                  onClick={handleSoftDeleteFirst}
                  disabled={loading}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-amber-500 hover:text-amber-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Soft Delete First</span>
                </button>
              )}
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 text-red-500 mb-6">
              <AlertTriangle className="w-8 h-8 shrink-0 animate-bounce" />
              <h4 className="text-xl font-black italic uppercase tracking-tighter">Final Confirmation</h4>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-xs text-slate-300 font-bold leading-relaxed">
                Type the username to confirm permanent deletion of <span className="text-white font-black">@{target.username}</span>:
              </p>

              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={target.username}
                className="w-full bg-slate-950 border border-red-900 focus:border-red-500 rounded-2xl py-4 px-5 text-center text-sm font-black text-red-500 outline-none"
                autoComplete="off"
              />

              <p className="text-[10px] text-red-500/80 font-bold text-center uppercase tracking-wider">
                This will purge everything. No backups inside active app.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handlePermanentlyDelete}
                disabled={loading || !checkUsernameMatch(confirmUsername, target.username)}
                className="w-full py-4 bg-red-900 hover:bg-red-800 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-red-950/80 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>PERMANENTLY DELETE</span>
              </button>
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MODAL F: AssignRoleModal
// ==========================================
export const AssignRoleModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [role, setRole] = useState<'user' | 'moderator' | 'admin'>('user');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setRole((target.role || 'user') as any);
    }
  }, [isOpen, target]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await moderationService.assignRole(target.id, role);
      toast.success(`✓ Role updated to ${role}`);
      
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        console.warn('[AssignRoleModal] Failed to refresh session on role update (non-fatal):', refreshErr);
      }

      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-purple-500 mb-6">
          <UserCheck className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Change Role — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-850">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Current Role:</span>
            <span className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {target.role || 'user'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select New Role</label>
            <div className="grid grid-cols-1 gap-2">
              {['user', 'moderator', 'admin'].map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                    role === r
                      ? 'bg-purple-500/10 border-purple-500/50 text-white'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{r}</span>
                  <input
                    type="radio"
                    name="role-select"
                    checked={role === r}
                    onChange={() => setRole(r as any)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-800"
                  />
                </label>
              ))}
            </div>
          </div>

          {role === 'admin' && (
            <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl text-[11px] text-amber-500 font-bold leading-relaxed">
              Caution: Admin users have full platform control. Be absolutely certain before assigning this high level role.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-purple-950/50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Role'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL G: AddNoteModal
// ==========================================
export const AddNoteModal: React.FC<ModalProps> = ({ isOpen, onClose, user: target, onSuccess }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (note.trim().length < 5) {
      toast.error('Note must be at least 5 characters.');
      return;
    }
    setLoading(true);
    try {
      await moderationService.addModerationNote(target.id, note.trim());
      toast.success(`✓ Note added to @${target.username}'s record`);
      onSuccess();
      onClose();
    } catch (err) {
      handleModerationError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center space-x-3 text-blue-500 mb-6">
          <FileText className="w-8 h-8 shrink-0" />
          <h4 className="text-xl font-black italic uppercase tracking-tighter">Add Note — @{target.username}</h4>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            Notes are visible to all admins and moderators in the moderation log. They do not affect the user's account standing.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Note Content *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter note text (minimum 5 characters)"
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:ring-0 resize-none"
            />
            <p className="text-[9px] text-slate-500 text-right font-medium">
              {note.trim().length}/5 characters min
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || note.trim().length < 5}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Note'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
