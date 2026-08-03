-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Encaminhamento de Demandas para Fornecedores
-- demandas-encaminhamento.sql  |  Idempotente
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Novas colunas em demandas ───────────────────────────

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS responsavel_tipo TEXT
    DEFAULT 'departamento'
    CHECK (responsavel_tipo IN ('departamento','fornecedor'));

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID
    REFERENCES public.contratos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demandas_fornecedor
  ON public.demandas(fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;

-- ── PASSO 2: Novas colunas em demanda_andamentos ─────────────────

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS tipo          TEXT DEFAULT 'andamento';

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS resp_anterior TEXT;

ALTER TABLE public.demanda_andamentos
  ADD COLUMN IF NOT EXISTS resp_novo     TEXT;

-- ── PASSO 3: Atualizar v_demandas para incluir novos campos ──────

CREATE OR REPLACE VIEW public.v_demandas AS
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
  d.fornecedor_id,
  ct.fornecedor                          AS fornecedor_nome,
  ct.contato_fornecedor                  AS fornecedor_contato,
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
LEFT JOIN public.pessoas  ps ON ps.id  = d.solicitante_id
LEFT JOIN public.pessoas  pr ON pr.id  = d.responsavel_id
LEFT JOIN public.contratos ct ON ct.id = d.fornecedor_id
WHERE d.deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';

-- ── VALIDAÇÃO ─────────────────────────────────────────────────────
-- SELECT responsavel_tipo, fornecedor_id, COUNT(*)
-- FROM public.demandas WHERE deleted_at IS NULL
-- GROUP BY responsavel_tipo, fornecedor_id IS NOT NULL;
