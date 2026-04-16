
-- Create timestamps table
CREATE TABLE public.timestamps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hash TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  server_signature TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index on hash for fast lookups
CREATE INDEX idx_timestamps_hash ON public.timestamps (hash);

-- Index on user_id for "my timestamps" queries
CREATE INDEX idx_timestamps_user_id ON public.timestamps (user_id);

-- Enable RLS
ALTER TABLE public.timestamps ENABLE ROW LEVEL SECURITY;

-- Anyone can look up timestamps by hash (public verification)
CREATE POLICY "Anyone can verify timestamps"
ON public.timestamps
FOR SELECT
USING (true);

-- Only the edge function (service role) inserts rows, so no INSERT policy for anon/authenticated.
-- Authenticated users can view their own timestamps (covered by the SELECT policy above).
