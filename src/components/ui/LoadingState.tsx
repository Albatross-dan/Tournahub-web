import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

const STADIUM_BG = '/assets/efootball_loading_bg.jpg';

/**
 * Pixel-accurate official eFootball emblem and stencil wordmark matching Konami's title screen
 */
export function EFootballLogo({ 
  className, 
  size = 'default',
  spin = true
}: { 
  className?: string; 
  size?: 'sm' | 'default' | 'lg';
  spin?: boolean;
}) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const emblemSize = isSmall ? 'w-16 h-16' : isLarge ? 'w-36 h-36 md:w-44 md:h-44' : 'w-24 h-24 md:w-32 md:h-32';
  const textWidth = isSmall ? 'w-44' : isLarge ? 'w-72 md:w-88' : 'w-56 md:w-72';

  return (
    <div className={cn("flex flex-col items-center select-none relative", className)}>
      {/* 1. Official eFootball Circular Emblem - Spinning cleanly without glow */}
      <motion.div
        animate={spin ? { 
          rotate: 360,
        } : { 
          scale: [0.99, 1.015, 0.99],
        }}
        transition={spin ? { 
          rotate: { duration: 2.0, repeat: Infinity, ease: "linear" },
        } : { 
          duration: 2.4, repeat: Infinity, ease: "easeInOut" 
        }}
        style={{ transformOrigin: 'center center' }}
        className={cn("relative z-10", emblemSize)}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
          {/* Top Arc of "e" */}
          <path
            d="M 27.3 78 A 76 76 0 0 1 172.7 78 L 138.1 78 A 44 44 0 0 0 61.9 78 Z"
            fill="#ffffff"
          />
          {/* Middle Crossbar */}
          <rect
            x="24"
            y="88"
            width="152"
            height="24"
            rx="3"
            fill="#ffffff"
          />
          {/* Bottom Arc of "e" */}
          <path
            d="M 27.3 122 L 61.9 122 A 44 44 0 0 0 138.1 122 L 172.7 122 A 76 76 0 0 1 27.3 122 Z"
            fill="#ffffff"
          />
        </svg>
      </motion.div>

      {/* 2. Official "FOOTBALL™" Stencil Typography */}
      <div className={cn("relative z-10 mt-1.5 md:mt-2.5", textWidth)}>
        <svg viewBox="0 0 540 90" className="w-full h-auto" fill="none">
          {/* LETTER: F */}
          {/* Top Bar */}
          <path d="M 18 14 L 64 14 A 5 5 0 0 1 69 19 L 69 26 A 4 4 0 0 1 65 30 L 34 30 L 34 14 Z" fill="#ffffff" />
          {/* Middle Bar */}
          <path d="M 34 42 L 56 42 A 4 4 0 0 1 60 46 L 60 52 A 4 4 0 0 1 56 56 L 34 56 Z" fill="#ffffff" />
          {/* Vertical Stem */}
          <path d="M 18 14 L 30 14 L 30 76 L 18 76 Z" fill="#ffffff" />

          {/* LETTER: O */}
          {/* Top Half */}
          <path d="M 82 42 L 82 26 A 12 12 0 0 1 94 14 L 126 14 A 12 12 0 0 1 138 26 L 138 42 L 126 42 L 126 28 A 4 4 0 0 0 122 24 L 98 24 A 4 4 0 0 0 94 28 L 94 42 Z" fill="#ffffff" />
          {/* Bottom Half */}
          <path d="M 82 48 L 94 48 L 94 62 A 4 4 0 0 0 98 66 L 122 66 A 4 4 0 0 0 126 62 L 126 48 L 138 48 L 138 64 A 12 12 0 0 1 126 76 L 94 76 A 12 12 0 0 1 82 64 Z" fill="#ffffff" />

          {/* LETTER: O */}
          {/* Top Half */}
          <path d="M 152 42 L 152 26 A 12 12 0 0 1 164 14 L 196 14 A 12 12 0 0 1 208 26 L 208 42 L 196 42 L 196 28 A 4 4 0 0 0 192 24 L 168 24 A 4 4 0 0 0 164 28 L 164 42 Z" fill="#ffffff" />
          {/* Bottom Half */}
          <path d="M 152 48 L 164 48 L 164 62 A 4 4 0 0 0 168 66 L 192 66 A 4 4 0 0 0 196 62 L 196 48 L 208 48 L 208 64 A 12 12 0 0 1 196 76 L 164 76 A 12 12 0 0 1 152 64 Z" fill="#ffffff" />

          {/* LETTER: T */}
          {/* Horizontal Top Bar */}
          <rect x="220" y="14" width="56" height="15" rx="3" fill="#ffffff" />
          {/* Vertical Stem */}
          <rect x="242" y="35" width="12" height="41" rx="2" fill="#ffffff" />

          {/* LETTER: B */}
          {/* Vertical Stem */}
          <rect x="288" y="14" width="12" height="62" rx="2" fill="#ffffff" />
          {/* Top Loop */}
          <path d="M 304 14 L 324 14 A 10 10 0 0 1 334 24 L 334 32 A 10 10 0 0 1 324 42 L 304 42 Z M 315 25 L 315 31 L 322 31 A 3 3 0 0 0 325 28 A 3 3 0 0 0 322 25 Z" fill="#ffffff" />
          {/* Bottom Loop */}
          <path d="M 304 48 L 326 48 A 10 10 0 0 1 336 58 L 336 66 A 10 10 0 0 1 326 76 L 304 76 Z M 315 58 L 315 66 L 324 66 A 4 4 0 0 0 328 62 A 4 4 0 0 0 324 58 Z" fill="#ffffff" />

          {/* LETTER: A */}
          {/* Left Leg */}
          <path d="M 346 76 L 366 14 L 377 14 L 357 76 Z" fill="#ffffff" />
          {/* Right Leg */}
          <path d="M 397 76 L 377 14 L 388 14 L 408 76 Z" fill="#ffffff" />
          {/* Stencil Crossbar */}
          <rect x="362" y="48" width="30" height="11" rx="2" fill="#ffffff" />

          {/* LETTER: L */}
          <path d="M 418 14 L 430 14 L 430 64 L 460 64 A 4 4 0 0 1 464 68 L 464 76 L 418 76 Z" fill="#ffffff" />

          {/* LETTER: L */}
          <path d="M 474 14 L 486 14 L 486 64 L 516 64 A 4 4 0 0 1 520 68 L 520 76 L 474 76 Z" fill="#ffffff" />

          {/* TRADEMARK: TM */}
          <text
            x="524"
            y="23"
            fill="#ffffff"
            fontSize="14"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            className="tracking-tight"
          >
            TM
          </text>
        </svg>
      </div>
    </div>
  );
}

