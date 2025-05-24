-- Enable RLS on the user table if not already enabled
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON "user"
FOR SELECT
USING (auth.uid() = auth_id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON "user"
FOR UPDATE
USING (auth.uid() = auth_id);

-- Create policy for storage bucket
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-image' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to read profile images
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-image');

-- Create policy to allow users to update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-image' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-image' AND
  auth.uid()::text = (storage.foldername(name))[1]
); 

-- Reverse

-- Drop all storage policies
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- Drop user table policies
DROP POLICY IF EXISTS "Users can view own profile" ON "user";
DROP POLICY IF EXISTS "Users can update own profile" ON "user";

-- Disable RLS on user table (optional, only if you want to completely remove RLS)
-- ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;