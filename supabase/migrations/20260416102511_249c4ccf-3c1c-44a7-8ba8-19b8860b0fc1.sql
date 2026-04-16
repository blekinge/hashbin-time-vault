-- Rename hash column to hash_sha256
ALTER TABLE public.timestamps RENAME COLUMN hash TO hash_sha256;

-- Recreate the public view with the new column name
DROP VIEW IF EXISTS public.timestamps_public;
CREATE VIEW public.timestamps_public AS
  SELECT id, hash_sha256, hash_md5, hash_sha1, hash_sha512, file_size, created_at, server_signature
  FROM public.timestamps;