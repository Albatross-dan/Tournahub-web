import React, { useState, useEffect } from 'react';
import { matchService } from '../services/matchService';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Match } from '../types/database';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { Link } from 'react-router-dom';
import { Gamepad2, Timer, ArrowRight, Trophy, Clock, ClipboardList, MessageSquare, ChevronRight, User, Calendar } from 'lucide-react';
import { cn, getPublicIdentity, formatDate } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import { formatDistanceToNow } from 'date-fns';
import VerificationStatusBadge from '../components/match/VerificationStatusBadge';
import VerificationStatusBanner from '../components/match/VerificationStatusBanner';
import { VerificationStatus } from '../types/verification.types';
import { motion, AnimatePresence } from 'motion/react';

export default function Matches() {
  const { user, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'chat'>('matches');

  const fetchData = () => {
    if (!user) return;
    if (activeTab === 'matches') {
      loadMatches(false);
    } else {
      loadConversations(false);
    }
  };

  useRefetchOnFocus(fetchData);

  useEffect(() => {
    isInitialLoad.current = true;
    if (!user?.id) return;
    
    if (activeTab === 'matches') {
      loadMatches();
    } else {
      loadConversations();
    }

    const channel = supabase
      .channel(`user-updates-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, () => {
        if (activeTab === 'matches') loadMatches(false);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        if (activeTab === 'chat') loadConversations(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTab, refetchSignal]);

  async function loadMatches(showLoading = isInitialLoad.current) {
    try {
      if (showLoading) setLoading(true);
      
      const timeoutId = setTimeout(() => {
        if (showLoading) {
          setLoading(false);
          console.warn('[Matches] Matches loading timed out after 10s');
        }
      }, 10000);
      
      const data = await matchService.getUserMatches(user!.id);
      setMatches(data || []);
      clearTimeout(timeoutId);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
      isInitialLoad.current = false;
    }
  }

  async function loadConversations(showLoading = isInitialLoad.current) {
    try {
      if (showLoading) setLoading(true);
      
      const timeoutId = setTimeout(() => {
        if (showLoading) {
          setLoading(false);
          console.warn('[Matches] Conversations loading timed out after 10s');
        }
      }, 10000);
      
      const data = await matchService.getConversations(user!.id);
      setConversations(data || []);
      clearTimeout(timeoutId);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
      isInitialLoad.current = false;
    }
  }

  return (
    <Shell>
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Matches</h1>

        <div className="flex border-b border-white/5">
          <button 
            onClick={() => setActiveTab('matches')}
            className={cn(
              "px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'matches' ? "text-primary" : "text-slate-500 hover:text-slate-400"
            )}
          >
            My Matches
            {activeTab === 'matches' && (
              <motion.div layoutId="matchTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'chat' ? "text-primary" : "text-slate-500 hover:text-slate-400"
            )}
          >
            Conversations
            {activeTab === 'chat' && (
              <motion.div layoutId="matchTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>

        <div className="pt-8">
          {loading ? (
            <LoadingState message={activeTab === 'matches' ? "Recalculating Brackets..." : "Syncing COMMS..."} />
          ) : activeTab === 'matches' ? (
            matches.length > 0 ? (
              <div className="space-y-6">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <EmptyState 
                tab="matches" 
                title="No Matches Yet" 
                description="Join a tournament to get started with your first competitive arena battle." 
              />
            )
          ) : conversations.length > 0 ? (
            <div className="card divide-y divide-slate-800 rounded-3xl overflow-hidden border-slate-800/50">
              {conversations.map((conv) => {
                const match = conv.matches;
                if (!match) return null;

                const p1Id = typeof match.player1 === 'object' ? match.player1?.id : match.player1;
                const p2Id = typeof match.player2 === 'object' ? match.player2?.id : match.player2;
                
                const opponent = p1Id === user?.id 
                  ? (typeof match.player2 === 'object' ? match.player2 : { id: p2Id }) 
                  : (typeof match.player1 === 'object' ? match.player1 : { id: p1Id });
                
                const opponentName = getPublicIdentity(opponent);
                const lastMessage = conv.lastMessage;
                const unreadCount = conv.unreadCount;

                return (
                  <Link 
                    key={conv.id}
                    to={`/matches/${match.id}`}
                    className="p-6 flex items-center justify-between hover:bg-slate-800/30 transition-all group relative"
                  >
                    <div className="flex items-center space-x-6 min-w-0 flex-1">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg group-hover:border-primary/30 transition-colors overflow-hidden">
                          {opponent?.avatar_url ? (
                            <img 
                              src={opponent.avatar_url} 
                              alt={opponentName} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs md:text-sm font-black text-primary uppercase tracking-widest truncate">
                            {match.tournaments?.name || 'Tournament'}
                          </span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full shrink-0" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Round {match.round}</span>
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter truncate">
                            {opponentName}
                          </h3>
                          {lastMessage && (
                            <span className="text-[10px] font-medium text-slate-500 uppercase shrink-0">
                              {formatDistanceToNow(new Date(lastMessage.created_at))} ago
                            </span>
                          )}
                        </div>
                        
                        {lastMessage ? (
                          <p className={`text-sm truncate ${unreadCount > 0 ? 'text-slate-200 font-bold' : 'text-slate-500 font-medium'}`}>
                            {lastMessage.sender_id === user?.id ? 'You: ' : ''}{lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm italic text-slate-600 font-medium tracking-tight">No messages yet. Send a "Good Luck" msg!</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-all group-hover:translate-x-1 ml-4" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState 
              tab="chat" 
              title="No Conversations" 
              description="Start playing matches to unlock private communications with your opponents." 
            />
          )}
        </div>
      </div>
    </Shell>
  );
}

function EmptyState({ tab, title, description }: { tab: 'matches' | 'chat'; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 animate-fade-in">
      <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent blur-xl" />
        {tab === 'matches' ? (
          <ClipboardList className="w-12 h-12 text-slate-700 relative z-10" />
        ) : (
          <MessageSquare className="w-12 h-12 text-slate-700 relative z-10" />
        )}
      </div>
      <h3 className="text-3xl font-black text-[#00d1ff] italic uppercase tracking-tighter mb-4">
        {title}
      </h3>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm leading-relaxed max-w-sm">
        {description}
      </p>
      {tab === 'matches' && (
        <Link to="/tournaments" className="mt-8 px-10 py-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-black uppercase italic tracking-tighter hover:bg-primary/20 transition-all">
          Browse Arena
        </Link>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: any; key?: string }) {
  const { user } = useAuth();
  const isOngoing = match.status === 'ongoing' || ['lobby_open', 'match_in_progress'].includes(match.status);
  const isCompleted = match.status === 'completed' || match.status === 'verified';
  const isScheduled = !!match.scheduled_at && !isOngoing && !isCompleted;
  
  // Check if now is past scheduled time
  const isPastScheduled = isScheduled && new Date(match.scheduled_at) <= new Date();
  const displayStatus = isOngoing || isPastScheduled ? 'Live Now' : isScheduled ? 'Scheduled' : isCompleted ? 'Completed' : 'Live Soon';
  
  const verification = match.result_verification_status as VerificationStatus || 'none';

  const opponent = match.player1?.id === user?.id ? match.player2 : match.player1;
  const opponentName = getPublicIdentity(opponent);

  return (
    <div className="relative">
      <Link 
        to={`/matches/${match.id}`} 
        className={cn(
          "card p-6 block hover:border-primary/50 transition-all group overflow-hidden relative z-10",
          (isOngoing || isPastScheduled) && "border-primary/30 shadow-lg shadow-primary/5",
          verification === 'disputed' && "border-red-500/30"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="text-center w-16">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Round</p>
              <p className="text-2xl font-black text-white italic">{match.round}</p>
            </div>
            <div className="h-12 w-px bg-slate-800" />
            <div className="space-y-1 min-w-0">
               <div className="flex items-center space-x-2">
                 <span className="text-xs md:text-sm font-black text-primary uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
                   {match.tournaments?.name || 'Tournament'}
                 </span>
                 <span className="w-1 h-1 bg-slate-700 rounded-full shrink-0" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">{match.stage} stage</span>
                 
                 <VerificationStatusBadge status={verification} size="sm" />
               </div>
               <div className="flex items-center space-x-3">
                 <span className={cn("text-lg font-bold uppercase italic tracking-tight truncate max-w-[100px] sm:max-w-none", match.winner === user?.id || (isCompleted && match.score1 > match.score2) ? "text-emerald-500" : "text-white")}>You</span>
                 <span className="text-xs font-black text-slate-600 shrink-0">
                   {isCompleted || match.score1 !== null ? `${match.score1 ?? 0} - ${match.score2 ?? 0}` : "VS"}
                 </span>
                 <span className={cn("text-lg font-bold uppercase italic tracking-tight truncate max-w-[100px] sm:max-w-none", match.winner === opponent?.id || (isCompleted && match.score2 > match.score1) ? "text-emerald-500" : "text-white")}>
                   {opponentName}
                 </span>
               </div>
               
               {isScheduled && (
                 <div className="flex items-center space-x-2 pt-1">
                   <Calendar className="w-3 h-3 text-slate-600" />
                   <span className="text-[10px] font-bold text-slate-400 border border-slate-800 px-2 rounded-full uppercase tracking-tighter">
                     {formatDate(match.scheduled_at)}
                   </span>
                 </div>
               )}
            </div>
          </div>

          <div className="flex items-center space-x-6 justify-between md:justify-end">
             <div className="text-right">
               {isCompleted ? (
                 <div className="flex items-center text-slate-500 space-x-2">
                   <Clock className="w-4 h-4" />
                   <span className="text-xs font-black uppercase italic">Completed</span>
                 </div>
               ) : (
                 <div className={cn(
                   "flex items-center space-x-2",
                   isOngoing || isPastScheduled ? "text-emerald-500" : "text-primary"
                 )}>
                   {isOngoing || isPastScheduled ? (
                     <>
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span className="text-xs font-black uppercase italic animate-pulse">Live Now</span>
                     </>
                   ) : (
                     <>
                      <Timer className="w-4 h-4" />
                      <span className="text-xs font-black uppercase italic">{isScheduled ? 'Scheduled' : 'Live Soon'}</span>
                     </>
                   )}
                 </div>
               )}
             </div>
             <div className="btn-secondary p-3 rounded-xl group-hover:bg-primary group-hover:text-slate-900 transition-all shadow-lg group-hover:shadow-primary/20">
               <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
             </div>
          </div>
        </div>

        {(isOngoing || isPastScheduled) && (
          <div className="absolute top-0 right-0 p-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase italic tracking-tighter border-b border-l border-emerald-500/20 rounded-bl-xl">
            Match Live
          </div>
        )}
      </Link>
      
      <AnimatePresence>
        {verification !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2"
          >
            <VerificationStatusBanner 
              status={verification} 
              score1={match.score1} 
              score2={match.score2} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
