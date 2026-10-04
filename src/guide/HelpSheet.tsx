import React, { useState } from 'react';
import { 
  HelpCircle, X, ChevronRight, ChevronDown, RotateCcw, 
  Trophy, CheckCircle2, Shield, Gavel, Wallet, Layers 
} from 'lucide-react';
import { helpGuides } from './guideContent';

const GUIDE_ICONS: Record<string, React.ElementType> = {
  join_tournament: Trophy,
  submit_result: CheckCircle2,
  escrow_prizes: Shield,
  dispute_resolution: Gavel,
  wallet_transactions: Wallet,
  formats: Layers,
};

interface HelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

export default function HelpSheet({ isOpen, onClose, onReplayTour }: HelpSheetProps) {
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleGuide = (id: string) => {
    setExpandedGuideId((prev) => (prev === id ? null : id));
  };

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0a0d1d] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0d1124]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#facc15]/15 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
                TournaHub Help & Guides
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Quick guides & rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list of short guides */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 custom-scrollbar flex-1">
          {helpGuides.map((guide) => {
            const Icon = GUIDE_ICONS[guide.id] || HelpCircle;
            const isExpanded = expandedGuideId === guide.id;

            return (
              <div
                key={guide.id}
                className="border border-slate-800/80 rounded-xl bg-slate-900/40 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleGuide(guide.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[#facc15] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200 truncate">
                      {guide.title}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/30">
                    <ol className="space-y-2 mt-2">
                      {guide.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300 leading-relaxed font-medium">
                          <span className="w-4 h-4 rounded-full bg-[#facc15]/20 text-[#facc15] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Replay Tour option */}
        <div className="p-4 border-t border-slate-800 bg-[#0d1124] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onReplayTour) onReplayTour();
              if (onClose) onClose();
            }}
            className="flex items-center space-x-1.5 text-xs font-black text-[#facc15] hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay welcome tour</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
