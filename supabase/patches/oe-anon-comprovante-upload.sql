-- Permite que usuários anônimos façam upload de comprovantes de pagamento
-- Os arquivos ficam na pasta comprovantes/ dentro do bucket campanhas

DROP POLICY IF EXISTS "anon_upload_comprovantes" ON storage.objects;
CREATE POLICY "anon_upload_comprovantes"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'campanhas' AND name LIKE 'comprovantes/%');
