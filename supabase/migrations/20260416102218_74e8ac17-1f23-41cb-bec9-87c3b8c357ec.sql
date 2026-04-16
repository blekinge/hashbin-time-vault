
CREATE POLICY "Anyone can view timestamps"
ON public.timestamps
FOR SELECT
TO anon
USING (true);
