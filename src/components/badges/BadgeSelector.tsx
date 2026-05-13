import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn, getStorageUrl } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Badge {
  id: string;
  name: string;
  image_url: string;
  is_available: boolean;
}

interface BadgeSelectorProps {
  tournamentId: string;
  onSelect: (badgeId: string) => void;
  selectedBadgeId: string | null;
}

export default function BadgeSelector({ tournamentId, onSelect, selectedBadgeId }: BadgeSelectorProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBadges();
  }, [tournamentId]);

  async function loadBadges() {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Get all files in the bucket
      const { data: allFiles, error: storageError } = await supabase.storage.from('team-badges').list();
      if (storageError) throw storageError;

      // 2. Get available IDs from RPC
      const { data: availableData, error: rpcError } = await (supabase as any).rpc('list_available_badges_for_tournament_default_bucket', {
        p_tournament_id: tournamentId
      });

      if (rpcError) {
        console.warn('RPC list_available_badges_for_tournament_default_bucket failed, showing all as selectable:', rpcError);
      }

      // availableData is likely [{ badge_id: "filename.png" }, ...] or string[]
      const availableIds = new Set((availableData || []).map((item: any) => 
        typeof item === 'string' ? item : (item.badge_id || item.id || item.name)
      ));

      // 3. Map all files to the Badge interface
      // Filtering out system folders/hidden files
      const transformedBadges = (allFiles || [])
        .filter(file => !file.name.startsWith('.') && file.name !== '.emptyFolderPlaceholder')
        .map(file => ({
          id: file.name, // The filename is the ID
          name: file.name.split('.')[0].replace(/[-_]/g, ' '), // Pretty name from filename
          image_url: file.name,
          is_available: availableIds.size === 0 || availableIds.has(file.name)
        }));
      
      setBadges(transformedBadges);
    } catch (err: any) {
      console.error('Error loading available badges:', err);
      setError('Failed to load available badges. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scanning Available Badges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-500">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
          <button 
            onClick={loadBadges}
            className="text-[10px] underline uppercase font-black mt-1"
          >
            Retry Scan
          </button>
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl">
        <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase italic">No traditional badges available for this tournament.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Select Your Badge</h3>
        <span className="text-[10px] font-bold text-primary uppercase">Exclusive to Tournament</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <AnimatePresence>
          {badges.map((badge, idx) => {
            const isSelected = selectedBadgeId === badge.id;
            const isAvailable = badge.is_available;
            
            return (
              <motion.button
                key={`${badge.id}-${idx}`}
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={isAvailable ? { y: -4, scale: 1.05 } : {}}
                whileTap={isAvailable ? { scale: 0.95 } : {}}
                onClick={() => isAvailable && onSelect(badge.id)}
                disabled={!isAvailable}
                className={cn(
                  "relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all border-2",
                  isSelected 
                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/20" 
                    : isAvailable 
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
                      : "bg-slate-950 border-slate-900 opacity-40 grayscale pointer-events-none"
                )}
              >
                <div className="w-full h-full flex items-center justify-center relative">
                  {badge.image_url ? (
                    <BadgeImage 
                      url={badge.image_url} 
                      name={badge.name} 
                      isAvailable={isAvailable} 
                    />
                  ) : (
                    <ShieldCheck className={cn("w-8 h-8", isAvailable ? "text-slate-700" : "text-slate-900")} />
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 shadow-xl">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">TAKEN</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-slate-950 rounded-full flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-3 h-3 fill-current" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      
      {!selectedBadgeId && (
        <p className="text-[10px] text-amber-500/80 font-bold uppercase italic animate-pulse">
           * A unique badge is required to finalize your registration.
        </p>
      )}
    </div>
  );
}

function BadgeImage({ url, name, isAvailable }: { url: string; name: string; isAvailable: boolean }) {
  const [error, setError] = useState(false);
  const imageUrl = getStorageUrl('team-badges', url);

  if (error || !imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-1 text-center">
        <ShieldCheck className={cn("w-6 h-6 mb-1", isAvailable ? "text-slate-700" : "text-slate-900")} />
        <span className="text-[7px] font-black text-slate-500 uppercase leading-tight line-clamp-2">{name}</span>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={name}
      className={cn(
        "w-[80%] h-[80%] object-contain drop-shadow-xl transition-all",
        !isAvailable && "opacity-20 contrast-50"
      )}
      onError={() => setError(true)}
    />
  );
}
