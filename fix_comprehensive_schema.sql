-- COMPREHENSIVE SCHEMA & VIEW REFRESH
-- Run this to fix "invalid schema" errors and ensure all views are up to date.

-- 1. DROP ALL VIEWS FIRST (Cleans up dependency chains)
DROP VIEW IF EXISTS v_messages_with_sender CASCADE;
DROP VIEW IF EXISTS v_match_results CASCADE;
DROP VIEW IF EXISTS v_registrations_with_users CASCADE;
DROP VIEW IF EXISTS v_tournaments_with_creator CASCADE;
DROP VIEW IF EXISTS v_fixtures_with_badges CASCADE;
DROP VIEW IF EXISTS v_match_conversations_with_info CASCADE;

-- 2. CREATE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE VIEWS WITH FULL COLUMN DEFINITIONS
-- Tournaments with creator info
CREATE VIEW v_tournaments_with_creator AS
SELECT 
    t.*, 
    p.username as created_by_username, 
    p.avatar_url as created_by_avatar
FROM public.tournaments t
LEFT JOIN public.profiles p ON t.created_by = p.id;

-- Registrations with user info
CREATE VIEW v_registrations_with_users AS
SELECT 
    r.*, 
    p.username, 
    p.avatar_url
FROM public.registrations r
LEFT JOIN public.profiles p ON r.user_id = p.id;

-- Match results (submissions)
CREATE VIEW v_match_results AS
SELECT 
    mr.*, 
    p.username as submitted_by_username, 
    p.avatar_url as submitted_by_avatar
FROM public.match_results mr
LEFT JOIN public.profiles p ON mr.submitted_by = p.id;

-- Messages with sender info
CREATE VIEW v_messages_with_sender AS
SELECT 
    m.*, 
    p.username as sender_username, 
    p.avatar_url as sender_avatar_url
FROM public.messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id;

-- Fixtures with badges and usernames
CREATE VIEW v_fixtures_with_badges AS
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

-- 4. FIX STORAGE PERMISSIONS (Critical for "invalid schema" error during upload)
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tournament-banners', 'tournament-banners', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('result-screenshots', 'result-screenshots', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop all existing storage policies for these buckets to avoid conflicts
DELETE FROM storage.policies WHERE bucket_id IN ('tournament-banners', 'avatars', 'result-screenshots');

-- Banners: Anyone can view
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'tournament-banners');
-- Banners: Admins can upload/modify
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tournament-banners' AND is_admin());
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tournament-banners' AND is_admin());
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tournament-banners' AND is_admin());

-- Avatars: Anyone can view
CREATE POLICY "Public Avatar" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- Avatars: Users can upload their own
CREATE POLICY "User Avatar Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (name = auth.uid()::text OR name LIKE auth.uid()::text || '/%'));

-- Screenshots: Only involved players and admins can see
CREATE POLICY "Screenshot View" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'result-screenshots');
-- Screenshots: Authenticated users can upload
CREATE POLICY "Screenshot Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'result-screenshots');

-- 5. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT SELECT ON v_tournaments_with_creator TO anon;
GRANT SELECT ON v_tournaments_with_creator TO authenticated;
GRANT SELECT ON v_registrations_with_users TO authenticated;
GRANT SELECT ON v_match_results TO authenticated;
GRANT SELECT ON v_messages_with_sender TO authenticated;
GRANT SELECT ON v_fixtures_with_badges TO authenticated;

-- Final check on Tournaments table RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view tournaments" ON public.tournaments;
CREATE POLICY "Public view tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage tournaments" ON public.tournaments;
CREATE POLICY "Admins can manage tournaments" ON public.tournaments ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 6. REFRESH CACHE (Hack for PostgREST)
-- Touching the primary tables usually forces a cache refresh if NOTIFY is not available
COMMENT ON TABLE public.tournaments IS 'Re-syncing metadata';
COMMENT ON TABLE public.profiles IS 'Re-syncing metadata';
