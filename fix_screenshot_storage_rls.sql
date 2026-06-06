-- SCREENSHOT STORAGE BUCKET & RLS POLICIES REMEDIAL SCRIPT
-- Run this in your Supabase SQL Editor if you are experiencing the error:
-- "new row violates row-level security policy" on uploading match screenshots.

-- 1. Ensure the 'result-screenshots' bucket exists and is marked private
INSERT INTO storage.buckets (id, name, public)
VALUES ('result-screenshots', 'result-screenshots', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Drop any conflicting or stale policies for this bucket on storage.objects
DROP POLICY IF EXISTS "Screenshot View" ON storage.objects;
DROP POLICY IF EXISTS "Screenshot Upload" ON storage.objects;
DROP POLICY IF EXISTS "Screenshot Update" ON storage.objects;
DROP POLICY IF EXISTS "Screenshot Delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated screenshots upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated screenshots view" ON storage.objects;

-- 3. Create permissive but secure SELECT policy
-- Anyone authenticated can view screenshots (involved players, admins, and teammates depend on application flow)
CREATE POLICY "Screenshot View" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'result-screenshots');

-- 4. Create secure INSERT policy
-- Any authenticated user can upload their game screenshot to this bucket
CREATE POLICY "Screenshot Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'result-screenshots');

-- 5. Create secure UPDATE policy
-- Allows participants to update their files if needed
CREATE POLICY "Screenshot Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'result-screenshots');

-- 6. Create secure DELETE policy
-- Prevent accidental removal but allow signed/privileged removal when necessary
CREATE POLICY "Screenshot Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'result-screenshots');
