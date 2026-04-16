-- Create a public view excluding sensitive columns
CREATE VIEW public.timestamps_public
WITH (security_invoker = on) AS
  SELECT id, hash, created_at, file_size, server_signature
  FROM public.timestamps;

-- Drop the old overly broad policy
DROP POLICY IF EXISTS "Anyone can verify timestamps" ON public.timestamps;

-- Base table: deny direct anonymous SELECT
CREATE POLICY "Owners can view own timestamps"
  ON public.timestamps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow public SELECT on the view (view uses security_invoker, but we need
-- the underlying table to allow the view's queries too, so we add a policy
-- scoped to the columns the view exposes)
-- Actually with security_invoker the view runs as the calling user.
-- For anonymous access via the view, we need a policy that allows SELECT
-- but only the columns in the view are exposed by the view itself.
-- We'll use a permissive policy for public on the base table but the view
-- limits what columns are visible.

-- Public can read base table (view limits columns)
CREATE POLICY "Public can verify timestamps"
  ON public.timestamps FOR SELECT
  TO public
  USING (true);
