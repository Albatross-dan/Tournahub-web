import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, ArrowLeft, Loader2, Trophy, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';
import { ChampionCardData } from '../types/champion';
import ChampionCard from '../components/tournament/ChampionCard';
import { toast } from 'react-hot-toast';
import { overrideTournamentChampion } from '../utils/tournamentOverrides';

export default function TournamentChampion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChampionCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inProgress, setInProgress] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportImage = async () => {
    if (!data) return;

    setExporting(true);
    const toastId = toast.loading('Preparing premium victory poster...');

    try {
      if (data.poster_ready && data.poster_image_url) {
        // Fetch the server-generated poster image as a blob
        const response = await fetch(data.poster_image_url);
        const blob = await response.blob();
        
        const fileExtension = data.poster_image_url.split('?')[0].split('.').pop() || 'png';
        const contentType = blob.type || `image/${fileExtension}`;
        const filename = `${data.winner.username}_victory_poster.${fileExtension}`;
        const file = new File([blob], filename, { type: contentType });

        // If Web Share API is available with file support, share it directly
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${data.winner.username} Victory Poster`,
            text: `Check out ${data.winner.username}'s victory in ${data.tournament_name}! 🏆 #Tournahub`,
          });
          toast.success('Shared successfully!', { id: toastId });
          return;
        }

        // Fallback: Trigger direct image download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast.success('Victory Poster downloaded successfully!', { id: toastId });
        return;
      }

      // Fallback for non-generated posters: Existing DOM screenshot logic
      const element = document.getElementById('story-capture-card');
      if (!element) {
        toast.error('Shareable story element not found', { id: toastId });
        return;
      }

      // Small timeout for browser repainting if needed
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#000000',
        quality: 0.95,
        pixelRatio: 1.0,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${data.winner.username}_victory_story.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${data.winner.username} Victory Story`,
            text: `Check out ${data.winner.username}'s victory in ${data.tournament_name}! 🏆 #Tournahub`,
          });
          toast.success('Shared successfully!', { id: toastId });
          return;
        }
      }

      const link = document.createElement('a');
      link.download = `${data.winner.username}_victory_story_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Victory Story downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to export story image:', err);
      toast.error('Failed to generate or share victory image.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const fetchChampionCard = async (tournamentId: string) => {
    try {
      let row: any = null;

      // 1. Try calling the RPC get_tournament_champion_card first
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_tournament_champion_card', { tournament_id: tournamentId });

      if (!rpcError && rpcData) {
        row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      }

      // 2. Fallback to direct table query
      if (!row) {
        if (rpcError) {
          console.warn('RPC get_tournament_champion_card failed or not found, falling back to direct table select:', rpcError);
        }
        const { data: champRow, error: tableError } = await supabase
          .from('tournament_champions')
          .select('*')
          .eq('tournament_id', tournamentId)
          .maybeSingle();

        if (tableError) {
          console.error('Table fallback query failed:', tableError);
          throw tableError;
        }
        row = champRow;
      }

      if (row) {
        row = overrideTournamentChampion(tournamentId, row);
      }

      if (!row) {
        setInProgress(true);
      } else {
        const metadata = row.declaration_metadata || {};
        const mappedData: ChampionCardData = {
          champion_id: row.id,
          tournament_id: row.tournament_id,
          tournament_name: row.tournament_name,
          tournament_type: row.tournament_type as any,
          is_paid: row.is_paid,
          champion_title: (row.champion_title || 'Tournament Champion') as any,
          prize_pool: row.prize_pool || 0,
          prize_currency: (row.prize_currency || 'USD') as any,
          winnings_awarded: !!row.winnings_awarded,
          final_match_id: row.final_match_id,
          completed_at: row.completed_at,
          declared_at: row.declared_at,
          winner: {
            id: row.winner_id,
            username: row.winner_username,
            avatar_url: row.winner_avatar_url,
            badge_id: row.winner_badge_id,
            score: row.winner_score,
            prize_amount: row.winner_prize_amount || 0,
          },
          runner_up: row.runner_up_id ? {
            id: row.runner_up_id,
            username: row.runner_up_username || '',
            avatar_url: row.runner_up_avatar_url,
            badge_id: row.runner_up_badge_id,
            score: row.runner_up_score,
            prize_amount: row.runner_up_prize_amount || 0,
          } : null,
          meta: {
            tournament_category: metadata.tournament_category || 'Pro',
            max_players: metadata.max_players || 0,
            prize_1st_pct: metadata.prize_1st_pct || 60,
            prize_2nd_pct: metadata.prize_2nd_pct || 30,
          },
          poster_image_url: row.poster_image_url,
          poster_ready: !!row.poster_ready,
          poster_theme: row.poster_theme
        };
        setData(mappedData);
        setInProgress(false);
      }
    } catch (err) {
      console.error('Error fetching champion card:', err);
      toast.error('Failed to load champion information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchChampionCard(id);

      // Subscribe to realtime changes
      const channel = supabase
        .channel(`tournament-champion-${id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_champions',
          filter: `tournament_id=eq.${id}`
        }, () => {
          fetchChampionCard(id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const handleShare = () => {
    const url = `${window.location.origin}/champion/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm animate-pulse uppercase tracking-widest">
          Resolving Championship Results...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 selection:bg-primary/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-20 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-xs uppercase tracking-wider">Back</span>
        </button>

        {data && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span className="font-mono text-xs uppercase tracking-wider">Copy Link</span>
            </button>
            <button 
              onClick={handleExportImage}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-slate-900 font-bold shadow-[0_0_20px_rgba(0,209,255,0.3)] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span className="font-mono text-xs uppercase tracking-wider">Share Victory</span>
            </button>
          </div>
        )}
      </nav>

      <main className="relative z-10 p-6 pt-12 max-w-7xl mx-auto flex flex-col items-center">
        <AnimatePresence mode="wait">
          {inProgress ? (
            <motion.div 
              key="in-progress"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center text-center max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2rem] p-12"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative bg-slate-900 border border-slate-700 w-24 h-24 rounded-3xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <Trophy className="w-12 h-12 text-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-display uppercase tracking-wider mb-4">Tournament in Progress</h2>
              <p className="text-slate-400 font-mono text-sm leading-relaxed mb-8">
                The championship has not been declared yet. Stay tuned as we resolve the final standings and crown our champion.
              </p>
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-xs uppercase tracking-widest font-bold">Waiting for Declaration...</span>
              </div>
            </motion.div>
          ) : data ? (
            <motion.div 
              key="champion-card"
              className="w-full flex justify-center py-12"
            >
              <ChampionCard data={data} />
            </motion.div>
          ) : (
            <div className="text-center py-24">
              <p className="text-slate-500 font-mono italic">No championship data available for this tournament.</p>
            </div>
          )}
        </AnimatePresence>

        {/* Brand signature */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-12 text-slate-800 font-display text-8xl tracking-tighter select-none pointer-events-none opacity-20"
        >
          TOURNAHUB
        </motion.div>
      </main>
    </div>
  );
}
