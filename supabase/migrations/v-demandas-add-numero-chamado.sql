-- Adiciona numero_chamado à view v_demandas
-- Aplicar no Supabase SQL Editor

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
  d.responsavel_txt,
  d.responsavel_tipo,
  d.prioridade::text   AS prioridade,
  d.status::text       AS status,
  d.data_abertura,
  d.data_conclusao,
  d.prazo_previsto,
  d.congregacao_id,
  d.financial_data,
  d.created_at         AS criado_em,
  d.updated_at         AS atualizado_em,
  d.id                 AS _row,
  d.numero_chamado
FROM public.demandas d
LEFT JOIN public.pessoas ps ON ps.id = d.solicitante_id
LEFT JOIN public.pessoas pr ON pr.id = d.responsavel_id
WHERE d.deleted_at IS NULL;

-- v_demandas: apenas authenticated (igual ao original)
GRANT SELECT ON public.v_demandas TO authenticated;

-- eleicoes.html usa role anon para buscar lista de pessoas (id, nome)
-- a security-hardening revogou esse acesso; restaura o mínimo necessário
GRANT SELECT (id, nome, deleted_at) ON public.pessoas TO anon;
