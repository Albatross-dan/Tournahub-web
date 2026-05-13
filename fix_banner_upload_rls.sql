-- Fix for Storage RLS Policies (tournament-banners bucket)
-- Allows authenticated administrators to upload banners

-- 1. Ensure tournament-banners bucket exists and is PUBLIC
-- Public bucket allows anyone with the URL to view the image directly
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-banners', 'tournament-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy to allow uploads (INSERT) for authenticated administrators
-- We check the 'role' column in public.profiles table
DROP POLICY IF EXISTS "Admins can upload tournament banners" ON storage.objects;
CREATE POLICY "Admins can upload tournament banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-banners' AND
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- 3. Policy to allow anyone (even unauthenticated) to view tournament banners
-- (Since it is a public bucket, SELECT should be allowed)
DROP POLICY IF EXISTS "Public can view tournament banners" ON storage.objects;
CREATE POLICY "Public can view tournament banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'tournament-banners');

-- 4. Policy to allow admins to update their banners
DROP POLICY IF EXISTS "Admins can update tournament banners" ON storage.objects;
CREATE POLICY "Admins can update tournament banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tournament-banners' AND
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- 5. Policy to allow admins to delete their banners
DROP POLICY IF EXISTS "Admins can delete tournament banners" ON storage.objects;
CREATE POLICY "Admins can delete tournament banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-banners' AND
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- 6. Ensure Tournaments table allows admins to update the banner_url
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins can update tournaments" 
ON public.tournaments FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
CREATE POLICY "Admins can insert tournaments" 
ON public.tournaments FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
