import React, { useState, useEffect, useRef } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, formatFixtureTime, getPublicIdentity, getStorageUrl } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { PlayerBadge } from '../ui/PlayerBadge';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { Calendar, Trophy, Share2, Grid, List, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DownloadHeader, DownloadFooter } from '../common/DownloadShareAction';
import { toPng } from 'html-to-image';
import { toast } from 'react-hot-toast';

interface FixturesListProps {
  tournamentId: string;
}

export default function FixturesList({ tournamentId }: FixturesListProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { refreshCount } = useMatchCompletionSync(tournamentId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDownloadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchMatchesAndTournament();

    const channel = supabase
      .channel(`fixtures-badges-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchMatchesAndTournament();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshCount]);

  async function fetchMatchesAndTournament() {
    try {
      const [matchesData, tournamentData, dbMatchesRes] = await Promise.all([
        tournamentService.getFixturesWithBadges(tournamentId).catch(() => []),
        tournamentService.getById(tournamentId).catch(() => null),
        supabase.from('matches').select('id, leg').eq('tournament_id', tournamentId).then(res => res, () => ({ data: [] }))
      ]);
      const rawMatches = matchesData || [];
      const legMap = new Map<string, number>();
      if (dbMatchesRes?.data) {
        dbMatchesRes.data.forEach((m: any) => {
          if (m.id && m.leg) {
            legMap.set(m.id, m.leg);
          }
        });
      }
      const seenIds = new Set();
      const uniqueMatches = [];
      for (const m of rawMatches) {
        if (!m) continue;
        const mId = m.match_id || m.id;
        const leg = m.leg ?? (mId ? legMap.get(mId) : undefined) ?? 1;
        const updatedMatch = { ...m, leg };
        if (mId) {
          if (!seenIds.has(mId)) {
            seenIds.add(mId);
            uniqueMatches.push(updatedMatch);
          }
        } else {
          uniqueMatches.push(updatedMatch);
        }
      }
      setMatches(uniqueMatches);
      setTournament(tournamentData);
    } catch (err) {
      console.error('Error fetching matches or tournament:', err);
    } finally {
      setLoading(false);
    }
  }

  const captureElement = async (elementId: string, fileName: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element not found: ${elementId}`);
      return false;
    }

    // Save original styles & classes
    const originalStyle = element.getAttribute('style') || '';
    const originalClassList = [...element.classList];

    // Locate pre-rendered header and footer inside this specific container
    const headers = element.querySelectorAll('.download-header');
    const footers = element.querySelectorAll('.download-footer');

    try {
      // Temporarily reveal header and footer
      headers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });
      footers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });

      // Force high-contrast styling for screenshot capture
      element.classList.add('bg-[#09090b]', 'text-white', 'p-6', 'rounded-2xl', 'border', 'border-white/10');
      
      // Expand width & layout to keep it beautifully structured & readable
      element.style.width = '800px';
      element.style.minWidth = '800px';
      element.style.maxWidth = 'none';
      element.style.overflow = 'visible';
      element.style.transform = 'scale(1)';

      // Let rendering engine repaint
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#09090b',
        quality: 0.95,
        pixelRatio: 1.5,
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node: HTMLElement) => {
          const tag = node.tagName || '';
          if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'STYLE') return false;
          return true;
        },
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: '800px',
        }
      });

      // Restore original styling
      element.setAttribute('style', originalStyle);
      element.className = "";
      originalClassList.forEach(cls => element.classList.add(cls));

      // Hide header and footer again
      headers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });
      footers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });

      // Trigger download
      const link = document.createElement('a');
      link.download = `${fileName}_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (err) {
      console.error('Image capture error:', err);
      // Restore styles in case of error
      try {
        element.setAttribute('style', originalStyle);
        element.className = "";
        originalClassList.forEach(cls => element.classList.add(cls));
        headers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
        footers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
      } catch (cleanErr) {
        console.error('Clean up error:', cleanErr);
      }
      return false;
    }
  };

  const handleDownloadRound = async (roundKey: string) => {
    if (isDownloading) return;
    const found = allRoundsList.find(r => r.key === roundKey);
    if (!found) {
      toast.error("Selected round not found.");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading(`Generating image for ${found.roundLabel}...`);

    const elementId = `fixture-round-${roundKey.replace(/\|\|/g, '-').replace(/\s+/g, '-')}`;
    const cleanFileName = `${tournament?.name || 'tournament'}_${found.stage}_${found.roundLabel.replace(/\s+/g, '_')}`.toLowerCase();
    
    const success = await captureElement(elementId, cleanFileName, found.roundLabel);
    
    if (success) {
      toast.success(`${found.roundLabel} downloaded successfully!`, { id: toastId });
    } else {
      toast.error(`Failed to download ${found.roundLabel}.`, { id: toastId });
    }
    setIsDownloading(false);
  };

  const handleDownloadAllRounds = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const toastId = toast.loading("Preparing all rounds for download...");

    try {
      for (let i = 0; i < allRoundsList.length; i++) {
        const round = allRoundsList[i];
        toast.loading(`Downloading ${round.roundLabel} (${i + 1}/${allRoundsList.length})...`, { id: toastId });
        
        const elementId = `fixture-round-${round.key.replace(/\|\|/g, '-').replace(/\s+/g, '-')}`;
        const cleanFileName = `${tournament?.name || 'tournament'}_${round.stage}_${round.roundLabel.replace(/\s+/g, '_')}`.toLowerCase();
        
        await captureElement(elementId, cleanFileName, round.roundLabel);
        
        if (i < allRoundsList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
      toast.success("All rounds downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Failed to download all rounds:", err);
      toast.error("Failed to export all rounds.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareRound = async (roundKey: string) => {
    if (isDownloading) return;
    const found = allRoundsList.find(r => r.key === roundKey);
    if (!found) {
      toast.error("Selected round not found.");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading(`Preparing ${found.roundLabel} for sharing...`);

    const elementId = `fixture-round-${roundKey.replace(/\|\|/g, '-').replace(/\s+/g, '-')}`;
    const cleanFileName = `${tournament?.name || 'tournament'}_${found.stage}_${found.roundLabel.replace(/\s+/g, '_')}`.toLowerCase();
    
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error("Target content could not be located.", { id: toastId });
      setIsDownloading(false);
      return;
    }

    // Save original styles & classes
    const originalStyle = element.getAttribute('style') || '';
    const originalClassList = [...element.classList];

    // Locate pre-rendered header and footer
    const headers = element.querySelectorAll('.download-header');
    const footers = element.querySelectorAll('.download-footer');

    try {
      // Temporarily reveal header and footer
      headers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });
      footers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });

      // Force high-contrast styling for screenshot capture
      element.classList.add('bg-[#09090b]', 'text-white', 'p-6', 'rounded-2xl', 'border', 'border-white/10');
      
      // Expand width & layout
      element.style.width = '800px';
      element.style.minWidth = '800px';
      element.style.maxWidth = 'none';
      element.style.overflow = 'visible';
      element.style.transform = 'scale(1)';

      // Let rendering engine repaint
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#09090b',
        quality: 0.95,
        pixelRatio: 1.5,
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node: HTMLElement) => {
          const tag = node.tagName || '';
          if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'STYLE') return false;
          return true;
        },
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: '800px',
        }
      });

      // Restore original styling
      element.setAttribute('style', originalStyle);
      element.className = "";
      originalClassList.forEach(cls => element.classList.add(cls));

      // Hide header and footer again
      headers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });
      footers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });

      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${cleanFileName}.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${tournament?.name || "Tournament"} - ${found.roundLabel}`,
            text: `Check out the ${found.roundLabel} fixtures for ${tournament?.name || "Tournament"} on Tournahub! 🏆`,
          });
          toast.success("Shared successfully!", { id: toastId });
        } else {
          // Fallback to download
          const link = document.createElement('a');
          link.download = `${cleanFileName}_${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("Downloaded successfully! (Direct sharing not supported)", { id: toastId });
        }
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = `${cleanFileName}_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Downloaded successfully! (Direct sharing not supported)", { id: toastId });
      }
    } catch (err) {
      console.error('Image capture/share error:', err);
      try {
        element.setAttribute('style', originalStyle);
        element.className = "";
        originalClassList.forEach(cls => element.classList.add(cls));
        headers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
        footers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
      } catch (cleanErr) {
        console.error('Clean up error:', cleanErr);
      }
      toast.error("Failed to share image. Please try again.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 bg-surface border-border-main text-center shadow-sm">
        <LoadingState message="Mapping Brackets..." />
      </div>
    );
  }

  const isKnockout = tournament?.type === 'knockout';

  const hasSecondLeg = tournament?.type === 'league' && matches.some(f => f.leg === 2);
  let maxLeg1Round = 0;
  if (hasSecondLeg) {
    matches.forEach(m => {
      if (m.leg === 1 && m.round > maxLeg1Round) {
        maxLeg1Round = m.round;
      }
    });
  }

  // Group matches by stage and round
  const groupedMatches = matches.reduce((acc: any, match) => {
    let stage = match.stage || 'knockout';
    
    let roundLabel = 'General';
    if (match.round) {
      const isPlayoffs = stage === 'playoffs' || stage === 'playoff' || stage === 'play_off';
      if (isPlayoffs) {
        const rNum = Number(match.round);
        if (rNum === 1) roundLabel = 'Quarter Final';
        else if (rNum === 2) roundLabel = 'Semi Final';
        else if (rNum === 3) roundLabel = 'Final';
        else roundLabel = `Round ${match.round}`;
      } else {
        if (hasSecondLeg && stage === 'league') {
          if (match.leg === 2) {
            stage = 'league_second_leg';
            const matchdayWithinLeg = match.round - maxLeg1Round;
            roundLabel = `Matchday ${matchdayWithinLeg}`;
          } else {
            stage = 'league_first_leg';
            roundLabel = `Matchday ${match.round}`;
          }
        } else {
          if (stage === 'league') {
            roundLabel = `Matchday ${match.round}`;
          } else {
            roundLabel = `Round ${match.round}`;
          }
        }
      }
    }

    if (!acc[stage]) acc[stage] = {};
    if (!acc[stage][roundLabel]) acc[stage][roundLabel] = [];
    acc[stage][roundLabel].push(match);
    return acc;
  }, {});

  const dataStages = Object.keys(groupedMatches);
  const stagesInOrderPredefined = ['group', 'group_stage', 'league_first_leg', 'league_second_leg', 'league', 'knockout', 'main', 'quarterfinal', 'semifinal', 'final'];
  
  const stagesInOrder = [
    ...stagesInOrderPredefined.filter(s => dataStages.includes(s)),
    ...dataStages.filter(s => !stagesInOrderPredefined.includes(s))
  ];

  // List of all rounds in order
  const allRoundsList: { stage: string; roundLabel: string; key: string }[] = [];
  stagesInOrder.forEach(stage => {
    if (groupedMatches[stage]) {
      Object.keys(groupedMatches[stage]).forEach(roundLabel => {
        allRoundsList.push({
          stage,
          roundLabel,
          key: `${stage}||${roundLabel}`
        });
      });
    }
  });

  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;

  return (
    <div className="space-y-6">
      {matches.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
          {/* Round selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
            <button
              onClick={() => setSelectedRound('all')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all shrink-0 cursor-pointer",
                selectedRound === 'all'
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/15 hover:text-slate-200"
              )}
            >
              All Rounds
            </button>
            {allRoundsList.map(r => (
              <button
                key={r.key}
                onClick={() => setSelectedRound(r.key)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all shrink-0 cursor-pointer",
                  selectedRound === r.key
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/15 hover:text-slate-200"
                )}
              >
                {r.stage === 'league_first_leg' ? `First Leg — ${r.roundLabel}` :
                 r.stage === 'league_second_leg' ? `Second Leg — ${r.roundLabel}` :
                 r.stage !== 'knockout' && r.stage !== 'main' ? `${r.stage.replace('_', ' ')} - ${r.roundLabel}` : r.roundLabel}
              </button>
            ))}
          </div>

          {/* Action buttons (Download & Share) */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 relative">
            {/* Download Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-200 border border-white/5 hover:border-primary/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-primary" />
                )}
                <span>Download options</span>
                <span className="text-slate-500 text-[9px] ml-1">▼</span>
              </button>
              
              {downloadDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-950 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                  {/* Option 1: Current Round */}
                  {selectedRound !== 'all' ? (
                    (() => {
                      const currentRoundObj = allRoundsList.find(r => r.key === selectedRound);
                      return (
                        <button
                          onClick={() => {
                            setDownloadDropdownOpen(false);
                            handleDownloadRound(selectedRound);
                          }}
                          disabled={isDownloading}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors flex flex-col gap-0.5 border-b border-white/5"
                        >
                          <span className="text-primary font-black uppercase tracking-wider flex items-center gap-1.5">
                            📥 Download {currentRoundObj?.roundLabel || 'Current Round'}
                          </span>
                          <span className="text-[10px] text-slate-400">Export only the currently selected round fixtures</span>
                        </button>
                      );
                    })()
                  ) : (
                    <button
                      onClick={() => {
                        setDownloadDropdownOpen(false);
                        // Default to first round if viewing 'all'
                        if (allRoundsList.length > 0) {
                          handleDownloadRound(allRoundsList[0].key);
                        }
                      }}
                      disabled={isDownloading || allRoundsList.length === 0}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors flex flex-col gap-0.5 border-b border-white/5"
                    >
                      <span className="text-primary font-black uppercase tracking-wider flex items-center gap-1.5">
                        📥 Download Current Round
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {allRoundsList.length > 0 ? `Export ${allRoundsList[0].roundLabel} fixtures` : 'Export active round'}
                      </span>
                    </button>
                  )}

                  {/* Option 2: Full Fixtures */}
                  <button
                    onClick={() => {
                      setDownloadDropdownOpen(false);
                      handleDownloadAllRounds();
                    }}
                    disabled={isDownloading || allRoundsList.length === 0}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-[#10b981] font-black uppercase tracking-wider flex items-center gap-1.5">
                      📥 Download Full Fixtures
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Exports each of the {allRoundsList.length} rounds as a separate image
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Button (Current Round) */}
            {canShare && (
              <button
                onClick={() => {
                  const targetRoundKey = selectedRound !== 'all' ? selectedRound : (allRoundsList[0]?.key || '');
                  if (targetRoundKey) {
                    handleShareRound(targetRoundKey);
                  } else {
                    toast.error("No fixtures to share.");
                  }
                }}
                disabled={isDownloading}
                className="h-9 w-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/5 hover:border-primary/30 transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                title="Share Current Round"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-[#10b981]" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-12">
        {stagesInOrder.map(stage => {
          if (!groupedMatches[stage]) return null;

          // Only show rounds that match selection
          const visibleRounds = Object.entries(groupedMatches[stage]).filter(([roundLabel]) => {
            const roundKey = `${stage}||${roundLabel}`;
            return selectedRound === 'all' || selectedRound === roundKey;
          });

          if (visibleRounds.length === 0) return null;

          return (
            <div key={stage} className="space-y-6">
              <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter border-l-4 border-primary pl-4">
                {stage === 'league_first_leg' ? 'First Leg' :
                 stage === 'league_second_leg' ? 'Second Leg' :
                 `${stage.replace('_', ' ')} Stage`}
              </h3>
              
              {visibleRounds.map(([roundLabel, roundMatches]: [string, any]) => {
                const roundKey = `${stage}||${roundLabel}`;
                return (
                  <div 
                    key={roundLabel} 
                    id={`fixture-round-${roundKey.replace(/\|\|/g, '-').replace(/\s+/g, '-')}`}
                    className="p-6 bg-surface border border-border-main rounded-2xl space-y-6 animate-in fade-in duration-200"
                  >
                    {/* Image download header */}
                    <DownloadHeader 
                      tournamentName={tournament?.name || "Tournament"} 
                      title={
                        stage === 'league_first_leg' ? `First Leg — ${roundLabel}` :
                        stage === 'league_second_leg' ? `Second Leg — ${roundLabel}` :
                        stage !== 'knockout' && stage !== 'main' ? `${stage.replace('_', ' ')} Stage - ${roundLabel}` : roundLabel
                      }
                      logoUrl={tournament?.banner_url ? getStorageUrl('tournament-banners', tournament.banner_url) : undefined}
                    />

                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-2 mb-2">
                      {roundLabel}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roundMatches.map((match: any, idx: number) => (
                        <motion.div
                          key={`${match.match_id || match.id || idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="card p-5 bg-surface border-border-main hover:border-primary/30 transition-all group shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                              match.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                            )}>
                              {match.status}
                            </span>
                            <div className="flex items-center text-text-muted space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {match.scheduled_date && match.scheduled_time 
                                  ? formatFixtureTime(match.scheduled_date, match.scheduled_time, match.timezone)
                                  : (match.scheduled_at ? formatDate(match.scheduled_at) : 'Time TBD')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4 overflow-hidden">
                            <PlayerCard 
                              username={match.player1_username} 
                              badgeId={match.player1_badge_id}
                              score={match.score1}
                              align="left"
                              isWinner={match.status === 'completed' && match.score1 > match.score2}
                            />
                            <div className="shrink-0 flex flex-col items-center justify-center px-1">
                              <div className="text-[8px] md:text-[10px] font-black text-text-muted opacity-40 bg-background px-2 py-0.5 md:py-1 rounded-full italic">VS</div>
                            </div>
                            <PlayerCard 
                              username={match.player2_username} 
                              badgeId={match.player2_badge_id} 
                              score={match.score2}
                              align="right"
                              isWinner={match.status === 'completed' && match.score2 > match.score1}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Image download footer */}
                    <DownloadFooter />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {matches.length === 0 && (
        <div className="py-20 text-center text-text-muted italic border-2 border-dashed border-border-main rounded-3xl">
          No fixtures scheduled yet for this tournament.
        </div>
      )}
    </div>
  );
}

function PlayerCard({ 
  username, 
  badgeId, 
  score, 
  align, 
  isWinner 
}: { 
  username: string | null; 
  badgeId: string | null; 
  score: number | null; 
  align: 'left' | 'right'; 
  isWinner?: boolean;
}) {
  const isLeft = align === 'left';
  
  return (
    <div className={cn(
      "flex items-center gap-2 md:gap-3 min-w-0", 
      !isLeft && "flex-row-reverse text-right"
    )}>
      <PlayerBadge 
        badgeId={badgeId} 
        username={username || 'TBD'} 
        size="md"
        className={cn(
          "w-10 h-10 md:w-14 md:h-14 rounded-xl border-2 transition-all",
          isWinner ? "border-primary shadow-lg shadow-primary/20" : "border-border-main"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn(
          "font-black text-[9px] md:text-xs uppercase italic tracking-tighter truncate leading-tight",
          isWinner ? "text-primary" : "text-text-muted"
        )}>
          {getPublicIdentity(username) || 'TBD'}
        </p>
        {(score !== null && score !== undefined) ? (
          <p className="text-xl md:text-3xl font-black text-text-main italic tracking-tighter leading-none mt-1">
            {score}
          </p>
        ) : (
          <div className="h-4 md:h-6" />
        )}
      </div>
    </div>
  );
}
