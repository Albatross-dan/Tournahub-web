import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface FullScreenImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
}

export default function FullScreenImageViewer({
  imageUrl,
  isOpen,
  onClose,
  caption
}: FullScreenImageViewerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-10 max-w-full max-h-full flex flex-col items-center"
          >
            <div className="relative group">
              <img 
                src={imageUrl} 
                alt="Full focus" 
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <button 
                onClick={onClose}
                className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {caption && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-white text-lg font-black italic uppercase tracking-tighter"
              >
                {caption}
              </motion.p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
