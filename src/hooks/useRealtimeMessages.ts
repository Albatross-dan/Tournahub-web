import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/database';
import { matchService } from '../services/matchService';

export function useRealtimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const fetchInitial = async () => {
      try {
        const data = await matchService.loadMessages(conversationId);
        setMessages(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`match_conversation:${conversationId}:${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          const newMessage = payload.new;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, { ...newMessage, isDelivered: true }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading };
}
