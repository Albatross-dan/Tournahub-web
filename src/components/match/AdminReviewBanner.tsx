import React from 'react';
import { Search, Anchor, Loader2, AlertCircle, ShieldEllipsis } from 'lucide-react';

interface AdminReviewBannerProps {
  type: 'awaiting' | 'abandoned';
}

export function AdminReviewBanner({ type }: AdminReviewBannerProps) {
  const isAwaiting = type === 'awaiting';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className={isAwaiting ? "bg-primary p-8" : "bg-slate-700 p-8"}>
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/10">
            {isAwaiting ? (
              <Search className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <ShieldEllipsis className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
              {isAwaiting ? 'Extraction Pending' : 'Match Abandoned'}
            </h3>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px]">
              {isAwaiting ? 'Operator Review Required' : 'Signal Lost • Admin Resolution Required'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex items-start space-x-4">
          <div className="bg-slate-800 p-3 rounded-xl mt-1">
            <AlertCircle className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-black text-white uppercase italic tracking-widest leading-none">Status Report</h4>
            <p className="text-sm font-bold text-slate-500 tracking-tight leading-relaxed">
              {isAwaiting 
                ? "Your opponent did not complete the verification protocol within the allotted window. A match moderator has been assigned to verify your submission and synchronize the outcomes."
                : "Neither operator completed the submission protocol before the deadline expired. The match has been flagged for manual administrative override."
              }
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 pt-4">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Moderation queue active</span>
          </div>
          
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center space-x-3 w-full max-w-sm">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Anchor className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-white block uppercase tracking-tight">ETA Analysis</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Usually resolved within 60-120 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
