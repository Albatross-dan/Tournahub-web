import React, { useState, useEffect } from 'react';
import Shell from '../components/layout/Shell';
import { supabase } from '../lib/supabase';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight, User } from 'lucide-react';
import { matchService } from '../services/matchService';
import LoadingState from '../components/ui/LoadingState';
import { formatDistanceToNow } from 'date-fns';
import { getPublicIdentity, cn } from '../lib/utils';

export default function Chat() {
  const { user, refetchSignal } = useAuth();
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(loadConversations);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadConversations(true);

      // Realtime subscription for message updates to update previews/unread counts
      const channel = supabase
        .channel('conversations_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            // Simple refresh when any message changes
            loadConversations(false);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, refetchSignal]);

  async function loadConversations(showLoading = isInitialLoad.current) {
    if (!user) return;
    const cacheKey = `tournahub-conversations-${user.id}`;
    
    // Warm screen instantly by loading cached data
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          if (showLoading) setLoading(false);
        }
      }
    } catch (e) {
      console.warn('[Chat] Error reading conversations cache:', e);
    }

    try {
      if (showLoading && conversations.length === 0) setLoading(true);
      const data = await matchService.getConversations(user.id);
      if (data && Array.isArray(data)) {
        setConversations(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Message <span className="text-primary">Center</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Direct communication channels for your active tournament matches.</p>
        </div>

        <div className="card divide-y divide-slate-800 rounded-3xl overflow-hidden border-slate-800/50">
          {loading ? (
            <LoadingState message="Establishing Link..." />
          ) : conversations.length > 0 ? (
            conversations.map((conv) => {
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
                      <Link 
                        to={opponent?.username ? `/players/${opponent.username}` : '#'}
                        onClick={(e) => {
                          if (opponent?.username) {
                            e.stopPropagation();
                          }
                        }}
                        className={cn(
                          "w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg group-hover:border-primary/30 transition-all overflow-hidden block",
                          opponent?.username ? "cursor-pointer hover:scale-105 z-10" : "pointer-events-none"
                        )}
                      >
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
                      </Link>
                      {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse z-20">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate">
                          {match.tournaments?.name || 'Tournament'}
                        </span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full shrink-0" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Round {match.round}</span>
                      </div>
                      
                      <div className="flex items-baseline justify-between gap-4">
                        <Link
                          to={opponent?.username ? `/players/${opponent.username}` : '#'}
                          onClick={(e) => {
                            if (opponent?.username) {
                              e.stopPropagation();
                            }
                          }}
                          className={cn(
                            "hover:text-primary transition-colors block text-xl font-black text-white italic uppercase tracking-tighter truncate",
                            opponent?.username ? "cursor-pointer z-10" : "pointer-events-none"
                          )}
                        >
                          {opponentName}
                        </Link>
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
            })
          ) : (
            <div className="p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 shadow-inner">
                <MessageSquare size={32} className="text-slate-700" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-white italic uppercase tracking-tighter">No active comms</p>
                <p className="text-slate-500 max-w-sm mx-auto font-medium italic">
                  Join a tournament and get matched to open communication channels with your opponents.
                </p>
              </div>
              <Link to="/tournaments" className="btn-secondary inline-block px-10 py-3 text-xs uppercase italic font-black">
                Find Tournaments
              </Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
