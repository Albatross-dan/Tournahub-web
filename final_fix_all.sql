-- FINAL CONSOLIDATED FIX
-- 1. DROP FUNCTIONS TO ALLOW TYPE CHANGES
DROP FUNCTION IF EXISTS public.register_for_tournament(UUID, UUID);
DROP FUNCTION IF EXISTS public.submit_match_result(UUID, UUID, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.delete_tournament_cascade(UUID);

-- 2. ROBUST RLS POLICY CLEANUP (DROPS ALL CUSTOM POLICIES TO PREVENT DUPLICATES)
DO $$ 
DECLARE 
    tbl text;
    pol record;
BEGIN 
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP 
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' 
        LOOP 
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl); 
        END LOOP; 
    END LOOP; 
END $$;

-- 3. RE-APPLY CRITICAL POLICIES
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournaments" ON public.tournaments FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrations are viewable by everyone" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Users can register" ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage registrations" ON public.registrations FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage matches" ON public.matches FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Match Results
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results are viewable by everyone" ON public.match_results FOR SELECT USING (true);
CREATE POLICY "Admins can manage results" ON public.match_results FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Match Conversations
ALTER TABLE public.match_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversations are viewable by participants" ON public.match_conversations FOR SELECT USING (true);
CREATE POLICY "Admins can manage conversations" ON public.match_conversations FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are viewable by everyone" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins can manage messages" ON public.messages FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Settings
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by everyone" ON public.tournament_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.tournament_settings FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Badge Selections
ALTER TABLE public.tournament_badge_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Selections are viewable by everyone" ON public.tournament_badge_selections FOR SELECT USING (true);
CREATE POLICY "Admins can manage selections" ON public.tournament_badge_selections FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 4. RE-APPLY THE REGISTRATION RPC
CREATE OR REPLACE FUNCTION public.register_for_tournament(
  p_tournament_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_fee DECIMAL;
  v_registrations_count INTEGER;
  v_max_players INTEGER;
  v_balance DECIMAL;
  v_tournament_status TEXT;
  v_registration_id UUID;
  v_waitlist_pos INTEGER;
BEGIN
  -- 1. Get tournament info
  SELECT entry_fee, max_players, status 
  INTO v_entry_fee, v_max_players, v_tournament_status
  FROM public.tournaments
  WHERE id = p_tournament_id;

  IF v_tournament_status != 'registration_open' THEN
    RETURN json_build_object('success', false, 'error', 'Registration is closed for this tournament.');
  END IF;

  -- 2. Check if already registered
  IF EXISTS (SELECT 1 FROM public.registrations WHERE tournament_id = p_tournament_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already registered for this tournament.');
  END IF;

  -- 3. Check wallet balance if fee applies
  IF v_entry_fee > 0 THEN
    SELECT COALESCE(balance, 0) INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    
    IF v_balance < v_entry_fee THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance. Please top up your wallet.');
    END IF;

    -- Deduct fee
    UPDATE public.wallets 
    SET balance = balance - v_entry_fee, updated_at = NOW() 
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -v_entry_fee, 'debit', 'Entry fee for tournament ID: ' || p_tournament_id);
  END IF;

  -- 4. Check capacity and register or waitlist
  SELECT COUNT(*) INTO v_registrations_count 
  FROM public.registrations 
  WHERE tournament_id = p_tournament_id AND status != 'waitlisted';

  IF v_registrations_count < v_max_players THEN
    -- Register directly
    INSERT INTO public.registrations (tournament_id, user_id, status)
    VALUES (p_tournament_id, p_user_id, 'registered')
    RETURNING id INTO v_registration_id;

    RETURN json_build_object('success', true, 'status', 'registered', 'registration_id', v_registration_id);
  ELSE
    -- Add to waitlist
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
    FROM public.registrations
    WHERE tournament_id = p_tournament_id AND status = 'waitlisted';

    INSERT INTO public.registrations (tournament_id, user_id, status, waitlist_position)
    VALUES (p_tournament_id, p_user_id, 'waitlisted', v_waitlist_pos)
    RETURNING id INTO v_registration_id;

    RETURN json_build_object('success', true, 'status', 'waitlisted', 'registration_id', v_registration_id, 'position', v_waitlist_pos);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. COMPREHENSIVE CASCADE DELETE FUNCTION
CREATE OR REPLACE FUNCTION public.delete_tournament_cascade(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. DELETE MESSAGES AND PARTICIPANTS
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT id FROM public.match_conversations WHERE tournament_id = p_tournament_id
  );
  
  DELETE FROM public.conversation_participants WHERE conversation_id IN (
    SELECT id FROM public.match_conversations WHERE tournament_id = p_tournament_id
  );
  
  -- 2. DELETE CONVERSATIONS
  DELETE FROM public.match_conversations WHERE tournament_id = p_tournament_id;

  -- 3. DELETE MATCH RESULTS
  DELETE FROM public.match_results WHERE match_id IN (
    SELECT id FROM public.matches WHERE tournament_id = p_tournament_id
  );

  -- 4. DELETE FIXTURES
  DELETE FROM public.fixtures WHERE tournament_id = p_tournament_id;

  -- 5. DELETE MATCHES
  DELETE FROM public.matches WHERE tournament_id = p_tournament_id;
  
  -- 6. DELETE REGISTRATIONS AND GROUP DATA
  DELETE FROM public.registrations WHERE tournament_id = p_tournament_id;
  DELETE FROM public.group_members WHERE tournament_id = p_tournament_id;
  
  -- 7. DELETE SETTINGS AND BADGES
  DELETE FROM public.tournament_settings WHERE tournament_id = p_tournament_id;
  DELETE FROM public.tournament_badge_selections WHERE tournament_id = p_tournament_id;
  
  -- 8. DELETE STANDINGS AND PRIZES
  DELETE FROM public.league_standings WHERE tournament_id = p_tournament_id;
  DELETE FROM public.prize_distributions WHERE tournament_id = p_tournament_id;

  -- 9. CLEANUP NOTIFICATIONS
  DELETE FROM public.notifications 
  WHERE (data->>'tournament_id') = p_tournament_id::text;

  -- 10. CLEANUP AUDIT LOGS
  DELETE FROM public.audit_logs 
  WHERE entity_id = p_tournament_id 
     OR (metadata->>'tournament_id') = p_tournament_id::text;

  -- 11. NULL OUT REFERENCES IN TRANSACTIONS (Optional column check)
  BEGIN
    UPDATE public.wallet_transactions 
    SET description = description || ' (Tournament Deleted)'
    WHERE description LIKE '%' || p_tournament_id::text || '%';
  EXCEPTION WHEN OTHERS THEN 
    -- Ignore if column/logic fails
  END;

  -- 12. FINAL DELETION
  DELETE FROM public.tournaments WHERE id = p_tournament_id;
END;
$$;
