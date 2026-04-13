-- Avatar storage needs UPDATE and DELETE policies for upsert to work.
-- INSERT policy already uses foldername(name)[1] = auth.uid(), so path must be {user_id}/filename.

CREATE POLICY "avatar update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatar delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
