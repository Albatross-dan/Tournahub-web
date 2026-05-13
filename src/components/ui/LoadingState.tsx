import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export default function LoadingState({ 
  message = "INITIALIZING...", 
  className,
  fullPage = false 
}: LoadingStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-6",
      !fullPage && "py-20",
      className
    )}>
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-t-2 border-r-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
        />
        <Loader2 className="w-8 h-8 text-primary animate-spin absolute inset-0 m-auto" />
      </div>
      <div className="space-y-1 text-center">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-[0.3em]"
        >
          {message}
        </motion.p>
        <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-auto" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
