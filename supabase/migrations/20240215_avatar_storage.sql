-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar access policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;

-- Policy to allow users to read any avatar (since bucket is public)
CREATE POLICY "Avatar access policy" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy to allow users to upload their own avatar
CREATE POLICY "Avatar insert policy" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own avatar
CREATE POLICY "Avatar update policy" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own avatar
CREATE POLICY "Avatar delete policy" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add avatar_url column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
