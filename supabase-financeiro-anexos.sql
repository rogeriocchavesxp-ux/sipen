-- ═══════════════════════════════════════════════════════
-- SIPEN — financeiro_anexos: anexos via Supabase Storage
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- Recriar tabela com storage_path (sem colunas Google Drive)
DROP TABLE IF EXISTS public.financeiro_anexos;

CREATE TABLE public.financeiro_anexos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id     uuid REFERENCES public.demandas(id) ON DELETE SET NULL,
  solicitacao_id uuid REFERENCES public.financeiro_solicitacoes(id) ON DELETE SET NULL,
  tipo_arquivo   text NOT NULL CHECK (tipo_arquivo IN ('boleto','nota_fiscal','outro')),
  nome_original  text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'financial-documents',
  storage_path   text NOT NULL,
  mime_type      text,
  tamanho_bytes  bigint,
  criado_por     text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT demanda_ou_solicitacao CHECK (
    (demanda_id IS NOT NULL) OR (solicitacao_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_fin_anexos_demanda      ON public.financeiro_anexos(demanda_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_anexos_solicitacao  ON public.financeiro_anexos(solicitacao_id) WHERE deleted_at IS NULL;

ALTER TABLE public.financeiro_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_fin_anexos" ON public.financeiro_anexos;
CREATE POLICY "allow_all_fin_anexos"
  ON public.financeiro_anexos FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_anexos TO anon, authenticated;
