-- Drop the broad public policy
DROP POLICY IF EXISTS "Public can verify timestamps" ON public.timestamps;

-- Recreate view without security_invoker so it runs as owner (bypasses RLS)
-- This is safe because the view itself limits which columns are exposed
DROP VIEW IF EXISTS public.timestamps_public;
CREATE VIEW public.timestamps_public AS
  SELECT id, hash, created_at, file_size, server_signature
  FROM public.timestamps;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.timestamps_public TO anon;
GRANT SELECT ON public.timestamps_public TO authenticated;
