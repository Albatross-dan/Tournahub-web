import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Upload, Trash2, ShieldAlert, Clock, CheckCircle2, FileText, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceService } from '../../services/marketplaceService';
import { cn } from '../../lib/utils';

interface DisputeResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  userId: string;
  onSuccess: () => void;
}

export const DisputeResponseModal: React.FC<DisputeResponseModalProps> = ({
  isOpen,
  onClose,
  orderId,
  userId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const fetchDisputeDetails = async () => {
    setLoading(true);
    try {
      const data = await marketplaceService.getDisputeByOrderId(orderId);
      setDispute(data);
    } catch (err) {
      console.error('Failed to load dispute details:', err);
      toast.error('Failed to fetch dispute details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDisputeDetails();
    }
  }, [isOpen, orderId]);

  // Response deadline countdown timer
  useEffect(() => {
    if (!dispute || !dispute.response_deadline || dispute.responded_at) return;

    const interval = setInterval(() => {
      const target = new Date(dispute.response_deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dispute]);

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

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute) return;
    if (!responseText.trim() || responseText.trim().length < 10) {
      toast.error('Please provide a detailed response (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const evidencePaths: string[] = [];
      for (const file of files) {
        const path = await marketplaceService.uploadDisputeEvidence(userId, orderId, file);
        evidencePaths.push(path);
      }

      const res = await marketplaceService.respondToDispute(
        userId,
        dispute.id,
        responseText.trim(),
        evidencePaths
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Your response and evidence have been submitted successfully.');
        onSuccess();
        fetchDisputeDetails();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine user's role in the dispute
  const isOpener = dispute && dispute.opener_id === userId;
  const isResponder = dispute && dispute.opener_id !== userId;
  const canRespond = dispute && isResponder && dispute.status === 'open' && timeLeft !== 'Expired' && !dispute.responded_at;

  const headingText = dispute?.dispute_category === 'account_recovery' 
    ? 'Account Recovery Report' 
    : 'Escrow Dispute Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-border-main rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-950/40 to-surface border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                {headingText}
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Order #{orderId.slice(0, 8)} • Dispute Assessment
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Dispute Dossier...</span>
            </div>
          ) : !dispute ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p>No active dispute found for this order.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Category & Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/50 border border-white/5 p-4 rounded-2xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Category</span>
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                    {dispute.dispute_category === 'account_recovery' ? '⚠️ Account Recovery Report' : 'Escrow Dispute'}
                  </span>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Investigative Status</span>
                  <span className={cn(
                    "text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                    dispute.status === 'open' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    dispute.status === 'under_review' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    dispute.status === 'resolved_buyer' ? "bg-purple-500/15 border-purple-500/30 text-purple-400" :
                    "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  )}>
                    {dispute.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Deadline & Warning Banner */}
              {dispute.status === 'open' && (
                <div className={cn(
                  "p-4 rounded-2xl border flex items-start gap-3",
                  canRespond 
                    ? "bg-amber-500/5 border-amber-500/25 text-amber-400" 
                    : "bg-slate-900/60 border-white/5 text-slate-300"
                )}>
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {canRespond ? "Urgent: Counterparty Response Window" : "Counterparty Response Timeline"}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-bold">
                      {canRespond ? (
                        <>
                          You must respond to this dispute within the deadline. If the countdown expires before submission, the dispute may be <strong className="text-red-400">automatically resolved against you</strong>.
                        </>
                      ) : isOpener ? (
                        <>
                          The other party has been granted a response window. They must submit their evidence before the deadline or the dispute may be resolved in your favor.
                        </>
                      ) : (
                        <>
                          The response window for this dispute has closed or already been resolved.
                        </>
                      )}
                    </p>
                    {timeLeft && !dispute.responded_at && (
                      <div className="pt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-950 border border-white/5 rounded-lg text-white">
                          Time Remaining: <span className="font-mono text-amber-400 font-black">{timeLeft}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto Resolution Info */}
              {dispute.auto_resolved && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-start gap-3 text-purple-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-purple-400" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider">Auto-Resolved on Timeout</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                      The counterparty did not submit a response within the mandatory response window. The system has automatically resolved this dispute.
                    </p>
                  </div>
                </div>
              )}

              {/* Section: Opener Case Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Opened by {isOpener ? 'You (Opener)' : 'Other Party (Opener)'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {new Date(dispute.created_at).toLocaleString()}
                  </span>
                </div>
                
                <div className="space-y-1 bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Reason</span>
                  <p className="text-xs font-extrabold text-white">{dispute.reason}</p>
                  
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block pt-3">Explanation</span>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">{dispute.description}</p>
                </div>

                {/* Opener Evidence Screenshots */}
                {dispute.evidence && dispute.evidence.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Opener Evidence Uploads</span>
                    <div className="grid grid-cols-3 gap-2">
                      {dispute.evidence.map((path: string, i: number) => (
                        <a
                          key={i}
                          href={path.startsWith('http') ? path : `https://ais-dev-judsa7ecfkx7irjf545me7-589007434214.europe-west2.run.app/storage/v1/object/public/marketplace-dispute-evidence/${path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative hover:border-red-500/40 transition-colors cursor-pointer group"
                        >
                          <img 
                            src={path.startsWith('http') ? path : `https://ais-dev-judsa7ecfkx7irjf545me7-589007434214.europe-west2.run.app/storage/v1/object/public/marketplace-dispute-evidence/${path}`} 
                            alt={`Evidence ${i + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black uppercase tracking-wider text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/10">View Full</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Responder Details or Form */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                {dispute.responded_at ? (
                  // Responder has already responded
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Counterparty Response
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {new Date(dispute.responded_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl space-y-2">
                      <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {dispute.counterparty_response}
                      </p>
                    </div>

                    {/* Responder Evidence Uploads */}
                    {dispute.counterparty_evidence && dispute.counterparty_evidence.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Response Evidence Uploads</span>
                        <div className="grid grid-cols-3 gap-2">
                          {dispute.counterparty_evidence.map((path: string, i: number) => (
                            <a
                              key={i}
                              href={path.startsWith('http') ? path : `https://ais-dev-judsa7ecfkx7irjf545me7-589007434214.europe-west2.run.app/storage/v1/object/public/marketplace-dispute-evidence/${path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative hover:border-emerald-500/40 transition-colors cursor-pointer group"
                            >
                              <img 
                                src={path.startsWith('http') ? path : `https://ais-dev-judsa7ecfkx7irjf545me7-589007434214.europe-west2.run.app/storage/v1/object/public/marketplace-dispute-evidence/${path}`} 
                                alt={`Counterparty Evidence ${i + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[8px] font-black uppercase tracking-wider text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/10">View Full</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : canRespond ? (
                  // Responder has NOT responded yet, show form
                  <form onSubmit={handleResponseSubmit} className="space-y-4">
                    <div className="border-b border-white/5 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        Submit Your Defense Response
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Detailed Explanation * (At least 10 chars)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Provide your defense details, screenshot logs, account access logs, email change receipt code details..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="w-full bg-background border border-border-main focus:border-amber-500 rounded-xl p-3 text-xs font-bold text-white placeholder:text-slate-500 outline-none resize-none"
                      />
                    </div>

                    {/* Evidence Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                        Upload Defense Proof (Optional, max 5)
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
                          <label className="w-20 h-20 bg-slate-900 hover:bg-slate-800 border border-dashed border-white/10 hover:border-amber-500/40 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-slate-500 hover:text-amber-400 select-none">
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

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Uploading & Submitting...' : 'Submit Defense Response'}
                    </button>
                  </form>
                ) : (
                  // Open but pending responder response
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-center">
                    <Clock className="w-6 h-6 text-slate-500 mx-auto mb-1 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Awaiting counterparty response
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold max-w-xs mx-auto mt-1">
                      The responder has been notified. They have until the response deadline to present their defense evidence.
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Resolution Section */}
              {dispute.admin_notes && (
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Admin Investigator Notes
                  </span>
                  <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl">
                    <p className="text-xs font-medium text-slate-300 whitespace-pre-wrap">
                      {dispute.admin_notes}
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/30 border-t border-white/5 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Close Assessment
          </button>
        </div>

      </div>
    </div>
  );
};
