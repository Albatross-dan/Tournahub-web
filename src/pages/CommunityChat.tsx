import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Send, Trash2, Users, Loader2, ArrowDown,
  LayoutDashboard, Trophy, Calendar, Wallet, AlertCircle, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import eFootballBg from '../assets/images/efootball_chat_bg_1781622583145.jpg';

interface CommunityMessage {
  id: string;
  content: string;
  message_type: 'text' | 'system';
  created_at: string;
  sender_id: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    role: string | null;
  } | null;
}

export default function CommunityChat() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState<CommunityMessage[]>(() => {
    try {
      const cached = localStorage.getItem('tournahub_community_chat_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('[CommunityChat] Failed to read messages cache:', e);
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Cache messages to localStorage whenever they are updated/fetched
  useEffect(() => {
    try {
      const persistentMessages = messages.filter(m => m && m.id && !m.id.startsWith('temp-'));
      // Keep only the last 100 messages to keep cache size very small and clean
      const toCache = persistentMessages.slice(-100);
      if (toCache.length > 0) {
        localStorage.setItem('tournahub_community_chat_cache', JSON.stringify(toCache));
      }
    } catch (e) {
      console.error('[CommunityChat] Failed to save messages to cache:', e);
    }
  }, [messages]);

  // Mark all community messages as read by updating the last_read_at timestamp in localStorage
  useEffect(() => {
    localStorage.setItem('community_chat_last_read_at', new Date().toISOString());
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('community_chat_last_read_at', new Date().toISOString());
    return () => {
      localStorage.setItem('community_chat_last_read_at', new Date().toISOString());
    };
  }, []);
  
  // Realtime "new message" alert state
  const [scrolledUp, setScrolledUp] = useState(false);
  const scrolledUpRef = useRef(false);
  const [hasNewMessagesNotification, setHasNewMessagesNotification] = useState(false);
  
  // Scroll refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Instant scroll on mount if we have cached messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom('instant');
      const timer1 = setTimeout(() => scrollToBottom('instant'), 50);
      const timer2 = setTimeout(() => scrollToBottom('instant'), 150);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  // Bottom Navigation Items (matches Shell.tsx)
  const bottomNavItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Matches', path: '/matches', icon: Calendar },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
  ];

  const checkActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Safe fetch for single message (with profile join) on realtime INSERT
  const fetchSingleMessage = async (messageId: string): Promise<CommunityMessage | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('community_chat_messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          sender_id,
          profiles:sender_id (
            username,
            avatar_url,
            role
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) {
        console.error('[CommunityChat] Error fetching single message:', error);
        return null;
      }
      return data as unknown as CommunityMessage;
    } catch (err) {
      console.error('[CommunityChat] Exception fetching single message:', err);
      return null;
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      setHasNewMessagesNotification(false);
      setScrolledUp(false);
      scrolledUpRef.current = false;
    }
  };

  // User manual scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // If user is more than 150px away from the bottom, mark as scrolledUp
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    if (isAtBottom) {
      setScrolledUp(false);
      scrolledUpRef.current = false;
      setHasNewMessagesNotification(false);
    } else {
      setScrolledUp(true);
      scrolledUpRef.current = true;
    }
  };

  // Load old messages & subscribe to realtime
  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      try {
        setLoading(true);
        const { data, error } = await (supabase as any)
          .from('community_chat_messages')
          .select(`
            id,
            content,
            message_type,
            created_at,
            sender_id,
            profiles:sender_id (
              username,
              avatar_url,
              role
            )
          `)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('[CommunityChat] Error loading messages:', error);
          setErrorHeader('Failed to load chat history');
          return;
        }

        if (isMounted) {
          setMessages((data as unknown as CommunityMessage[]) || []);
          setTimeout(() => scrollToBottom('instant'), 100);
        }
      } catch (err) {
        console.error('[CommunityChat] Exception loading messages:', err);
        setErrorHeader('Offline or connection issues');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMessages();

    // Subscribe to Postgres Changes
    const channel = supabase
      .channel('community-chat-room')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_chat_messages' 
        },
        async (payload) => {
          const msgId = payload.new.id;
          const fullMsg = await fetchSingleMessage(msgId);
          
          if (fullMsg && isMounted) {
            setMessages(prev => {
              if (prev.some(m => m.id === fullMsg.id)) return prev;
              
              // Replace optimistic temp message if found
              const firstTempIndex = prev.findIndex(
                m => m.id.startsWith('temp-') && 
                     m.sender_id === fullMsg.sender_id && 
                     m.content === fullMsg.content
              );
              
              if (firstTempIndex !== -1) {
                const updated = [...prev];
                updated[firstTempIndex] = fullMsg;
                return updated;
              }
              
              return [...prev, fullMsg];
            });

            // If user has scrolled up, show "New message" indicator instead of force scrolling
            if (scrolledUpRef.current) {
              setHasNewMessagesNotification(true);
            } else {
              setTimeout(() => scrollToBottom('smooth'), 100);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'community_chat_messages' 
        },
        (payload) => {
          const deletedId = payload.old.id;
          if (isMounted) {
            setMessages(prev => prev.filter(m => m.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log(`[CommunityChat] Realtime channel status:`, status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (profile?.status !== 'active') return;

    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > 1000) return;

    // Generate optimistic/instant temporary ID and message
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMsg: CommunityMessage = {
      id: tempId,
      content: trimmed,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender_id: user.id,
      profiles: {
        username: profile?.username || 'Contender',
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || null,
      }
    };

    // Instant UI feedback: empty the text field, add message, scroll down immediately
    setInputText('');
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      setSending(true);
      const { data, error } = await (supabase as any)
        .from('community_chat_messages')
        .insert({
          sender_id: user.id,
          content: trimmed,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('[CommunityChat] Error saving message:', error);
        setErrorHeader('Message not delivered');
        // Remove optimistic message on actual failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } else if (data) {
        // Swap local temporary message id with permanent database id immediately
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: data.id,
          created_at: data.created_at,
        } : m));
      }
    } catch (err) {
      console.error('[CommunityChat] Send message exception:', err);
      // Remove optimistic message on exception
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Optimistic delete
      setMessages(prev => prev.filter(m => m.id !== messageId));

      const { error } = await (supabase as any)
        .from('community_chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('[CommunityChat] Error deleting message from DB:', error);
      }
    } catch (err) {
      console.error('[CommunityChat] Delete message exception:', err);
    }
  };

  const isActiveUser = user && profile?.status === 'active';
  const charCount = inputText.length;
  const isInputOverLimit = charCount > 1000;

  // Render message list with date separators and consecutive grouping
  const renderMessageList = () => {
    let lastDateStr = '';
    
    return messages.map((msg, index) => {
      const msgDate = new Date(msg.created_at);
      const dateStr = format(msgDate, 'yyyy-MM-dd');
      let showDateDivider = false;
      let dividerLabel = '';

      if (dateStr !== lastDateStr) {
        showDateDivider = true;
        lastDateStr = dateStr;
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        
        if (dateStr === todayStr) {
          dividerLabel = 'Today';
        } else if (dateStr === yesterdayStr) {
          dividerLabel = 'Yesterday';
        } else {
          dividerLabel = format(msgDate, 'MMMM d, yyyy');
        }
      }

      const isMe = msg.sender_id === user?.id;
      const prevMsg = index > 0 ? messages[index - 1] : null;
      
      // Consecutive check: same sender, within 5 minutes, same day
      const isConsecutive = prevMsg && 
                            prevMsg.sender_id === msg.sender_id && 
                            format(new Date(prevMsg.created_at), 'yyyy-MM-dd') === dateStr &&
                            (msgDate.getTime() - new Date(prevMsg.created_at).getTime()) < 300000;

      // Next consecutive check: same sender, within 5 minutes, same day
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
      const isLastInGroup = !nextMsg || 
                            nextMsg.sender_id !== msg.sender_id || 
                            format(new Date(nextMsg.created_at), 'yyyy-MM-dd') !== dateStr || 
                            (new Date(nextMsg.created_at).getTime() - msgDate.getTime()) >= 300000;

      return (
        <React.Fragment key={msg.id}>
          {showDateDivider && (
            <div className="flex justify-center my-6 w-full">
              <span className="bg-white/[0.08] text-[10.5px] text-slate-300 font-extrabold uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-white/[0.03] shadow-sm leading-none select-none">
                {dividerLabel}
              </span>
            </div>
          )}
          <MessageBubble 
            msg={msg} 
            isMe={isMe} 
            isConsecutive={!!isConsecutive} 
            isLastInGroup={!!isLastInGroup}
            onDelete={handleDeleteMessage}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="group relative w-full h-[100dvh] flex flex-col bg-[#060812] text-white overflow-hidden select-none">
      
      {/* Immersive eFootball background image and gradient overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#060812] w-screen h-screen">
        <img 
          src={eFootballBg} 
          alt="eFootball stadium background" 
          className="w-full h-full object-cover opacity-6 filter brightness-[0.22] saturate-[0.6] contrast-[1.1]"
          referrerPolicy="no-referrer"
        />
        {/* Soft, dark gradient overlays for maximum message visual clarity and contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060812]/98 via-[#060812]/90 to-[#060812]/95" />
        <div className="absolute inset-0 bg-radial-at-t from-transparent via-[#060812]/30 to-[#060812]/90" />
      </div>
      
      {/* Header Bar */}
      <header className="h-16 shrink-0 bg-[#0b0e17] border-b border-[#1e293b] px-4 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center space-x-3 max-w-[70%]">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl hover:bg-slate-800/60 active:bg-slate-800 flex items-center justify-center transition-all cursor-pointer text-text-muted hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-[#10b981] shrink-0">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <h3 className="font-black text-white uppercase italic tracking-tighter text-sm leading-none truncate">Community Chat</h3>
              <p className="text-[9px] text-[#10b981] font-extrabold uppercase tracking-widest mt-1 truncate">Open to all players</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-center text-slate-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Messages Scroll Panel */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto bg-transparent relative z-10 custom-scrollbar"
      >
        <div className="px-3 py-3 pb-6 flex flex-col space-y-2">
          {loading && messages.length === 0 ? (
            <div className="my-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Establishing lobby pipeline...</p>
            </div>
          ) : messages.length > 0 ? (
            <>
              {loading && (
                <div className="flex items-center justify-center space-x-2 py-1 select-none opacity-80 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Syncing feed...</span>
                </div>
              )}
              {renderMessageList()}
            </>
          ) : (
            <div className="my-12 flex flex-col items-center justify-center space-y-4 py-12">
              <div className="w-16 h-16 bg-surface border border-slate-800 rounded-full flex items-center justify-center text-text-muted shadow-lg">
                <Users size={28} className="text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-white italic uppercase tracking-tighter">Welcome to the Lobby</p>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">Start the first competitive chat banter!</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating New Messages Alert Banner */}
      {hasNewMessagesNotification && (
        <button 
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#10b981] hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-lg transition-all border border-emerald-300 cursor-pointer z-30"
        >
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          <span>New Messages</span>
        </button>
      )}

      {/* Footer / Input Panel (Flush with bottom elements, no gap) */}
      <footer className="shrink-0 border-t border-[#1e293b] bg-[#0b0e17] p-3.5 z-20">
        {errorHeader && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest text-center animate-shake">
            {errorHeader}
          </div>
        )}

        {isActiveUser ? (
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="flex items-center space-x-3">
              {/* Current User Avatar on the left */}
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-black text-xs text-emerald-450 shadow-inner">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (profile?.username || 'U').slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Text Input in Middle */}
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={1010}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (errorHeader) setErrorHeader(null);
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    // Slight delay to allow clicking on nav buttons before they hide/unhide
                    setTimeout(() => setIsInputFocused(false), 150);
                  }}
                  placeholder="Message..."
                  className="w-full bg-[#182236] border border-slate-700 focus:border-[#10b981]/80 rounded-2xl pl-4 pr-4 py-3 text-xs text-white placeholder-slate-400 tracking-wide outline-none transition-all shadow-md focus:bg-[#1a263d]"
                />
              </div>

              {/* Send trigger on Right */}
              <button
                type="submit"
                disabled={!inputText.trim() || isInputOverLimit}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer z-30",
                  inputText.trim() && !isInputOverLimit
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/40 opacity-40 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Warning appears only when character limit is exceeded */}
            {isInputOverLimit && (
              <div className="flex justify-end items-center space-x-1.5 px-2 mt-1 animate-in fade-in duration-100">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                <span className="text-[10px] font-bold text-rose-550 uppercase tracking-widest text-rose-500 italic">
                  Maximum limit of 1000 characters exceeded!
                </span>
              </div>
            )}
          </form>
        ) : (
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 text-center">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic">
              {!user ? 'You must be logged in to chat' : 'Only active contender profiles can publish chat banters'}
            </p>
          </div>
        )}
      </footer>

      {/* Bottom Navigation Bar Layer (Hides automatically on mobile when input is focused) */}
      <div className={cn(
        "shrink-0 bg-background border-t border-border-main py-2.5 px-3 z-20 flex items-center justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.5)] transition-all duration-200",
        isInputFocused ? "hidden md:flex" : "flex"
      )}>
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = checkActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 py-1 px-4 rounded-xl transition-all duration-300 relative",
                isActive 
                  ? "text-primary font-black scale-102" 
                  : "text-text-muted hover:text-text-main"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px] text-primary" : "stroke-[2px] text-slate-400")} />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

// Separate component for Message Bubble to isolate hover state and performance
interface BubbleProps {
  msg: CommunityMessage;
  isMe: boolean;
  isConsecutive: boolean;
  isLastInGroup: boolean;
  onDelete: (id: string) => void;
}

function MessageBubble({ msg, isMe, isConsecutive, isLastInGroup, onDelete }: BubbleProps) {
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);
  const senderRole = msg.profiles?.role;
  const hasBadge = senderRole === 'admin' || senderRole === 'moderator';
  const msgDate = new Date(msg.created_at);

  return (
    <div 
      className={cn(
        "flex w-full transition-all group",
        isConsecutive ? "mt-1" : "mt-3.5",
        isMe ? "justify-end items-end" : "justify-start items-end"
      )}
    >
      {/* Avatar column for other users */}
      {!isMe && (
        <div className="w-9 shrink-0 flex justify-center mr-2 mb-1">
          {isLastInGroup ? (
            <div className="w-9 h-9 rounded-full bg-slate-850 border border-slate-700/80 overflow-hidden flex items-center justify-center font-black text-[10px] text-emerald-400 shrink-0 shadow-md">
              {msg.profiles?.avatar_url ? (
                <img 
                  src={msg.profiles.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (msg.profiles?.username || 'U').slice(0, 2).toUpperCase()
              )}
            </div>
          ) : (
            // Empty placeholder box to align consecutive bubbles perfectly
            <div className="w-9 h-9" />
          )}
        </div>
      )}

      {/* Bubble block */}
      <div 
        onClick={() => {
          if (isMe) {
            setShowDeleteBtn(!showDeleteBtn);
          }
        }}
        className={cn(
          "flex flex-col shrink-0 max-w-[75%] relative select-text",
          isMe ? "items-end" : "items-start"
        )}
      >
        {/* Username in light green header */}
        {!isMe && !isConsecutive && (
          <div className="flex items-center space-x-1.5 mb-1 pl-1 select-none">
            <span className="text-[11.5px] font-black text-[#10b981] uppercase tracking-wide">
              {msg.profiles?.username || 'Contender'}
            </span>
            {hasBadge && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none border",
                senderRole === 'admin' 
                  ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              )}>
                {senderRole === 'admin' ? 'Admin' : 'Mod'}
              </span>
            )}
          </div>
        )}

        {/* Message bubble card */}
        <div 
          style={{ backgroundColor: isMe ? '#005c4b' : '#1f2c34', borderRadius: '10px' }}
          className="px-4 py-2.5 relative transition-all text-left min-w-[90px] flex flex-col space-y-1.5"
        >
          {/* Main Content layout */}
          <div className="text-[13px] font-normal leading-relaxed whitespace-pre-wrap break-words text-white select-text pr-1 pb-1">
            {msg.content}
          </div>

          {/* Time aligned inside the bubble on bottom right, nicely separated */}
          <div className="flex items-center justify-end space-x-1 select-none">
            <span 
              style={{ color: 'rgba(255, 255, 255, 0.55)' }}
              className="text-[7.5px] font-semibold tracking-wider leading-none"
            >
              {format(msgDate, 'HH:mm')}
            </span>
            {isMe && (
              <Check 
                style={{ color: 'rgba(255, 255, 255, 0.55)' }} 
                className="w-2.5 h-2.5 shrink-0" 
              />
            )}
          </div>

          {/* Hover / tap delete for owner */}
          {isMe && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(msg.id);
              }}
              className={cn(
                "absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-all bg-slate-900 border border-slate-800 shadow-lg cursor-pointer",
                showDeleteBtn ? "opacity-100 scale-100" : "opacity-0 scale-90 md:group-hover:opacity-100 md:group-hover:scale-100 pointer-events-none md:pointer-events-auto"
              )}
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
