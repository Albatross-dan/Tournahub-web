import React, { useState } from 'react';
import { HelpCircle, X, Layers } from 'lucide-react';
import { formatExplorations } from './guideContent';

interface FormatExplainerProps {
  format?: string;
  className?: string;
}

export default function FormatExplainer({ format, className = '' }: FormatExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize format key (e.g. 'single_elimination' -> 'knockout', 'double_elimination' -> 'knockout', etc.)
  const normalizedKey = (() => {
    if (!format) return 'knockout';
    const str = String(format).toLowerCase();
    if (str.includes('swiss')) return 'swiss';
    if (str.includes('champions')) return 'champions_league';
    if (str.includes('group')) return 'group_knockout';
    if (str.includes('league') || str.includes('round_robin')) return 'league';
    return 'knockout';
  })();

  const formatData = formatExplorations[normalizedKey] || formatExplorations.knockout;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center space-x-1 text-[11px] font-bold text-[#facc15] hover:text-white underline underline-offset-2 transition-colors cursor-pointer ${className}`}
        title="Learn how this tournament format works"
      >
        <HelpCircle className="w-3 h-3 inline-block shrink-0" />
        <span>How does this format work?</span>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#0a0d1d] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 shadow-2xl relative animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#facc15]/15 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {formatData.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium mb-4">
              {formatData.summary}
            </p>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 bg-[#facc15] hover:bg-white text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
