import React, { useState } from 'react';
import { X, AlertTriangle, Upload, Trash2, ShieldAlert, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceService } from '../../services/marketplaceService';

interface AccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  buyerId: string;
  onSuccess: () => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  isOpen,
  onClose,
  orderId,
  buyerId,
  onSuccess,
}) => {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      toast.error('Please provide a detailed description of the account recovery (at least 10 characters).');
      return;
    }

    // MANDATORY evidence validation client-side!
    if (files.length === 0) {
      toast.error('Evidence is required. You must upload at least one proof screenshot (e.g., login failure, error message).');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload files first
      const evidencePaths: string[] = [];
      for (const file of files) {
        const path = await marketplaceService.uploadDisputeEvidence(buyerId, orderId, file);
        evidencePaths.push(path);
      }

      // 2. Submit account recovery report
      const res = await marketplaceService.reportAccountRecovery(
        buyerId,
        orderId,
        description.trim(),
        evidencePaths
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Account recovery report filed successfully. Dispute opened.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to file account recovery report.');
    } finally {
      setSubmitting(false);
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
                Report Account Recovery
              </h3>
              <p className="text-xs text-red-300/80 font-bold">
                Recovery Protection • Escrow Dispute
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200/90 leading-relaxed font-bold">
              REPORT WARNING: Filing a false report is a serious violation. Only report if the seller has reclaimed, changed password, or revoked access to your purchased eFootball account. Proof/Evidence is strictly required.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Detailed Description * (What happened?)
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Tried logging in today, but password was changed and the recovery email was changed back to the original seller's address. Included screenshot of Konami login error."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-red-500 rounded-xl p-3 text-xs font-bold text-white placeholder:text-slate-500 outline-none resize-none"
            />
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block">
              Evidence Upload * (At least one screenshot/proof is required)
            </label>
            
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative w-20 h-20 bg-slate-900 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                  <Image className="w-6 h-6 text-slate-600" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 right-1 text-[8px] font-bold text-slate-400 truncate text-center">
                    {file.name}
                  </span>
                </div>
              ))}

              {files.length < 5 && (
                <label className="w-20 h-20 bg-slate-900 hover:bg-slate-800 border border-dashed border-white/10 hover:border-red-500/40 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-slate-500 hover:text-red-400 select-none">
                  <Upload className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-wider">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 bg-slate-950/30 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Filing Report...' : 'Submit Recovery Report'}
          </button>
        </div>

      </div>
    </div>
  );
};
