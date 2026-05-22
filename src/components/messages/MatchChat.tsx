import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getStorageUrl, getPublicIdentity } from '../../lib/utils';
import { matchService } from '../../services/matchService';
import { Send, Users, Shield, Loader2, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { useTournamentBadges } from '../../hooks/useTournamentBadges';

const playMessageSound = (type: 'sent' | 'received') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (type === 'sent') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      const now = ctx.currentTime;
      // Note 1 (low pitch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(now + 0.12);
      
      // Note 2 (high pitch fast)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain2.gain.setValueAtTime(0.06, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.22);
    }
  } catch (e) {
    console.warn('[MatchChat] Sound blocked or unsupported by browser standard policy:', e);
  }
};

interface MatchChatProps {
  matchId: string;
  currentUserId: string;
  tournamentId?: string;
}

export default function MatchChat({ matchId, currentUserId, tournamentId }: MatchChatProps) {
  const { profile } = useAuth(); // Need profile for avatar in confirmed state
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const { badges } = useTournamentBadges(tournamentId);
  const [isOpponentOnline, setIsOpponentOnline] = useState(false);
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat();
  }, [matchId]);

  useEffect(() => {
    if (!conversationId) return;

    // Realtime subscription using Broadcast as specified in requirements
    const channel = supabase
      .channel(`match_conversation:${conversationId}:${Math.random().toString(36).substring(7)}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUserId }
        }
      })
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const presenceState = channel.presenceState();
          const onlineUserIds = Object.values(presenceState).flatMap((presences: any) => 
            presences.map((p: any) => p.user_id)
          );
          const isOnline = onlineUserIds.includes(opponent?.id);
          setIsOpponentOnline(isOnline);
        }
      )
      .on(
        'broadcast',
        { event: 'message_created' },
        async (payload: any) => {
          // Robust payload extraction based on different Supabase/Realtime versions
          const incomingMsg = payload.payload || payload;
          if (!incomingMsg || (!incomingMsg.id && !incomingMsg.content)) {
            console.warn('[MatchChat] Received empty or invalid broadcast payload:', payload);
            return;
          }

          console.log('[MatchChat] Realtime broadcast received:', incomingMsg.id || 'new-msg');
          
          setMessages(prev => {
            // 1. Check if we already have this real ID
            if (incomingMsg.id && prev.some(m => m.id === incomingMsg.id)) {
              return prev;
            }

            // Mark as read if it's from the opponent
            if (incomingMsg.sender_id !== currentUserId) {
              matchService.markAsRead(conversationId, currentUserId);
              playMessageSound('received');
            }

            // 2. Check if it matches an optimistic message by content and sender
            const optimisticIndex = prev.findIndex(m => 
              m.isOptimistic && 
              m.sender_id === incomingMsg.sender_id && 
              m.content === incomingMsg.content
            );

            if (optimisticIndex !== -1) {
              const newMsgs = [...prev];
              newMsgs[optimisticIndex] = {
                ...incomingMsg,
                isDelivered: true,
                status: 'delivered',
                sender: prev[optimisticIndex].sender
              };
              return newMsgs;
            }
            
            // 3. New message from someone else
            const enrichedMessage = {
              ...incomingMsg,
              isDelivered: true,
              status: 'delivered',
              sender: incomingMsg.sender_id === opponent?.id ? opponent : 
                     (incomingMsg.sender_id === currentUserId ? { ...profile, isMe: true } : null)
            };
            
            return [...prev, enrichedMessage];
          });
          scrollToBottom();
        }
      )
      // Fallback: stay synced with DB changes too
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload: any) => {
          const newMsgId = payload.new.id;
          console.log('[MatchChat] Realtime DB insert received:', newMsgId);
          
          // Requirement Section 4: Fetch full enriched record from view
          const { data: enrichedMsg, error } = await (supabase as any)
            .from('v_messages_with_sender')
            .select('*')
            .eq('id', newMsgId)
            .single();

          if (error || !enrichedMsg) {
            console.error('[MatchChat] Failed to fetch enriched message after realtime insert:', error);
            return;
          }
          
          setMessages(prev => {
            if (prev.some(m => m.id === enrichedMsg.id)) return prev;
            
            // Mark as read if it's from the opponent
            if (enrichedMsg.sender_id !== currentUserId) {
              matchService.markAsRead(conversationId as string, currentUserId);
              playMessageSound('received');
            }

            const optimisticIndex = prev.findIndex(m => 
              m.isOptimistic && 
              m.sender_id === enrichedMsg.sender_id && 
              m.content === enrichedMsg.content
            );

            if (optimisticIndex !== -1) {
              const newMsgs = [...prev];
              newMsgs[optimisticIndex] = {
                ...enrichedMsg,
                isDelivered: true,
                status: 'delivered',
                sender: {
                  id: enrichedMsg.sender_id,
                  username: enrichedMsg.sender_username,
                  avatar_url: enrichedMsg.sender_avatar_url
                }
              };
              return newMsgs;
            }

            const messageToUse = {
              ...enrichedMsg,
              isDelivered: true,
              status: 'delivered',
              sender: {
                id: enrichedMsg.sender_id,
                username: enrichedMsg.sender_username,
                avatar_url: enrichedMsg.sender_avatar_url
              }
            };
            return [...prev, messageToUse];
          });
          scrollToBottom();
        }
      )
      // Listen to message updates (e.g., read_by array changes for real-time blue ticks)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload: any) => {
          const updatedMsg = payload.new;
          console.log('[MatchChat] Realtime DB update received (read_by):', updatedMsg.id, updatedMsg.read_by);
          setMessages(prev => prev.map(m => 
            m.id === updatedMsg.id 
              ? { ...m, read_by: updatedMsg.read_by } 
              : m
          ));
        }
      )
      .subscribe(async (status) => {
        console.log(`[MatchChat] Subscription status for channel match_conversation:${conversationId}:`, status);
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, opponent, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadChat() {
    try {
      setLoading(true);
      setError(null);
      const conv = await matchService.getConversationId(matchId);

      if (conv) {
        setConversationId(conv.id);
        if (conv.opponent) {
          setOpponent(conv.opponent);
        }
        
        // Mark as read immediately when loading the chat
        matchService.markAsRead(conv.id, currentUserId);
        
        // Requirement 6: Verify participant membership
        const isMember = await matchService.isParticipant(conv.id, currentUserId);
        if (!isMember) {
          console.warn('[MatchChat] User not found in conversation_participants. Attempting auto-join...');
          try {
            const { error: joinErr } = await (supabase as any).from('conversation_participants').insert({
              conversation_id: conv.id,
              user_id: currentUserId
            });
            
            if (joinErr) {
              console.warn('[MatchChat] Auto-join insertion error (likely RLS/Recursion):', joinErr.message);
              // Non-fatal: if this fails, we rely on the match-level RLS to allow reading/sending anyway
            } else {
              console.log('[MatchChat] Auto-join successful');
            }
          } catch (e) {
            console.warn('[MatchChat] Auto-join exception:', e);
          }
        }
        
        const msgs = await matchService.loadMessages(conv.id);
        // Mark existing messages as confirmed/delivered
        setMessages(msgs?.map(m => ({ ...m, isDelivered: true })) || []);
      } else {
        setError('Communication channel not established. Please contact support.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize match chat');
    } finally {
      setLoading(false);
    }
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    const content = newMessage.trim();
    const tempId = `temp-${crypto.randomUUID()}`;
    
    // Optimistic UI update
    const optimisticMessage = {
      id: tempId,
      content,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      status: 'sending',
      isDelivered: false,
      sender: { username: 'You', avatar_url: profile?.avatar_url }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSending(true);

    try {
      console.log('[MatchChat] Sending message to pipeline...', { conversationId, content });
      const sentMessage = await matchService.sendMessage(conversationId, 'text', content);
      console.log('[MatchChat] Message sent successfully:', sentMessage.id);
      playMessageSound('sent');
      
      // Requirement 6 & 7: Explicitly broadcast the message so the opponent receives it via 'broadcast' listener
      if (channelRef.current) {
        console.log('[MatchChat] Triggering realtime broadcast...');
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: sentMessage
        });
      }

      // Update the optimistic message with real data
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === tempId);
        if (index === -1) return prev;
        
        const updated = [...prev];
        updated[index] = { 
          ...sentMessage, 
          sender: { ...profile, isMe: true }, 
          isDelivered: true, 
          status: 'sent' 
        };
        return updated;
      });
      scrollToBottom();
    } catch (err: any) {
      console.error('[MatchChat] Send failed CRITICAL:', err);
      setError(`Delivery failed: ${err.message || 'Verification error'}`);
      // Mark as failed
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'error', error: err.message || 'Verification failed' } : m
      ));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden">
        <LoadingState message="Accessing Comms..." className="py-0" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden p-6 text-center space-y-4">
        <Shield className="w-12 h-12 text-red-500/50" />
        <div>
          <p className="text-white font-bold uppercase italic tracking-tighter">Comm Link Failed</p>
          <p className="text-zinc-500 text-xs mt-1">{error}</p>
        </div>
        <button 
          onClick={() => loadChat()}
          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-zinc-900 bg-black/40 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden border border-primary/20">
            {opponent?.avatar_url ? (
              <img src={getStorageUrl('avatars', opponent.avatar_url)} className="w-full h-full object-cover" alt="Opponent" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-white italic uppercase tracking-tighter">
              {opponent ? `VS ${getPublicIdentity(opponent)}` : 'Match Comm Link'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Encrypted Direct Channel</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <MessageItem 
              key={msg.id || idx} 
              message={msg} 
              isMe={msg.sender_id === currentUserId} 
              badgeUrl={badges[msg.sender_id]}
              opponentId={opponent?.id}
              isOpponentOnline={isOpponentOnline}
            />
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic space-y-2">
            <Users className="w-8 h-8 opacity-20" />
            <p className="text-xs">No messages yet. Start the strategy.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-black/60 border-t border-zinc-900">
        <div className="relative">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary/50 transition-all outline-none pr-14 placeholder:text-zinc-600"
          />
          <button 
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-black rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

interface MessageItemProps {
  message: any;
  isMe: boolean;
  badgeUrl?: string;
  opponentId?: string;
  isOpponentOnline?: boolean;
  key?: any;
}

/* Message bubble colors and styles for a professional look */
function MessageItem({ message, isMe, badgeUrl, opponentId, isOpponentOnline }: MessageItemProps) {
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';
  const delivered = message.isDelivered || message.status === 'sent' || message.status === 'delivered';
  
  // WhatsApp Style ticketing rules
  const isReadByOpponent = Array.isArray(message.read_by) && opponentId && message.read_by.includes(opponentId);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "flex group mb-4",
        isMe ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[80%] items-start gap-2",
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar & Badge */}
        <div className="shrink-0 mt-1 relative">
          <div className={cn(
            "w-8 h-8 rounded-lg overflow-hidden border flex items-center justify-center bg-zinc-950",
            isMe ? "border-primary/20" : "border-zinc-800"
          )}>
            {message.sender?.avatar_url ? (
              <img 
                src={getStorageUrl('avatars', message.sender.avatar_url)} 
                className="w-full h-full object-cover" 
                alt={message.sender?.username || 'Avatar'}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Users className={cn("w-4 h-4", isMe ? "text-primary/40" : "text-zinc-600")} />
            )}
          </div>
          {badgeUrl && (
            <div className={cn(
              "absolute -bottom-1 w-4 h-4 rounded bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 shadow-2xl z-10",
              isMe ? "-left-1" : "-right-1"
            )}>
              <img 
                src={getStorageUrl('team-badges', badgeUrl)} 
                className="w-full h-full object-contain" 
                alt="badge"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "flex flex-col",
          isMe ? "items-end" : "items-start"
        )}>
          {!isMe && (
            <div className="flex items-center gap-1.5 mb-1 ml-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                {getPublicIdentity(message.sender)}
              </span>
            </div>
          )}
          
          <div className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xl relative transition-all",
            isMe 
              ? "bg-gradient-to-br from-primary to-primary/80 text-black font-semibold rounded-tr-none" 
              : "bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none group-hover:border-zinc-700",
            isError && "border-red-500/50 bg-red-500/10 text-red-500"
          )}>
            {message.content}
            
            {isError && (
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-red-500" title={message.error}>
                <Shield className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Footer: Time + Status */}
          <div className={cn(
            "flex items-center gap-1.5 mt-1 px-1",
            isMe ? "flex-row" : "flex-row-reverse"
          )}>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {isMe && (
              <div className="flex items-center">
                {isSending ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-600" />
                ) : isError ? (
                  <span className="text-[8px] font-black text-red-500 uppercase">FAILED</span>
                ) : isReadByOpponent ? (
                  <CheckCheck className="w-3 h-3 text-sky-400 font-bold" />
                ) : (isOpponentOnline || delivered) ? (
                  <CheckCheck className="w-3 h-3 text-zinc-500" />
                ) : (
                  <Check className="w-3 h-3 text-zinc-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
