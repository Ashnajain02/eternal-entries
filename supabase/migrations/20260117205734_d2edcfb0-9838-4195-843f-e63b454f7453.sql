-- Make journal-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'journal-images';

-- Remove the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view journal images" ON storage.objects;

-- Add authenticated SELECT policy for users to view their own images
CREATE POLICY "Users can view their own journal images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);