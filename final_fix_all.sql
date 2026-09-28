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
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
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

-- Marketplace Tables
ALTER TABLE IF EXISTS public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_order_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_seller_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'published' OR auth.uid() = seller_id);
CREATE POLICY "Sellers insert own listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own listings" ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own listings" ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Participants view orders" ON public.marketplace_orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Participants update orders" ON public.marketplace_orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Participants read credentials" ON public.marketplace_order_credentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "Sellers insert credentials" ON public.marketplace_order_credentials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND o.seller_id = auth.uid()
    )
  );

CREATE POLICY "Participants view disputes" ON public.marketplace_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "Participants create disputes" ON public.marketplace_disputes
  FOR INSERT WITH CHECK (auth.uid() = opener_id);

CREATE POLICY "Public read reviews" ON public.marketplace_reviews
  FOR SELECT USING (true);
CREATE POLICY "Buyers insert reviews" ON public.marketplace_reviews
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Public read seller stats" ON public.marketplace_seller_stats
  FOR SELECT USING (true);

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

-- 6. RE-APPLY THE SUBMIT RESULT RPC
CREATE OR REPLACE FUNCTION public.submit_match_result(
  p_match_id UUID,
  p_submitter_id UUID,
  p_player1_score INTEGER,
  p_player2_score INTEGER,
  p_screenshot_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_opp_id UUID;
  v_opp_sub RECORD;
  v_new_result_id UUID;
  v_winner_id UUID;
BEGIN
  -- 1. Get and lock the match row to prevent concurrent updates
  SELECT id, player1, player2, COALESCE(result_verification_status, 'none') as verification_status, status
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Match not found.');
  END IF;

  -- 2. Validate submitter identity
  IF p_submitter_id != v_match.player1 AND p_submitter_id != v_match.player2 THEN
    RETURN json_build_object('success', false, 'error', 'You are not a participant in this match.');
  END IF;

  -- 3. Check if submitter already has an active submission
  IF EXISTS (
    SELECT 1 FROM public.match_results 
    WHERE match_id = p_match_id AND submitted_by = p_submitter_id AND status != 'rejected'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You have already submitted a result for this match.');
  END IF;

  -- 4. Determine opponent ID
  IF p_submitter_id = v_match.player1 THEN
    v_opp_id := v_match.player2;
  ELSE
    v_opp_id := v_match.player1;
  END IF;

  -- 5. Look for opponent's active/submitted result
  SELECT id, player1_score, player2_score, status 
  INTO v_opp_sub
  FROM public.match_results
  WHERE match_id = p_match_id AND submitted_by = v_opp_id AND status = 'submitted'
  LIMIT 1;

  -- 6. Insert new match result row
  INSERT INTO public.match_results (
    id,
    match_id,
    submitted_by,
    player1_score,
    player2_score,
    screenshot_url,
    status,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_match_id,
    p_submitter_id,
    p_player1_score,
    p_player2_score,
    p_screenshot_url,
    'submitted',
    NOW()
  )
  RETURNING id INTO v_new_result_id;

  -- 7. Process matching/mismatch status
  IF v_opp_sub.id IS NULL THEN
    -- First submission
    UPDATE public.matches
    SET 
      result_verification_status = 'single_submission',
      status = 'awaiting_result',
      updated_at = NOW()
    WHERE id = p_match_id;

    RETURN json_build_object(
      'success', true,
      'verification_status', 'single_submission',
      'result_id', v_new_result_id,
      'path', 'A',
      'message', 'Result submitted, waiting for opponent.'
    );
  ELSE
    -- Second submission: compare scores
    IF p_player1_score = v_opp_sub.player1_score AND p_player2_score = v_opp_sub.player2_score THEN
      -- SUCCESS: Scores match!
      UPDATE public.match_results
      SET status = 'verified', verified_at = NOW()
      WHERE match_id = p_match_id;

      -- Determine winner UUID
      IF p_player1_score > p_player2_score THEN
        v_winner_id := v_match.player1;
      ELSIF p_player2_score > p_player1_score THEN
        v_winner_id := v_match.player2;
      ELSE
        v_winner_id := NULL; -- Draw
      END IF;

      -- Mark match completed in matches
      UPDATE public.matches
      SET 
        score1 = p_player1_score,
        score2 = p_player2_score,
        winner = v_winner_id,
        status = 'completed',
        result_verification_status = 'verified',
        updated_at = NOW()
      WHERE id = p_match_id;

      RETURN json_build_object(
        'success', true,
        'verification_status', 'verified',
        'result_id', v_new_result_id,
        'path', 'B',
        'message', 'Scores matched! Match results confirmed.'
      );
    ELSE
      -- DISPUTE: Scores conflict!
      UPDATE public.match_results
      SET status = 'disputed'
      WHERE match_id = p_match_id;

      UPDATE public.matches
      SET 
        result_verification_status = 'disputed',
        status = 'under_review',
        updated_at = NOW()
      WHERE id = p_match_id;

      RETURN json_build_object(
        'success', true,
        'verification_status', 'disputed',
        'result_id', v_new_result_id,
        'path', 'C',
        'message', 'Scores conflict! Match marked for administration review.'
      );
    END IF;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. RE-APPLY THE GET MATCH STATE RPC
CREATE OR REPLACE FUNCTION public.get_match_verification_state(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_status TEXT;
    v_verification_status TEXT;
    v_final_score1 INTEGER;
    v_final_score2 INTEGER;
    v_winner_id UUID;
    v_winner_username TEXT;
    v_locked BOOLEAN;
    v_submission_count INTEGER;
    v_submissions JSONB;
    v_ui_state TEXT;
    v_approved_result_id UUID;
    v_scheduled_at TIMESTAMPTZ;
    v_play_window_end TIMESTAMPTZ;
    v_submission_deadline TIMESTAMPTZ;
    v_can_submit BOOLEAN;
BEGIN
    -- 1. Fetch match details
    SELECT 
        status, 
        COALESCE(result_verification_status, 'none'),
        score1, 
        score2, 
        winner,
        COALESCE(locked, false),
        scheduled_at::TIMESTAMPTZ
    INTO 
        v_match_status, 
        v_verification_status,
        v_final_score1, 
        v_final_score2, 
        v_winner_id,
        v_locked,
        v_scheduled_at
    FROM public.matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Match not found');
    END IF;

    -- 2. Fetch winner username
    IF v_winner_id IS NOT NULL THEN
        SELECT username INTO v_winner_username
        FROM public.profiles
        WHERE id = v_winner_id;
    END IF;

    -- 3. Fetch submissions linked to this match
    -- We join with profiles to get the username and avatar_url
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb), COUNT(*)
    INTO v_submissions, v_submission_count
    FROM (
        SELECT 
            mr.id,
            mr.submitted_by,
            p.username,
            p.avatar_url,
            mr.player1_score as score1,
            mr.player2_score as score2,
            mr.player1_score,
            mr.player2_score,
            mr.screenshot_url,
            mr.status,
            mr.created_at,
            CASE WHEN mr.status = 'verified' THEN true ELSE false END as is_canonical
        FROM public.match_results mr
        LEFT JOIN public.profiles p ON mr.submitted_by = p.id
        WHERE mr.match_id = p_match_id
        ORDER BY mr.created_at ASC
    ) sub;

    -- 4. Calculate play windows & deadlines
    IF v_scheduled_at IS NOT NULL THEN
        v_play_window_end := v_scheduled_at + interval '30 minutes';
        v_submission_deadline := v_play_window_end + interval '10 minutes';
    ELSE
        v_play_window_end := NOW() + interval '30 minutes';
        v_submission_deadline := v_play_window_end + interval '10 minutes';
    END IF;

    v_can_submit := COALESCE(v_scheduled_at <= NOW(), true);

    -- 5. Calculate ui_state & verification_status
    -- ui_state keys: 'awaiting_submissions' | 'waiting_for_opponent' | 'auto_verified' | 'under_admin_review' | 'admin_verified'
    -- verification_status keys: 'none' | 'single_submission' | 'matched' | 'disputed' | 'verified' | 'pending' | 'abandoned' | 'superseded' 
    IF v_verification_status = 'verified' THEN
        v_ui_state := 'admin_verified';
    ELSIF v_verification_status = 'matched' THEN
        v_ui_state := 'auto_verified';
    ELSIF v_verification_status = 'disputed' THEN
        v_ui_state := 'under_admin_review';
    ELSIF v_submission_count = 1 THEN
        v_ui_state := 'waiting_for_opponent';
        v_verification_status := 'single_submission';
    ELSE
        v_ui_state := 'awaiting_submissions';
        v_verification_status := 'none';
    END IF;

    -- If match is marked completed, and status is verified or matched, match ui_states appropriately
    IF v_match_status = 'completed' THEN
        IF v_verification_status = 'verified' THEN
            v_ui_state := 'admin_verified';
        ELSE
            v_ui_state := 'auto_verified';
        END IF;
    END IF;

    -- Fetch approved result id
    SELECT id INTO v_approved_result_id
    FROM public.match_results
    WHERE match_id = p_match_id AND status = 'verified'
    LIMIT 1;

    -- Return full JSON state
    RETURN json_build_object(
        'match_id', p_match_id,
        'match_status', v_match_status,
        'verification_status', v_verification_status,
        'ui_state', v_ui_state,
        'approved_result_id', v_approved_result_id,
        'final_score1', v_final_score1,
        'final_score2', v_final_score2,
        'winner_username', v_winner_username,
        'locked', v_locked,
        'submission_count', v_submission_count,
        'submissions', v_submissions,
        'can_submit', v_can_submit,
        'play_window_end', v_play_window_end,
        'submission_deadline', v_submission_deadline,
        'server_time', NOW()
    );
END;
$$;

