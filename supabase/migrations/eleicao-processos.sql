-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Processos Eleitorais v2
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.eleicao_processos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT        NOT NULL,
  ano               INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  descricao         TEXT,
  orientacoes       TEXT,
  tipo              TEXT        NOT NULL DEFAULT 'ambos'
                                CHECK (tipo IN ('presbiteros','diaconos','ambos')),
  data_abertura     DATE,
  data_encerramento DATE,
  status            TEXT        NOT NULL DEFAULT 'rascunho'
                                CHECK (status IN ('rascunho','agendado','aberto','encerrado','arquivado')),
  slug              TEXT        NOT NULL UNIQUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.eleicao_indicacoes
  ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES public.eleicao_processos(id);

CREATE INDEX IF NOT EXISTS ep_status_idx   ON public.eleicao_processos(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ep_slug_idx     ON public.eleicao_processos(slug);
CREATE INDEX IF NOT EXISTS ep_ano_idx      ON public.eleicao_processos(ano DESC);
CREATE INDEX IF NOT EXISTS ei_processo_idx ON public.eleicao_indicacoes(processo_id);

ALTER TABLE public.eleicao_processos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_sel_auth" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_sel_anon" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_ins_auth" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_upd_auth" ON public.eleicao_processos;

CREATE POLICY "ep_sel_auth" ON public.eleicao_processos
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "ep_sel_anon" ON public.eleicao_processos
  FOR SELECT TO anon     USING (deleted_at IS NULL AND status IN ('agendado','aberto','encerrado','arquivado'));
CREATE POLICY "ep_ins_auth" ON public.eleicao_processos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ep_upd_auth" ON public.eleicao_processos
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

GRANT SELECT              ON public.eleicao_processos TO anon;
GRANT SELECT,INSERT,UPDATE ON public.eleicao_processos TO authenticated;
