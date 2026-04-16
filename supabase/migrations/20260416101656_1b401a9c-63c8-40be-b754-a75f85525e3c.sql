
-- Add new hash columns
ALTER TABLE public.timestamps
ADD COLUMN hash_md5 text,
ADD COLUMN hash_sha1 text,
ADD COLUMN hash_sha512 text;

-- Recreate the public view to include new columns
DROP VIEW IF EXISTS public.timestamps_public;
CREATE VIEW public.timestamps_public
WITH (security_invoker=on) AS
  SELECT id, hash, hash_md5, hash_sha1, hash_sha512, file_size, created_at, server_signature
  FROM public.timestamps;
