import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { Link } from 'react-router-dom';
import { Tv, User, Search, RefreshCw, ArrowUpRight, Trophy, Play } from 'lucide-react';
import { cn, getPublicIdentity } from '../lib/utils';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';

export default function LiveStreams() {
  const { user, refetchSignal } = useAuth();
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isInitialLoad = React.useRef(true);

  const fetchStreams = async (showLoading = isInitialLoad.current) => {
    try {
      if (showLoading) setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('fixture_stream_urls')
        .select(`
          id,
          stream_url,
          updated_at,
          match_id,
          submitted_by,
          profiles:submitted_by ( username, avatar_url ),
          matches:match_id (
            status,
            round,
            stage,
            scheduled_at,
            player1:profiles!matches_player1_fkey ( id, username, avatar_url ),
            player2:profiles!matches_player2_fkey ( id, username, avatar_url ),
            tournaments:tournament_id ( name )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[Streams] Error fetching streams from Supabase:', error);
      } else {
        const rawStreams = data || [];
        // Only keep if the relationship matches properly
        setStreams(rawStreams.filter((s: any) => s.matches));
      }
    } catch (err) {
      console.error('[Streams] Unexpected exception retrieving streams:', err);
    } finally {
      if (showLoading) setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useRefetchOnFocus(fetchStreams);

  useEffect(() => {
    fetchStreams();

    const channel = supabase
      .channel('public-channel-streams')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fixture_stream_urls'
      }, () => {
        fetchStreams(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSignal]);

  const filteredStreams = streams.filter((stream) => {
    const sName = (stream.profiles?.username || '').toLowerCase();
    const tName = (stream.matches?.tournaments?.name || '').toLowerCase();
    const p1Name = (stream.matches?.player1?.username || '').toLowerCase();
    const p2Name = (stream.matches?.player2?.username || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      sName.includes(query) ||
      tName.includes(query) ||
      p1Name.includes(query) ||
      p2Name.includes(query)
    );
  });

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Tv className="w-8 h-8 text-red-500" /> Active Broadcasts
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Live streamed tournament battles and arena matches
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search streamer, player, or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border-main focus:border-primary/50 text-white rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none placeholder-slate-600 transition-colors"
              />
            </div>
            <button
              onClick={() => fetchStreams(true)}
              className="p-3 bg-surface border border-border-main hover:border-primary/30 rounded-2xl text-slate-400 hover:text-white transition-colors flex items-center justify-center shrink-0"
              title="Refresh Stream List"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Counts display banner */}
        {!loading && (
          <div className="flex items-center space-x-4 text-xs font-black uppercase tracking-wider bg-red-950/20 border border-red-900/30 px-5 py-3 rounded-2xl">
            <span className="text-red-500">{filteredStreams.length} Broadcasts Found</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-400">Want to stream? Connect on your Match Details panel!</span>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <LoadingState message="Connecting to broadcasts..." />
        ) : filteredStreams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredStreams.map((stream) => {
              const m = stream.matches;
              if (!m) return null;
              const p1Name = m.player1?.username || 'Player 1';
              const p2Name = m.player2?.username || 'Player 2';
              const tName = m.tournaments?.name || 'Tournament Event';
              const hostName = stream.profiles?.username || 'Anonymous Streamer';

              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 bg-zinc-950/40 hover:bg-zinc-950/60 transition-all border border-zinc-800/80 hover:border-red-500/40 rounded-3xl flex flex-col justify-between space-y-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors" />

                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2.5 py-1 bg-red-950/35 border border-red-900/40 rounded-md">
                        LIVE NOW
                      </span>
                    </div>
                    {stream.profiles?.avatar_url ? (
                      <div className="flex items-center space-x-2">
                        <img
                          src={stream.profiles.avatar_url}
                          alt={hostName}
                          className="w-5 h-5 rounded-full object-cover border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {hostName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Streamer: {hostName}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 z-10">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      {tName}
                    </p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      Round {m.round} • {m.stage || 'Playoff'} Range
                    </p>
                    <div className="h-0.5 bg-zinc-850/50 w-full" />
                    <p className="text-lg font-black text-white italic uppercase tracking-tight">
                      {p1Name} <span className="text-zinc-500 not-italic font-medium text-xs">VS</span> {p2Name}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between z-10">
                    <Link
                      to={`/matches/${m.id}`}
                      className="text-xs font-black text-zinc-400 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      Fixture Details
                    </Link>
                    <a
                      href={stream.stream_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary py-2 px-5 bg-red-600 border-red-500 hover:bg-red-500 hover:border-red-400 font-black text-xs uppercase italic flex items-center space-x-2 rounded-xl"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tune In</span>
                      <ArrowUpRight className="w-4 h-4 text-white/80" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 animate-fade-in card bg-surface border-border-main rounded-3xl">
            <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent blur-xl" />
              <Tv className="w-12 h-12 text-slate-700 relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">
              {searchQuery ? 'No Matching Broadcasts' : 'No Broadcasts Active'}
            </h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs leading-relaxed max-w-sm">
              {searchQuery
                ? 'Try adjusting your keywords to find existing matches.'
                : 'No players are currently broadcasting their matches live. Connect your twitch, kick, or youtube stream on your active match details room!'}
            </p>
            {!searchQuery && (
              <Link
                to="/matches"
                className="mt-8 px-8 py-3.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-500 hover:text-red-400 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all"
              >
                Go to my matches
              </Link>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
