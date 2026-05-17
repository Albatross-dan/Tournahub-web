import React, { useState, useEffect, useCallback } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Loader2, ShieldCheck, AlertTriangle, Check, RefreshCw, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { PlayerBadge } from '../ui/PlayerBadge';

interface Badge {
  badge_id: string;
  is_taken: boolean;
  is_mine: boolean;
}

interface UserBadge {
  has_badge: boolean;
  badge_id: string | null;
}

interface BadgeSelectorProps {
  tournamentId: string;
  onSelect?: (badgeId: string) => void;
  tournamentStatus?: string;
  mode?: 'registration' | 'management';
}

export default function BadgeSelector({ 
  tournamentId, 
  onSelect, 
  tournamentStatus, 
  mode = 'management' 
}: BadgeSelectorProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadge, setUserBadge] = useState<UserBadge>({ has_badge: false, badge_id: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const [myBadge, badgeList] = await Promise.all([
        tournamentService.getMyBadge(tournamentId),
        tournamentService.listBadgesForPicker(tournamentId)
      ]);

      setUserBadge(myBadge);
      setBadges(badgeList || []);
    } catch (err: any) {
      console.error('Error loading badges:', err);
      setError(err.message || 'Failed to load badges');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadData();

    // Realtime subscription to badge selections
    const channel = supabase
      .channel(`badge-picker-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_badge_selections',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        // Debounce or just reload
        loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, loadData]);

  async function handleBadgeSelection(badgeId: string, isMine: boolean, isTaken: boolean) {
    if (actionLoading || (isTaken && !isMine)) return;
    
    // In registration mode, we just pass the selection up
    if (mode === 'registration') {
      if (onSelect) onSelect(badgeId);
      return;
    }

    if (isMine || (mode === 'management' && userBadge.has_badge)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const result = await tournamentService.selectBadge(tournamentId, badgeId, true);
      
      if (result.success) {
        setUserBadge({ has_badge: true, badge_id: badgeId });
        if (onSelect) onSelect(badgeId);
        await loadData(false);
      }
    } catch (err: any) {
      console.error('Badge selection error:', err);
      setError(err.message || 'Failed to select badge. It might have been taken just now.');
      await loadData(false);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse text-center">Syncing Arena Badges...</p>
      </div>
    );
  }

  const isSelectableStatus = ['registration_open', 'registration_closed', 'seeding'].includes(tournamentStatus || '');

  return (
    <div className="space-y-8 bg-black/40 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden" id="badge-picker-section">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            {userBadge.has_badge ? 'Selected' : 'Choose Your'} <span className="text-primary underline decoration-primary/30 underline-offset-4">Identity</span>
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-11">
            {userBadge.has_badge ? 'Your identification is confirmed for this arena' : 'Claim a unique team badge before others take it'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-red-500/10 border-2 border-red-500/20 rounded-3xl flex flex-col items-center gap-4 text-red-500 animate-in fade-in slide-in-from-top-4 relative z-10">
          <AlertTriangle className="w-8 h-8 opacity-50" />
          <div className="text-center">
            <p className="text-sm font-black uppercase italic tracking-tight">{error}</p>
            <button 
              onClick={() => loadData()}
              className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 underline underline-offset-4"
            >
              Retry Sync
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10">
        {mode === 'management' && userBadge.has_badge ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-12 bg-primary/5 rounded-[3rem] border-2 border-primary/20 relative overflow-hidden group mb-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.15)_0%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-40 h-40 relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full animate-pulse" />
              <PlayerBadge 
                badgeId={userBadge.badge_id} 
                username="Your Identity" 
                size="xl"
                className="w-full h-full relative z-10 drop-shadow-[0_0_30px_rgba(0,209,255,0.5)] transform scale-110 !bg-transparent !border-none !shadow-none"
              />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-500 text-black rounded-full flex items-center justify-center shadow-xl z-20 border-4 border-black">
                <Check className="w-6 h-6 stroke-[4]" />
              </div>
            </div>
            <div className="space-y-2 text-center relative z-10">
              <p className="text-sm font-black text-white uppercase italic tracking-[0.3em]">Identity Locked</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest opacity-75">Your choice is final for this tournament</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {badges.map((badge, idx) => (
                <motion.button
                  key={badge.badge_id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  onClick={() => handleBadgeSelection(badge.badge_id, badge.is_mine, badge.is_taken)}
                  disabled={actionLoading || (!isSelectableStatus && mode === 'management') || (badge.is_taken && !badge.is_mine)}
                  className={cn(
                    "relative aspect-square rounded-[1.5rem] flex items-center justify-center p-4 transition-all border-2 group shadow-xl",
                    badge.is_mine 
                      ? "bg-primary/10 border-primary scale-105" 
                      : badge.is_taken 
                        ? "bg-zinc-900/20 border-zinc-900 grayscale opacity-40 cursor-not-allowed" 
                        : "bg-zinc-900/50 border-zinc-800 hover:border-primary hover:bg-primary/10 hover:scale-105 active:scale-95"
                  )}
                  title={badge.is_taken && !badge.is_mine ? "Taken" : undefined}
                >
                  {actionLoading && !badge.is_taken && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  )}
                  
                  <PlayerBadge 
                    badgeId={badge.badge_id} 
                    username={badge.is_mine ? "Yours" : badge.badge_id} 
                    size="lg"
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl brightness-90 group-hover:brightness-110 transition-all border-none shadow-none"
                  />

                  {badge.is_mine && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-black rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-black">
                      <Check className="w-4 h-4 stroke-[4]" />
                    </div>
                  )}

                  {badge.is_taken && !badge.is_mine && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <Lock className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {badges.filter(b => !b.is_taken).length === 0 && !userBadge.has_badge && !loading && (
          <div className="py-24 text-center bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[3rem] space-y-6">
            <div className="relative inline-block">
              <ShieldCheck className="w-20 h-20 text-zinc-900 mx-auto" />
              <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-zinc-600 uppercase italic tracking-tighter">Depletion Detected</p>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest max-w-[200px] mx-auto">
                No badges found for this tournament configuration
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual refresh button for better user agency */}
      <div className="flex justify-center pt-4 relative z-10">
        <button 
          onClick={() => loadData()}
          className="text-[9px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Refresh Vault
        </button>
      </div>

      {(!isSelectableStatus || (mode === 'management' && userBadge.has_badge)) && !userBadge.has_badge && (
        <div className="p-8 bg-zinc-900/50 border-2 border-zinc-800 rounded-[2.5rem] text-center relative z-10">
          <p className="text-xs font-black text-slate-500 uppercase italic tracking-[0.2em]">Deployment Phase Ended</p>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Badge selection is locked for this event</p>
        </div>
      )}
    </div>
  );
}
