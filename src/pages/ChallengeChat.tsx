import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Shell from '../components/layout/Shell';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Send, RefreshCw, MessageSquare, Swords, Shield, 
  HelpCircle, Sparkles, Flame, UserCheck, AlertTriangle
} from 'lucide-react';
import { PlayerBadge } from '../components/ui/PlayerBadge';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  sender_id: string | null;
  message_type: 'text' | 'system';
  content: string;
  created_at: string;
  read_by: string[] | null;
}

export default function ChallengeChat() {
  const { id: challengeId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Challenge Details (for player usernames & badges)
  const fetchDetailAndMessages = async (showLoading = true) => {
    if (!challengeId) return;
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch details
      const { data: detailData, error: detailErr } = await (supabase as any)
        .from('v_challenge_detail')
        .select('*')
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (detailErr) throw detailErr;
      if (!detailData) {
        setError('Challenge details not found.');
        return;
      }
      setDetail(detailData);

      // Fetch messages if conversation_id exists
      if (detailData.conversation_id) {
        const { data: msgData, error: msgErr } = await (supabase as any)
          .from('challenge_messages')
          .select(`
            id,
            sender_id,
            message_type,
            content,
            read_by,
            created_at
          `)
          .eq('conversation_id', detailData.conversation_id)
          .order('created_at', { ascending: true });

        if (msgErr) {
          // If we hit infinite recursion, log it and let user know or show error
          console.error('[ChallengeChat] Error fetching messages:', msgErr);
          if (msgErr.message?.includes('recursion')) {
            setError('Access error: Direct message policies are restricted. Please verify your registry status in this challenge.');
          } else {
            setError(msgErr.message || 'Failed to fetch messages.');
          }
        } else {
          setMessages((msgData || []) as Message[]);
        }
      } else {
        setError('No active chat conversation is open for this challenge yet.');
      }
    } catch (err: any) {
      console.error('[ChallengeChat] Fetch error:', err);
      setError(err.message || 'Failed to synchronize conversation.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailAndMessages();

    if (!detail?.conversation_id) return;

    // Real-time message subscription
    const chatChannel = supabase
      .channel(`challenge-chat-${detail.conversation_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'challenge_messages',
          filter: `conversation_id=eq.${detail.conversation_id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [challengeId, detail?.conversation_id]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim() || !detail?.conversation_id || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { error: sendErr } = await (supabase as any)
        .from('challenge_messages')
        .insert({
          conversation_id: detail.conversation_id,
          sender_id: user.id,
          message_type: 'text',
          content: messageText,
        });

      if (sendErr) throw sendErr;
      
      // Local optimisitc update (will also be triggered by subscription)
      await fetchDetailAndMessages(false);
    } catch (err: any) {
      console.error('[ChallengeChat] Failed to send message:', err);
      alert(err.message || 'Message delivery failed.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs uppercase tracking-widest text-zinc-500 animate-pulse">Entering Chat...</p>
        </div>
      </Shell>
    );
  }

  // Identify profiles
  const isP1 = detail?.player1_id === user?.id;
  const oppUsername = isP1 ? detail?.player2_username : detail?.player1_username;
  const oppBadge = isP1 ? detail?.player2_badge_id : detail?.player1_badge_id;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-12rem)] min-h-[450px]">
        {/* Header */}
        <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-t-3xl border-t border-x border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/challenges/${challengeId}`)}
              className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <PlayerBadge 
                badgeId={oppBadge} 
                username={oppUsername || 'Opponent'} 
                size="sm"
                className="w-8 h-8"
              />
              <div>
                <p className="text-xs font-black uppercase text-zinc-500 leading-none">MATCH CHAT</p>
                <p className="text-sm font-black text-white italic leading-none mt-1">{oppUsername || 'Opponent'}</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
            1v1 LOBBY
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 bg-zinc-950/40 border-x border-zinc-800 p-4 overflow-y-auto space-y-4 flex flex-col">
          {error ? (
            <div className="m-auto text-center p-6 space-y-4 max-w-sm">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">{error}</p>
              <button
                onClick={() => fetchDetailAndMessages(true)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="m-auto text-center space-y-2 p-6">
              <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto animate-bounce" />
              <p className="text-sm font-black text-white uppercase italic">Direct Channel Open</p>
              <p className="text-xs text-zinc-500 max-w-xs">Coordinate matching times, rooms, and passwords here with your opponent.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSystem = msg.message_type === 'system';
              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center py-2 px-6">
                    <span className="text-xs italic text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50">
                      ⚙️ {msg.content}
                    </span>
                  </div>
                );
              }

              const isMe = msg.sender_id === user?.id;
              const senderUsername = msg.sender_id === detail?.player1_id ? detail?.player1_username : detail?.player2_username;
              const senderBadge = msg.sender_id === detail?.player1_id ? detail?.player1_badge_id : detail?.player2_badge_id;

              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%]",
                    isMe ? "self-end flex-row-reverse" : "self-start"
                  )}
                >
                  <PlayerBadge 
                    badgeId={senderBadge} 
                    username={senderUsername || 'Sender'} 
                    size="xs"
                    className="w-6 h-6 mb-1"
                  />
                  <div className="space-y-1">
                    {!isMe && (
                      <p className="text-[9px] font-black uppercase text-zinc-500 pl-1">{senderUsername}</p>
                    )}
                    <div 
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isMe 
                          ? "bg-blue-600 text-white rounded-br-none" 
                          : "bg-zinc-900 text-zinc-100 rounded-bl-none border border-zinc-800"
                      )}
                    >
                      <p>{msg.content}</p>
                      <span className="block text-[8px] opacity-60 text-right mt-1 font-mono">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={handleSendMessage} 
          className="bg-zinc-950 p-4 rounded-b-3xl border-b border-x border-zinc-800 flex items-center gap-2"
        >
          <input 
            type="text" 
            placeholder={detail?.conversation_id ? "Send a direct message..." : "Direct channel disabled"}
            value={inputText}
            disabled={!detail?.conversation_id || sending}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending || !detail?.conversation_id}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </Shell>
  );
}
