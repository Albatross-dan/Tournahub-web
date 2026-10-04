import React, { useState } from 'react';
import { Trophy, Gamepad2, CheckCircle2, Wallet, X, ChevronRight, Check } from 'lucide-react';
import { welcomeTourSteps } from './guideContent';
import { useGuideState } from './useGuideState';

const STEP_ICONS: Record<string, React.ElementType> = {
  find_tournament: Trophy,
  play_match: Gamepad2,
  submit_result: CheckCircle2,
  wallet_prizes: Wallet,
};

interface WelcomeTourProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WelcomeTour({ forceOpen = false, onClose }: WelcomeTourProps) {
  const { shouldShowTour, completeTour } = useGuideState();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const isOpen = forceOpen || shouldShowTour;

  if (!isOpen) return null;

  const currentStep = welcomeTourSteps[currentStepIndex] || welcomeTourSteps[0];
  const isLastStep = currentStepIndex === welcomeTourSteps.length - 1;
  const StepIcon = STEP_ICONS[currentStep.id] || Trophy;

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
      if (onClose) onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    completeTour();
    if (onClose) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
    >
      <div className="w-full max-w-md bg-[#0a0d1d] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header row: progress indicator and close button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#facc15] bg-[#facc15]/10 px-2 py-0.5 rounded-md border border-[#facc15]/20">
              TournaHub Guide
            </span>
            <span className="text-xs text-slate-400 font-bold">
              Step {currentStepIndex + 1} of {welcomeTourSteps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex items-start space-x-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#facc15]/15 border border-[#facc15]/30 flex items-center justify-center text-[#facc15] shrink-0 mt-0.5">
            <StepIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="tour-step-title" className="text-sm font-black text-white uppercase italic tracking-tight mb-1">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center space-x-1.5 mb-5">
          {welcomeTourSteps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentStepIndex
                  ? 'w-6 bg-[#facc15]'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              aria-label={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action row: Skip and Next on EVERY step */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-[#facc15] hover:bg-white text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md shadow-amber-950/20 cursor-pointer"
          >
            <span>{isLastStep ? 'Get Started' : 'Next'}</span>
            {isLastStep ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
