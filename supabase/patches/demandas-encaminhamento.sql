-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Encaminhamento de Demandas (Departamento / Fornecedor)
-- demandas-encaminhamento.sql  |  Idempotente
-- ═══════════════════════════════════════════════════════════════
-- Fornecedores são membros do departamento "Fornecedores" em
-- dept_administrativos. O vínculo é por responsavel_id → pessoas.
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Nova coluna responsavel_tipo em demandas ────────────

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS responsavel_tipo TEXT
    DEFAULT 'departamento'
    CHECK (responsavel_tipo IN ('departamento','fornecedor'));

-- ── PASSO 2: Novas colunas em demanda_andamentos ─────────────────

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS tipo          TEXT DEFAULT 'andamento';

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS resp_anterior TEXT;

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS resp_novo     TEXT;

-- ── PASSO 3: Atualizar v_demandas ────────────────────────────────
-- DROP necessário porque CREATE OR REPLACE não aceita mudança de colunas

DROP VIEW IF EXISTS public.v_demandas;

CREATE VIEW public.v_demandas AS
SELECT
  d.id,
  d.area,
  d.subcategoria,
  d.titulo,
  d.descricao,
  COALESCE(ps.nome, d.solicitante_txt)  AS solicitante,
  d.solicitante_id,
  COALESCE(pr.nome, d.responsavel_txt)  AS responsavel,
  d.responsavel_id,
  d.responsavel_txt,
  d.responsavel_tipo,
  d.prioridade::text    AS prioridade,
  d.status::text        AS status,
  d.data_abertura,
  d.data_conclusao,
  d.prazo_previsto,
  d.congregacao_id,
  d.financial_data,
  d.created_at          AS criado_em,
  d.updated_at          AS atualizado_em,
  d.id                  AS _row
FROM public.demandas d
LEFT JOIN public.pessoas ps ON ps.id = d.solicitante_id
LEFT JOIN public.pessoas pr ON pr.id = d.responsavel_id
WHERE d.deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
