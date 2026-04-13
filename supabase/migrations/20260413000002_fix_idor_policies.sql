DROP POLICY IF EXISTS "notifications: authenticated insert" ON public.notifications;

CREATE POLICY "notifications: own insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fir: investor update own"
  ON public.founder_intro_requests FOR UPDATE
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);
