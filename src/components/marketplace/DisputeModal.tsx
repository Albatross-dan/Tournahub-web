import React, { useState } from 'react';
import { X, AlertTriangle, Upload, Trash2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceService } from '../../services/marketplaceService';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  openerId: string;
  onSuccess: () => void;
}

const DISPUTE_REASONS = [
  'Account details incorrect / invalid login',
  'Account recovered or accessed by original owner',
  'Missing coins, GP, or advertised Epic/Featured players',
  'Seller unresponsive or refusing to assist',
  'Other / Fraud attempt',
];

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  orderId,
  openerId,
  onSuccess,
}) => {
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files) as File[];
      if (files.length + selected.length > 5) {
        toast.error('You can upload a maximum of 5 evidence screenshots.');
        return;
      }
      setFiles([...files, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please provide a detailed explanation (at least 10 characters).');
      return;
    }

    setUploading(true);
    try {
      const evidencePaths: string[] = [];
      for (const file of files) {
        const path = await marketplaceService.uploadDisputeEvidence(openerId, orderId, file);
        evidencePaths.push(path);
      }

      const res = await marketplaceService.openDispute(
        openerId,
        orderId,
        reason,
        description.trim(),
        evidencePaths
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Dispute opened successfully. Moderation desk has been alerted.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit dispute.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-border-main rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-950/80 to-surface border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                Open Escrow Dispute
              </h3>
              <p className="text-xs text-red-300/80 font-bold">
                Freeze Escrow Funds & Request Admin Moderation
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
          <div className="p-3.5 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200/90 leading-relaxed font-medium">
              Opening a dispute will immediately freeze escrow funds and assign an operations moderator to investigate. Please provide clear screenshots or proof.
            </div>
          </div>

          {/* Reason Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Primary Dispute Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-red-500 rounded-xl p-3 text-xs font-bold text-white outline-none cursor-pointer"
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Detailed Explanation *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Provide exact details: what went wrong, timelines, or discrepancies between listing advertised vs what was received..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-red-500 rounded-xl p-3 text-xs text-slate-300 outline-none transition-all resize-none"
            />
          </div>

          {/* Evidence Screenshots Uploader */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Evidence Screenshots (Optional, max 5)</span>
              <span className="text-slate-500">{files.length} / 5</span>
            </label>

            <div className="border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl p-4 text-center transition-all bg-background/50 relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={files.length >= 5 || uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-300">Click or drag screenshots here</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Supports JPG, PNG, WEBP (Max 5MB each)</p>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-2">
                {files.map((file, idx) => (
                  <div key={idx} className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-white/10 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Evidence ${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{uploading ? 'Uploading Evidence...' : 'Submit Dispute'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
