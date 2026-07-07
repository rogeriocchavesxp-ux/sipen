-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Portal Público de Chamados
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Novos campos na tabela demandas ───────────────────────
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS nome_solicitante_externo TEXT,
  ADD COLUMN IF NOT EXISTS telefone_solicitante     TEXT,
  ADD COLUMN IF NOT EXISTS origem                   TEXT NOT NULL DEFAULT 'Interna'
    CHECK (origem IN ('Interna', 'Portal Público', 'API', 'Importação'));

-- ── 2. Atualiza a view v_demandas para incluir novos campos ──
CREATE OR REPLACE VIEW public.v_demandas AS
SELECT
  d.id, d.area, d.subcategoria, d.titulo, d.descricao,
  COALESCE(ps.nome, d.solicitante_txt) AS solicitante, d.solicitante_id,
  COALESCE(pr.nome, d.responsavel_txt) AS responsavel, d.responsavel_id,
  d.prioridade::text  AS prioridade,
  d.status::text      AS status,
  d.data_abertura, d.data_conclusao, d.prazo_previsto, d.congregacao_id,
  d.created_at        AS criado_em,
  d.updated_at        AS atualizado_em,
  d.id                AS _row,
  d.nome_solicitante_externo,
  d.telefone_solicitante,
  d.origem
FROM public.demandas d
LEFT JOIN public.pessoas ps ON ps.id = d.solicitante_id
LEFT JOIN public.pessoas pr ON pr.id = d.responsavel_id
WHERE d.deleted_at IS NULL;

-- ── 3. RLS: anon pode inserir apenas via Portal Público ───────
DROP POLICY IF EXISTS "dem_ins_portal_pub" ON public.demandas;
CREATE POLICY "dem_ins_portal_pub" ON public.demandas
  FOR INSERT TO anon
  WITH CHECK (origem = 'Portal Público');

-- ── Verificar ──────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'demandas' AND table_schema = 'public'
-- ORDER BY ordinal_position;
