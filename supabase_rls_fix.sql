-- Fix for Storage RLS Policies (result-screenshots bucket)
-- Allows authenticated users to upload screenshots to the results/ folder

-- 1. Ensure bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('result-screenshots', 'result-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy to allow uploads (INSERT) for authenticated users
-- We allow users to upload to the results/ folder
DROP POLICY IF EXISTS "Allow authenticated uploads to results folder" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to results folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'result-screenshots' AND
  (storage.foldername(name))[1] = 'results'
);

-- 3. Policy to allow users to view their own uploaded screenshots (if needed)
DROP POLICY IF EXISTS "Allow users to view results screenshots" ON storage.objects;
CREATE POLICY "Allow users to view results screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'result-screenshots'
);

-- Fix for Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Fix for Wallets RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;

CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix for Registrations RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
-- Robust way to clear policies and ensure visibility
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'registrations' AND schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.registrations', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Registrations are viewable by everyone" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own registration" ON public.registrations FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin'));

-- Fix for Matches RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'matches' AND schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.matches', pol.policyname); 
    END LOOP; 
END $$;
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);

-- Fix for Tournament Settings RLS
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tournament_settings' AND schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tournament_settings', pol.policyname); 
    END LOOP; 
END $$;
CREATE POLICY "Settings are viewable by everyone" ON public.tournament_settings FOR SELECT USING (true);

-- Fix for Database RLS Policies (match_results table)
-- Allows players of a match to submit results

-- 1. Enable RLS on the table
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Players can submit results" ON public.match_results;
DROP POLICY IF EXISTS "Anyone can view results" ON public.match_results;

-- 3. Policy for inserting results
-- A user can insert a result if:
-- a) They are authenticated
-- b) They are either player1 or player2 in the corresponding match
CREATE POLICY "Players can submit results"
ON public.match_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = match_id
    AND (player1 = auth.uid() OR player2 = auth.uid())
  )
);

-- 4. Policy for viewing results
CREATE POLICY "Anyone can view results"
ON public.match_results
FOR SELECT
TO authenticated
USING (true);

-- 5. Fix for RPC submit_match_result
-- Ensure the RPC is created with SECURITY DEFINER to bypass RLS issues if necessary,
-- OR ensure it handles the RLS correctly.
-- Here is a robust version of the submission RPC:

CREATE OR REPLACE FUNCTION submit_match_result(
  p_match_id UUID,
  p_player1_score INTEGER,
  p_player2_score INTEGER,
  p_screenshot_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as the creator (admin) to bypass RLS failures during the process
SET search_path = public
AS $$
BEGIN
  -- 1. Validate that the caller is a participant in the match
  IF NOT EXISTS (
    SELECT 1 FROM matches
    WHERE id = p_match_id
    AND (player1 = auth.uid() OR player2 = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit results for this match';
  END IF;

  -- 2. Insert into match_results
  INSERT INTO match_results (
    match_id,
    submitted_by,
    player1_score,
    player2_score,
    screenshot_url,
    status
  )
  VALUES (
    p_match_id,
    auth.uid(),
    p_player1_score,
    p_player2_score,
    p_screenshot_url,
    'submitted'
  );
END;
$$;

-- FIX FOR MESSAGING SYSTEM (NON-RECURSIVE VERSION)
-- Ensure tables exist
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.match_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.match_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clear previous name overlaps
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.match_conversations;
DROP POLICY IF EXISTS "Users can create conversations for their matches" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_select" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_insert" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_select_v2" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conversations_insert_v2" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conv_select_final" ON public.match_conversations;
DROP POLICY IF EXISTS "match_conv_insert_final" ON public.match_conversations;

DROP POLICY IF EXISTS "Participants can view their participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations of their matches" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_select_v2" ON public.conversation_participants;
DROP POLICY IF EXISTS "participants_insert_v2" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_part_select_final" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_part_insert_final" ON public.conversation_participants;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_select_v2" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_v2" ON public.messages;
DROP POLICY IF EXISTS "messages_select_final" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_final" ON public.messages;

-- A: Match Conversations (Checks matches only)
CREATE POLICY "match_conv_select_v3" ON public.match_conversations
FOR SELECT USING (EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND (player1 = auth.uid() OR player2 = auth.uid())));

CREATE POLICY "match_conv_insert_v3" ON public.match_conversations
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND (player1 = auth.uid() OR player2 = auth.uid())));

-- B: Conversation Participants (Flat check + Join check via matches)
CREATE POLICY "conv_part_select_v3" ON public.conversation_participants
FOR SELECT USING (true);

CREATE POLICY "conv_part_insert_v3" ON public.conversation_participants
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.match_conversations mc JOIN public.matches m ON mc.match_id = m.id WHERE mc.id = conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid()))
);

-- C: Messages (Access based on match membership)
CREATE POLICY "messages_select_v3" ON public.messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.match_conversations mc JOIN public.matches m ON mc.match_id = m.id WHERE mc.id = messages.conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid()))
);

CREATE POLICY "messages_insert_v3" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.match_conversations mc JOIN public.matches m ON mc.match_id = m.id WHERE mc.id = messages.conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid()))
);

CREATE POLICY "messages_update_v3" ON public.messages
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.match_conversations mc JOIN public.matches m ON mc.match_id = m.id WHERE mc.id = messages.conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.match_conversations mc JOIN public.matches m ON mc.match_id = m.id WHERE mc.id = messages.conversation_id AND (m.player1 = auth.uid() OR m.player2 = auth.uid()))
);

-- REPLICA IDENTITY
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.match_conversations REPLICA IDENTITY FULL;

-- ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_conversations;
  END IF;
END $$;
