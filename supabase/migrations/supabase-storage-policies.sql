-- ═══════════════════════════════════════════════════════
-- SIPEN — Supabase Storage: bucket financial-documents
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. Criar o bucket (privado — URLs assinadas geradas sob demanda)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-documents',
  'financial-documents',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf','image/jpeg','image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: upload — somente autenticados
CREATE POLICY "Autenticados podem fazer upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'financial-documents');

-- 3. Policy: leitura — somente autenticados
CREATE POLICY "Autenticados podem ler"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'financial-documents');

-- 4. Policy: delete — somente autenticados
CREATE POLICY "Autenticados podem deletar os próprios uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'financial-documents'
    AND owner = auth.uid()
  );
