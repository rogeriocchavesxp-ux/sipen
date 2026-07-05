-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Eleições — Migração completa (idempotente)
-- Inclui eleicao_processos, eleicao_indicacoes e v_eleicao_form_membros
-- Execute no Supabase SQL Editor do projeto SIPEN
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Processos eleitorais ───────────────────────────────────
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

ALTER TABLE public.eleicao_processos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_sel_auth" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_sel_anon" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_ins_auth" ON public.eleicao_processos;
DROP POLICY IF EXISTS "ep_upd_auth" ON public.eleicao_processos;

CREATE POLICY "ep_sel_auth" ON public.eleicao_processos
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "ep_sel_anon" ON public.eleicao_processos
  FOR SELECT TO anon USING (deleted_at IS NULL AND status IN ('agendado','aberto','encerrado','arquivado'));
CREATE POLICY "ep_ins_auth" ON public.eleicao_processos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ep_upd_auth" ON public.eleicao_processos
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

GRANT SELECT ON public.eleicao_processos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.eleicao_processos TO authenticated;

-- ── 2. Indicações ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleicao_indicacoes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id         UUID        REFERENCES public.eleicao_processos(id),
  indicante_pessoa_id UUID,
  indicante_nome      TEXT,
  indicado_pessoa_id  UUID,
  indicado_nome       TEXT        NOT NULL,
  tipo                TEXT        NOT NULL CHECK (tipo IN ('presbitero','diacono')),
  congregacao         TEXT,
  observacao          TEXT,
  ip_dispositivo      TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ei_processo_idx  ON public.eleicao_indicacoes(processo_id);
CREATE INDEX IF NOT EXISTS ei_indicante_idx ON public.eleicao_indicacoes(indicante_pessoa_id);
CREATE INDEX IF NOT EXISTS ei_tipo_idx      ON public.eleicao_indicacoes(tipo);
CREATE INDEX IF NOT EXISTS ei_criado_idx    ON public.eleicao_indicacoes(criado_em DESC);

ALTER TABLE public.eleicao_indicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ei_select"   ON public.eleicao_indicacoes;
DROP POLICY IF EXISTS "ei_insert"   ON public.eleicao_indicacoes;
DROP POLICY IF EXISTS "ei_sel_anon" ON public.eleicao_indicacoes;
DROP POLICY IF EXISTS "ei_ins_anon" ON public.eleicao_indicacoes;

-- Admin: lê e insere
CREATE POLICY "ei_select" ON public.eleicao_indicacoes
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "ei_insert" ON public.eleicao_indicacoes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Formulário público (anon): lê (para checar duplicata) e insere
CREATE POLICY "ei_sel_anon" ON public.eleicao_indicacoes
  FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "ei_ins_anon" ON public.eleicao_indicacoes
  FOR INSERT TO anon WITH CHECK (true);

GRANT SELECT, INSERT ON public.eleicao_indicacoes TO anon;
GRANT SELECT, INSERT ON public.eleicao_indicacoes TO authenticated;

-- ── 3. View pública de membros ────────────────────────────────
CREATE OR REPLACE VIEW public.v_eleicao_form_membros
WITH (security_invoker = false)
AS
SELECT
  m.pessoa_id,
  p.nome,
  p.data_nascimento,
  m.data_ingresso,
  c.nome AS congregacao
FROM public.membros m
JOIN public.pessoas p ON p.id = m.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = m.congregacao_id
WHERE m.status = 'ativo'
  AND m.deleted_at IS NULL
  AND p.deleted_at IS NULL;

GRANT SELECT ON public.v_eleicao_form_membros TO anon;
GRANT SELECT ON public.v_eleicao_form_membros TO authenticated;