/**
 * Backward compatibility spinner helper
 */
export function EFootballSpinner({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <EFootballLogo size={size < 80 ? 'sm' : 'default'} />
    </div>
  );
}

export default function LoadingState({ 
  message = 'eFootball Tournaments',
  className,
  fullPage = false 
}: LoadingStateProps) {

  const content = (
    <div className={cn(
      "relative flex flex-col items-center justify-center text-center select-none w-full",
      !fullPage && "py-14 md:py-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#040511]",
      className
    )}>
      {/* Stadium Photographic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${STADIUM_BG})` }}
      >
        {/* Dark Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#02030a]/95 via-[#030614]/75 to-[#02030a]/85" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-20 flex flex-col items-center px-4 max-w-lg">
        {/* 1. Official eFootball Konami Logo */}
        <EFootballLogo size={fullPage ? 'default' : 'sm'} />

        {/* 2. Sleek Konami Loading Beam - Clean without glow */}
        <div className="mt-7 md:mt-8 w-44 md:w-56 h-[3px] bg-slate-900 rounded-full overflow-hidden relative border border-slate-700/40">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#00d1ff] to-[#facc15]"
          />
        </div>

        {/* 3. Status Text / Message */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d1ff]" />
          <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.25em] text-white/90 italic">
            {message}
          </span>
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#02030a] overflow-hidden select-none">
        {content}
      </div>
    );
  }

  return content;
}
