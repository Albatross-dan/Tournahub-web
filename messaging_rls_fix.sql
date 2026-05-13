-- FINAL NON-RECURSIVE FIX FOR MESSAGING SYSTEM
-- This script completely decouples the policies to prevent Error 42P17

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.match_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.match_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL KNOWN POLICY NAMES (Exhaustive list to clear the slate)
DROP POLICY IF EXISTS "match_conversations_select" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_insert" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_select_v2" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_insert_v2" ON public.match_conversations;
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.match_conversations;
DROP POLICY IF EXISTS "Users can create conversations for their matches" ON public.match_conversations;

DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select_v2" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert_v2" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can view their participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations of their matches" ON public.conversation_participants;
DROP POLICY IF EXISTS "Anyone can join match comms" ON public.conversation_participants;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_select_v2" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_v2" ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;

-- 4. NON-RECURSIVE POLICIES

-- A: Match Conversations
-- Only look at the matches table to avoid loops
CREATE POLICY "match_conv_select_final" ON public.match_conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid())
  )
);

CREATE POLICY "match_conv_insert_final" ON public.match_conversations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid())
  )
);

-- B: Conversation Participants
-- Participants can see who else is in the chat (flat check)
CREATE POLICY "conv_part_select_final" ON public.conversation_participants
FOR SELECT TO authenticated
USING (true); 

-- Join check: Only allow if you are a player in the corresponding match
-- We use a subquery that targets the source table (matches) directly
CREATE POLICY "conv_part_insert_final" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.match_conversations mc
    JOIN public.matches m ON mc.match_id = m.id
    WHERE mc.id = conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid())
  )
);

-- C: Messages
-- Simplified message access: Linked to the match players
CREATE POLICY "messages_select_final" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.match_conversations mc
    JOIN public.matches m ON mc.match_id = m.id
    WHERE mc.id = conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid())
  )
);

CREATE POLICY "messages_insert_final" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.match_conversations mc
    JOIN public.matches m ON mc.match_id = m.id
    WHERE mc.id = conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid())
  )
);

-- 5. Finalize Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
