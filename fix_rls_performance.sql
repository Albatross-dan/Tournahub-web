-- OPTIMIZATION FOR RLS TIMEOUTS
-- This replaces standard subqueries with a more efficient check
-- and fixes the missing parentheses for auth.uid()

-- 1. Create a helper function that caches the admin status for the transaction
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Update Tournament Policies
DROP POLICY IF EXISTS "Admins can manage tournaments" ON public.tournaments;
CREATE POLICY "Admins can manage tournaments" ON public.tournaments FOR ALL 
TO authenticated 
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

-- 3. Update Storage Policies (Most common source of upload timeouts)
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'tournament-banners' AND public.check_is_admin());

DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'tournament-banners' AND public.check_is_admin());

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'tournament-banners' AND public.check_is_admin());

-- 4. Update other critical policies that might be slow
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.registrations;
CREATE POLICY "Admins can manage registrations" ON public.registrations FOR ALL 
TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;
CREATE POLICY "Admins can manage matches" ON public.matches FOR ALL 
TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage results" ON public.match_results;
CREATE POLICY "Admins can manage results" ON public.match_results FOR ALL 
TO authenticated
USING (public.check_is_admin());
