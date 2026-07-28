-- ═══════════════════════════════════════════════════════
-- SIPEN — Storage: policy de upload anônimo (link público)
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════
-- Permite que usuários não autenticados (anon) façam upload
-- SOMENTE para o caminho financeiro/publico/* do bucket
-- financial-documents. Uploads autenticados (módulo interno)
-- continuam cobertos pela policy existente "Autenticados podem fazer upload".

CREATE POLICY "Anon upload financeiro publico"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'financial-documents'
    AND name LIKE 'financeiro/publico/%'
  );
