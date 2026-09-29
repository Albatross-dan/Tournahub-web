import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export function EFootballSpinner({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient eFootball neon pulse aura */}
      <motion.div
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00d1ff]/40 via-[#d4e157]/20 to-[#0099bb]/40 blur-xl pointer-events-none"
      />

      {/* Layer 1: Outer fast glowing eFootball gradient arc */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full"
        style={{
          border: '3px solid transparent',
          borderTopColor: '#00d1ff',
          borderRightColor: '#d4e157',
          filter: 'drop-shadow(0 0 8px rgba(0, 209, 255, 0.8))',
        }}
      />

      {/* Layer 2: Middle counter-rotating dashed energetic orbit */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 rounded-full"
        style={{
          border: '2px dashed rgba(0, 209, 255, 0.7)',
          borderBottomColor: '#d4e157',
        }}
      />

      {/* Layer 3: Innermost high-speed accent sweep */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
        className="absolute inset-3.5 rounded-full"
        style={{
          border: '2px solid transparent',
          borderLeftColor: '#00f0ff',
          borderBottomColor: 'rgba(212, 225, 87, 0.85)',
        }}
      />

      {/* Center: Stylized eFootball Soccer Core */}
      <motion.div
        animate={{ rotate: [-8, 8, -8], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex items-center justify-center text-[#00d1ff] drop-shadow-[0_0_12px_rgba(0,209,255,0.9)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Soccer ball outer circumference */}
          <circle cx="12" cy="12" r="10" stroke="#00d1ff" strokeWidth="1.8" />
          {/* Central Pentagon Panel */}
          <polygon
            points="12,7.5 15.5,10 14,14 10,14 8.5,10"
            fill="#00d1ff"
            fillOpacity="0.35"
            stroke="#d4e157"
            strokeWidth="1.4"
          />
          {/* Hexagonal seam connectors */}
          <line x1="12" y1="2" x2="12" y2="7.5" stroke="#00d1ff" strokeWidth="1.4" />
          <line x1="15.5" y1="10" x2="21.5" y2="9" stroke="#00d1ff" strokeWidth="1.4" />
          <line x1="14" y1="14" x2="18" y2="19.5" stroke="#00d1ff" strokeWidth="1.4" />
          <line x1="10" y1="14" x2="6" y2="19.5" stroke="#00d1ff" strokeWidth="1.4" />
          <line x1="8.5" y1="10" x2="2.5" y2="9" stroke="#00d1ff" strokeWidth="1.4" />
        </svg>
      </motion.div>
    </div>
  );
}

export default function LoadingState({ 
  className,
  fullPage = false 
}: LoadingStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-6",
      !fullPage && "py-20",
      className
    )}>
      <EFootballSpinner size={76} />

      <div className="space-y-3 text-center max-w-sm px-4">
        {/* eFootball Konami Styled Typography */}
        <motion.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center gap-1.5 font-display text-base tracking-[0.25em] text-white italic font-black uppercase drop-shadow-[0_0_15px_rgba(0,209,255,0.4)]"
        >
          <span>e<span className="text-[#00d1ff]">FOOTBALL</span></span>
          <span className="text-[#d4e157]">TOURNAMENTS</span>
        </motion.div>

        {/* Konami-style Animated Neon Loading Beam */}
        <div className="w-36 h-[2px] bg-slate-900 overflow-hidden relative mx-auto border border-white/5">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#00d1ff] to-[#d4e157] shadow-[0_0_8px_#00d1ff]"
          />
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040511]/95 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
