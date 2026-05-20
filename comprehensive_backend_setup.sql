-- COMPREHENSIVE BACKEND RECONSTRUCTION
-- Run this if the admin panel shows errors related to missing views or functions.

-- 1. UTILITY VIEWS FOR ADMIN DASHBOARD & SERVICES

-- View for tournaments joined with creator info
CREATE OR REPLACE VIEW v_tournaments_with_creator AS
SELECT 
    t.*, 
    p.username as created_by_username, 
    p.avatar_url as created_by_avatar
FROM public.tournaments t
LEFT JOIN public.profiles p ON t.created_by = p.id;

-- View for registrations joined with user info
CREATE OR REPLACE VIEW v_registrations_with_users AS
SELECT 
    r.*, 
    p.username, 
    p.avatar_url
FROM public.registrations r
LEFT JOIN public.profiles p ON r.user_id = p.id;

-- View for match results (submissions) joined with submitter info
CREATE OR REPLACE VIEW v_match_results AS
SELECT 
    mr.*, 
    p.username as submitted_by_username, 
    p.avatar_url as submitted_by_avatar
FROM public.match_results mr
LEFT JOIN public.profiles p ON mr.submitted_by = p.id;

-- View for messages joined with sender info
CREATE OR REPLACE VIEW v_messages_with_sender AS
SELECT 
    m.*, 
    p.username as sender_username, 
    p.avatar_url as sender_avatar_url
FROM public.messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id;

-- View for wallets in admin panel
CREATE OR REPLACE VIEW v_wallets_admin AS
SELECT 
    w.*, 
    p.username, 
    p.avatar_url
FROM public.wallets w
LEFT JOIN public.profiles p ON w.user_id = p.id;

-- View for fixtures with badge icons (if applicable)
CREATE OR REPLACE VIEW v_fixtures_with_badges AS
SELECT 
    m.*,
    t.name as tournament_name,
    p1.username as player1_username,
    p1.avatar_url as player1_avatar,
    p2.username as player2_username,
    p2.avatar_url as player2_avatar
FROM public.matches m
JOIN public.tournaments t ON m.tournament_id = t.id
LEFT JOIN public.profiles p1 ON m.player1 = p1.id
LEFT JOIN public.profiles p2 ON m.player2 = p2.id;

-- View for standings
CREATE OR REPLACE VIEW v_standings_with_badges AS
SELECT 
    s.*,
    p.username,
    p.avatar_url
FROM public.league_standings s
JOIN public.profiles p ON s.user_id = p.id;


-- 2. CRITICAL FUNCTIONS & RPCs

-- Wrapper for delete cascade if service calls 'purge_tournament'
CREATE OR REPLACE FUNCTION public.purge_tournament(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.delete_tournament_cascade(p_tournament_id);
END;
$$;

-- Function to get verification state
CREATE OR REPLACE FUNCTION public.get_match_verification_state(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_verification_status TEXT;
    v_submissions_count INTEGER;
    v_result RECORD;
BEGIN
    SELECT result_verification_status INTO v_verification_status
    FROM public.matches
    WHERE id = p_match_id;

    SELECT COUNT(*) INTO v_submissions_count
    FROM public.match_results
    WHERE match_id = p_match_id;

    RETURN json_build_object(
        'status', v_verification_status,
        'submissions_count', v_submissions_count
    );
END;
$$;

-- Function to list disputed matches for admin
CREATE OR REPLACE FUNCTION public.get_disputed_matches(p_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matches JSON;
BEGIN
    -- Only allow admins to call this
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RETURN json_build_object('error', 'Unauthorized');
    END IF;

    SELECT json_agg(m.*) INTO v_matches
    FROM (
        SELECT 
            m.id as match_id,
            m.tournament_id,
            t.name as tournament_name,
            m.player1,
            m.player2,
            m.result_verification_status as verification_status,
            p1.username as player1_username,
            p2.username as player2_username
        FROM public.matches m
        JOIN public.tournaments t ON m.tournament_id = t.id
        LEFT JOIN public.profiles p1 ON m.player1 = p1.id
        LEFT JOIN public.profiles p2 ON m.player2 = p2.id
        WHERE m.result_verification_status IN ('disputed', 'single_submission')
    ) m;

    RETURN json_build_object(
        'count', COALESCE(json_array_length(v_matches), 0),
        'disputes', COALESCE(v_matches, '[]'::json)
    );
END;
$$;

-- Function for admin to resolve disputes
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_admin_id UUID,
  p_match_id UUID,
  p_winning_sub_id UUID DEFAULT NULL,
  p_override_score1 INTEGER DEFAULT NULL,
  p_override_score2 INTEGER DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_winner_id UUID;
    v_score1 INTEGER;
    v_score2 INTEGER;
BEGIN
    -- 1. Admin check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RETURN json_build_object('error', 'Unauthorized');
    END IF;

    -- 2. Determine scores
    IF p_winning_sub_id IS NOT NULL THEN
        SELECT player1_score, player2_score INTO v_score1, v_score2
        FROM public.match_results
        WHERE id = p_winning_sub_id;
    ELSE
        v_score1 := p_override_score1;
        v_score2 := p_override_score2;
    END IF;

    -- 3. Determine winner
    SELECT 
        CASE 
            WHEN v_score1 > v_score2 THEN sub.player1
            WHEN v_score2 > v_score1 THEN sub.player2
            ELSE NULL 
        END INTO v_winner_id
    FROM (SELECT player1, player2 FROM public.matches WHERE id = p_match_id) sub;

    -- 4. Update match
    UPDATE public.matches
    SET 
        score1 = v_score1,
        score2 = v_score2,
        winner = v_winner_id,
        status = 'completed',
        result_verification_status = 'verified',
        updated_at = NOW()
    WHERE id = p_match_id;

    RETURN json_build_object('success', true, 'final_score', v_score1 || '-' || v_score2);
END;
$$;

-- GRANT ROLES if needed
GRANT SELECT ON public.v_tournaments_with_creator TO authenticated;
GRANT SELECT ON public.v_registrations_with_users TO authenticated;
GRANT SELECT ON public.v_match_results TO authenticated;
GRANT SELECT ON public.v_messages_with_sender TO authenticated;
GRANT SELECT ON public.v_wallets_admin TO authenticated;
GRANT SELECT ON public.v_fixtures_with_badges TO authenticated;
GRANT SELECT ON public.v_standings_with_badges TO authenticated;
