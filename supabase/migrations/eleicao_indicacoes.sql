-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Eleições / Indicações de Oficiais
-- Tabela para registro de indicações de diáconos e presbíteros
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.eleicao_indicacoes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  indicante_pessoa_id UUID        REFERENCES public.pessoas(id),
  indicante_nome      TEXT,
  indicado_pessoa_id  UUID        REFERENCES public.pessoas(id),
  indicado_nome       TEXT        NOT NULL,
  tipo                TEXT        NOT NULL CHECK (tipo IN ('presbitero', 'diacono')),
  observacao          TEXT,
  congregacao         TEXT,
  ip_dispositivo      TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ei_indicante_idx ON public.eleicao_indicacoes(indicante_pessoa_id);
CREATE INDEX IF NOT EXISTS ei_indicado_idx  ON public.eleicao_indicacoes(indicado_pessoa_id);
CREATE INDEX IF NOT EXISTS ei_tipo_idx      ON public.eleicao_indicacoes(tipo);
CREATE INDEX IF NOT EXISTS ei_criado_idx    ON public.eleicao_indicacoes(criado_em DESC);

-- RLS
ALTER TABLE public.eleicao_indicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ei_select" ON public.eleicao_indicacoes;
DROP POLICY IF EXISTS "ei_insert" ON public.eleicao_indicacoes;

CREATE POLICY "ei_select" ON public.eleicao_indicacoes
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "ei_insert" ON public.eleicao_indicacoes
  FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.eleicao_indicacoes TO authenticated;
