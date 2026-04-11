INSERT INTO storage.buckets (id, name, public)
VALUES ('user-backups', 'user-backups', false);

CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can upload own backups"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can update own backups"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-backups' AND auth.uid()::text = (storage.foldername(name))[2]);