-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: v_demandas inclui financial_data
-- Necessário para que usuários com perfil restrito (que leem via
-- v_demandas em vez da tabela direta) recebam o campo financial_data
-- e o frontend possa exibir o valor financeiro das demandas.
-- Execute no SQL Editor do Supabase Dashboard. Idempotente.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_demandas AS
SELECT
  d.id,
  d.area,
  d.subcategoria,
  d.titulo,
  d.descricao,
  COALESCE(ps.nome, d.solicitante_txt) AS solicitante,
  d.solicitante_id,
  COALESCE(pr.nome, d.responsavel_txt) AS responsavel,
  d.responsavel_id,
  d.prioridade::text  AS prioridade,
  d.status::text      AS status,
  d.data_abertura,
  d.data_conclusao,
  d.prazo_previsto,
  d.congregacao_id,
  d.financial_data,
  d.created_at        AS criado_em,
  d.updated_at        AS atualizado_em,
  d.id                AS _row
FROM public.demandas d
LEFT JOIN public.pessoas ps ON ps.id = d.solicitante_id
LEFT JOIN public.pessoas pr ON pr.id = d.responsavel_id
WHERE d.deleted_at IS NULL;

-- Verificação
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'v_demandas' AND column_name = 'financial_data';
