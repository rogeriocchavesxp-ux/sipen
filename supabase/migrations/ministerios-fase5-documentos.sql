-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios Fase 5: tabela ministerio_documentos
-- Executar no Supabase SQL Editor
--
-- ATENÇÃO: Criar manualmente no Supabase Dashboard:
--   Storage → New Bucket → Name: "ministerios-docs" → Public: true
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ministerio_documentos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'outro'
                             CHECK (tipo IN ('regulamento','manual','ata','formulario','outro')),
  storage_path   text        NOT NULL,
  mime_type      text,
  tamanho        bigint,
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_ministerio ON public.ministerio_documentos(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_doc_data       ON public.ministerio_documentos(criado_em DESC);

ALTER TABLE public.ministerio_documentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all_documentos"
    ON public.ministerio_documentos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON public.ministerio_documentos TO authenticated;

-- Policies do Storage (após criar o bucket ministerios-docs):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ministerios-docs', 'ministerios-docs', true)
--   ON CONFLICT DO NOTHING;
-- CREATE POLICY "auth_upload_min_docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ministerios-docs');
-- CREATE POLICY "auth_delete_min_docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ministerios-docs');
-- CREATE POLICY "public_read_min_docs" ON storage.objects FOR SELECT USING (bucket_id = 'ministerios-docs');
