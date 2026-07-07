-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Portal Público de Chamados (v2 — com RPC SECURITY DEFINER)
-- Execute TODO este bloco de uma vez no Supabase SQL Editor
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

-- ── 3. RPC: inserção pública com SECURITY DEFINER ─────────────
--   Bypassa RLS e o schema cache do PostgREST — mesmo padrão
--   usado para excluir_processo_eleitoral nas eleições.
CREATE OR REPLACE FUNCTION public.registrar_chamado_publico(
  p_area                TEXT,
  p_subcategoria        TEXT,
  p_titulo              TEXT,
  p_descricao           TEXT,
  p_solicitante_nome    TEXT,
  p_solicitante_tel     TEXT,
  p_responsavel         TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.demandas (
    area, subcategoria, titulo, descricao,
    nome_solicitante_externo, telefone_solicitante,
    solicitante, solicitante_txt,
    responsavel, responsavel_txt,
    origem, prioridade, status, data_abertura
  ) VALUES (
    p_area, p_subcategoria, p_titulo, p_descricao,
    p_solicitante_nome, p_solicitante_tel,
    p_solicitante_nome, p_solicitante_nome,
    p_responsavel, p_responsavel,
    'Portal Público', 'Média', 'Aberta', CURRENT_DATE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL  ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon;

-- ── Verificar ──────────────────────────────────────────────────
-- SELECT public.registrar_chamado_publico(
--   'Manutenção','Elétrica','Teste de inserção via portal',
--   'Teste','Nome Teste','(11) 99999-9999','Departamento de Manutenção'
-- );
