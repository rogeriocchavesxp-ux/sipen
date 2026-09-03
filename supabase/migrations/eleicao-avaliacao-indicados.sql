-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Fase de Avaliação dos Indicados
-- Tabela que registra o resultado da avaliação do Conselho sobre
-- cada pessoa indicada, antes de se tornar candidato oficial.
-- Execute no Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.eleicao_avaliacao_indicados (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id      UUID        NOT NULL REFERENCES public.eleicao_processos(id) ON DELETE CASCADE,
  nome             TEXT        NOT NULL,
  tipo             TEXT        NOT NULL CHECK (tipo IN ('presbitero','diacono')),
  pessoa_id        UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  avaliacao        TEXT        NOT NULL DEFAULT 'pendente'
                               CHECK (avaliacao IN ('pendente','aprovado','reprovado','declinou')),
  avaliacao_obs    TEXT,
  total_indicacoes INT         NOT NULL DEFAULT 0,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (processo_id, nome, tipo)
);

CREATE INDEX IF NOT EXISTS idx_eleicao_aval_proc ON public.eleicao_avaliacao_indicados (processo_id);

-- RLS: mesmo padrão das outras tabelas eleitorais
ALTER TABLE public.eleicao_avaliacao_indicados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados podem tudo em eleicao_avaliacao_indicados"
  ON public.eleicao_avaliacao_indicados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
