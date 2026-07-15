import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  message_type: 'text' | 'system' | 'whatsapp_action';
  content: string;
  created_at: string;
  read_by: string[] | null;
}

function WhatsAppCard({ message, currentUserId }: any) {
  let payload: any = null;
  try {
    payload = JSON.parse(message.content);
  } catch (err) {
    console.warn('Failed to parse whatsapp_action message content:', err);
    return (
      <div className="w-full text-center py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-xs text-zinc-500 italic">
        ⚠️ Failed to load coordination info.
      </div>
    );
  }

  if (!payload) return null;

  const isPlayer1 = currentUserId === payload.player1?.id;
  const mySlot = isPlayer1 ? payload.player1 : payload.player2;
  const opponentSlot = isPlayer1 ? payload.player2 : payload.player1;

  if (!mySlot || !opponentSlot) {
    return (
      <div className="w-full text-center py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-xs text-zinc-500 italic">
        ⚠️ Participant slot info mismatch.
      </div>
    );
  }

  const opponentHasWa = opponentSlot.whatsapp && opponentSlot.whatsapp.trim() !== '';
  const handleOpenWhatsApp = () => {
    if (!opponentHasWa) return;
    const number = opponentSlot.whatsapp.replace(/\D/g, '');
    const text = encodeURIComponent(mySlot.wa_text || '');
    window.open(`https://wa.me/${number}?text=${text}`, '_blank');
  };

  return (
    <div className="w-full bg-zinc-950/85 rounded-2xl border border-emerald-500/30 p-5 shadow-lg my-3 max-w-md mx-auto relative overflow-hidden text-left">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.561 7.928-7.928a7.82 7.82 0 0 0-2.325-5.6zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
            </svg>
          </span>
          <span className="text-xs font-black text-white italic tracking-widest uppercase">Coordinate via WhatsApp</span>
        </div>
        
        <div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Match Deadline</span>
          <span className="text-sm font-black text-zinc-200">{mySlot.deadline_display || 'Not specified'}</span>
        </div>

        {opponentHasWa ? (
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            WhatsApp {opponentSlot.username || 'Opponent'} →
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full mt-2 px-4 py-2.5 bg-zinc-800 text-zinc-500 rounded-xl text-xs font-black uppercase tracking-wider cursor-not-allowed border border-zinc-700/50"
          >
            Opponent hasn't set a WhatsApp number
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChallengeChat() {
  const { id: challengeId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
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

      // Fetch opponent's WhatsApp number
      const isP1 = detailData.player1_id === user?.id;
      const opponentId = isP1 ? detailData.player2_id : detailData.player1_id;
      if (opponentId) {
        try {
          const { data: pData } = await supabase
            .from('profiles')
            .select('whatsapp_number')
            .eq('id', opponentId)
            .maybeSingle();
          if (pData) {
            setOpponentProfile(pData);
          }
        } catch (err) {
          console.warn('[ChallengeChat] Error fetching opponent profile:', err);
        }
      }

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
            
            <Link 
              to={oppUsername ? `/players/${oppUsername}` : '#'}
              className={cn(
                "flex items-center gap-2 group",
                oppUsername ? "cursor-pointer" : "pointer-events-none"
              )}
            >
              <PlayerBadge 
                badgeId={oppBadge} 
                username={oppUsername || 'Opponent'} 
                size="sm"
                className="w-8 h-8 group-hover:scale-105 transition-transform"
              />
              <div>
                <p className="text-xs font-black uppercase text-zinc-500 leading-none">MATCH CHAT</p>
                <p className="text-sm font-black text-white italic leading-none mt-1 group-hover:text-primary transition-colors">{oppUsername || 'Opponent'}</p>
              </div>
            </Link>
          </div>

          <div className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
            1v1 LOBBY
          </div>
        </div>

        {/* Persistent WhatsApp Banner */}
        {opponentProfile?.whatsapp_number ? (
          <div className="bg-emerald-950/20 border-x border-b border-emerald-500/15 p-3 px-4 flex items-center justify-between gap-3 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.561 7.928-7.928a7.82 7.82 0 0 0-2.325-5.6zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest leading-none">WhatsApp Ready</p>
                <p className="text-xs text-slate-300 font-bold mt-1 truncate">Coordinate with @{oppUsername} directly on WhatsApp</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${opponentProfile.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi @${oppUsername || 'Opponent'}, let's coordinate our 1v1 match on TournaHub!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10 shrink-0 text-center inline-flex items-center gap-1.5 cursor-pointer"
            >
              Chat on WhatsApp
            </a>
          </div>
        ) : (
          <div className="bg-zinc-950/80 border-x border-b border-zinc-800/60 p-3 px-4 flex items-center justify-between gap-3 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-lg bg-zinc-900 text-zinc-500 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.561 7.928-7.928a7.82 7.82 0 0 0-2.325-5.6zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest leading-none">WhatsApp Offline</p>
                <p className="text-xs text-zinc-400 font-bold mt-1 truncate">@{oppUsername} hasn't added a WhatsApp number yet</p>
              </div>
            </div>
            <button
              disabled
              className="px-3 py-1.5 bg-zinc-900 text-zinc-600 rounded-lg text-xs font-black uppercase tracking-wider border border-zinc-800 shrink-0 cursor-not-allowed text-center"
            >
              N/A
            </button>
          </div>
        )}

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
              if (msg.message_type === 'whatsapp_action') {
                return <WhatsAppCard key={msg.id} message={msg} currentUserId={user?.id} />;
              }

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
                  <Link
                    to={senderUsername ? `/players/${senderUsername}` : '#'}
                    className={cn(
                      "group hover:scale-105 transition-transform block",
                      senderUsername ? "cursor-pointer" : "pointer-events-none"
                    )}
                  >
                    <PlayerBadge 
                      badgeId={senderBadge} 
                      username={senderUsername || 'Sender'} 
                      size="xs"
                      className="w-6 h-6 mb-1"
                    />
                  </Link>
                  <div className="space-y-1">
                    {!isMe && (
                      <Link
                        to={senderUsername ? `/players/${senderUsername}` : '#'}
                        className={cn(
                          "text-[9px] font-black uppercase text-zinc-500 pl-1 hover:text-primary transition-colors block",
                          senderUsername ? "cursor-pointer" : "pointer-events-none"
                        )}
                      >
                        {senderUsername}
                      </Link>
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
