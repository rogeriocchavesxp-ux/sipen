-- ═══════════════════════════════════════════════════════
-- SIPEN — Supabase Storage: bucket conselho-documentos
-- Criado em: 2026-05-23
-- ═══════════════════════════════════════════════════════

-- 1. Criar o bucket (privado — URLs assinadas geradas sob demanda)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conselho-documentos',
  'conselho-documentos',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: upload — somente autenticados
CREATE POLICY "conselho_docs_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'conselho-documentos');

-- 3. Policy: leitura — somente autenticados
CREATE POLICY "conselho_docs_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'conselho-documentos');

-- 4. Policy: atualização — somente autenticados
CREATE POLICY "conselho_docs_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'conselho-documentos');

-- 5. Policy: exclusão — somente autenticados
CREATE POLICY "conselho_docs_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'conselho-documentos');
