INSERT INTO storage.buckets (id, name, public) VALUES
  ('pitch-decks', 'pitch-decks', false),
  ('avatars', 'avatars', true),
  ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pitch deck upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "pitch deck access" ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-decks' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.introductions i
      JOIN public.startup_applications s ON i.startup_id = s.id
      WHERE i.investor_id = auth.uid()
        AND i.status = 'accepted'
        AND s.id::text = (storage.foldername(name))[1]
    )
  ));

CREATE POLICY "avatar upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
