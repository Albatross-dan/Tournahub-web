import React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { contextualTips } from './guideContent';
import { useGuideState } from './useGuideState';

interface GuideTipProps {
  id?: string;
  className?: string;
}

export default function GuideTip({ id, className = '' }: GuideTipProps) {
  const { shouldShowTip, dismissTip } = useGuideState();

  if (!id || !shouldShowTip(id)) {
    return null;
  }

  const tipData = contextualTips[id];
  if (!tipData) {
    return null;
  }

  const handleDismiss = () => {
    dismissTip(id);
  };

  return (
    <div
      role="region"
      aria-label="Helpful tip"
      className={`relative w-full my-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0e1222] border border-[#facc15]/30 shadow-md flex items-start justify-between gap-3 text-left animate-in fade-in duration-150 ${className}`}
    >
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-[#facc15]/15 border border-[#facc15]/30 flex items-center justify-center text-[#facc15] shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#facc15]">
              Tip: {tipData.title}
            </span>
          </div>
          <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">
            {tipData.text}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-2.5 py-1 bg-[#facc15] hover:bg-white text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs flex items-center space-x-1"
        >
          <span>Got it</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          aria-label="Dismiss tip"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
