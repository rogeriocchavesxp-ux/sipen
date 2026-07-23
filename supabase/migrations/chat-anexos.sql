-- Chat: suporte a anexos (imagens, PDFs, documentos)
-- Executar no Supabase SQL Editor

-- 1. Adicionar colunas de anexo
ALTER TABLE public.chat_mensagens
  ADD COLUMN IF NOT EXISTS anexo_url  TEXT,
  ADD COLUMN IF NOT EXISTS anexo_nome TEXT,
  ADD COLUMN IF NOT EXISTS anexo_tipo TEXT;

-- 2. Tornar texto opcional (mensagem pode ser só um arquivo)
ALTER TABLE public.chat_mensagens ALTER COLUMN texto DROP NOT NULL;

-- 3. Remover constraint antiga que exigia texto não-vazio
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_texto_check;

-- 4. Nova constraint: exige pelo menos texto OU anexo
ALTER TABLE public.chat_mensagens
  ADD CONSTRAINT chat_mensagens_has_content
  CHECK (
    (texto IS NOT NULL AND char_length(trim(texto)) > 0)
    OR
    (anexo_url IS NOT NULL)
  );

-- 5. Storage RLS: usuários autenticados podem fazer upload em chat-anexos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('chat-anexos', 'chat-anexos', true, 10485760)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "chat_anexos_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-anexos');

CREATE POLICY IF NOT EXISTS "chat_anexos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-anexos');
