-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Tabela demandas + Portal Público de Chamados
-- Execute TODO este bloco de uma vez no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Cria a tabela demandas (idempotente) ───────────────────
--   Usa TEXT para status/prioridade (sem enum) para evitar
--   conflitos com migrações anteriores.
--   Sem FK constraints para portabilidade (tabela pessoas pode
--   não existir ainda).
CREATE TABLE IF NOT EXISTS public.demandas (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  area                     TEXT        NOT NULL,
  subcategoria             TEXT,
  titulo                   TEXT        NOT NULL,
  descricao                TEXT,
  -- Solicitante: "solicitante" é o nome direto (payload interno);
  --              "solicitante_txt" é alias usado na view e filtros
  solicitante              TEXT,
  solicitante_txt          TEXT,
  solicitante_id           UUID,
  -- Responsável: idem
  responsavel              TEXT,
  responsavel_txt          TEXT,
  responsavel_id           UUID,
  prioridade               TEXT        NOT NULL DEFAULT 'Média',
  status                   TEXT        NOT NULL DEFAULT 'Aberta',
  data_abertura            DATE        NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao           DATE,
  prazo_previsto           DATE,
  congregacao_id           UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID,
  deleted_at               TIMESTAMPTZ,
  financial_data           JSONB,
  -- Portal público
  nome_solicitante_externo TEXT,
  telefone_solicitante     TEXT,
  origem                   TEXT        NOT NULL DEFAULT 'Interna'
);

-- ── 2. Adiciona colunas novas se a tabela já existia ─────────
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS solicitante              TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_txt          TEXT,
  ADD COLUMN IF NOT EXISTS responsavel              TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_txt          TEXT,
  ADD COLUMN IF NOT EXISTS financial_data           JSONB,
  ADD COLUMN IF NOT EXISTS nome_solicitante_externo TEXT,
  ADD COLUMN IF NOT EXISTS telefone_solicitante     TEXT,
  ADD COLUMN IF NOT EXISTS origem                   TEXT NOT NULL DEFAULT 'Interna';

-- ── 3. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_demandas_status      ON public.demandas(status)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_area        ON public.demandas(area);
CREATE INDEX IF NOT EXISTS idx_demandas_origem      ON public.demandas(origem)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_created     ON public.demandas(created_at DESC);

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dem_sel_auth"  ON public.demandas;
DROP POLICY IF EXISTS "dem_ins_auth"  ON public.demandas;
DROP POLICY IF EXISTS "dem_upd_auth"  ON public.demandas;

CREATE POLICY "dem_sel_auth" ON public.demandas
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "dem_ins_auth" ON public.demandas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dem_upd_auth" ON public.demandas
  FOR UPDATE TO authenticated USING (deleted_at IS NULL) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.demandas TO authenticated;

-- ── 5. View v_demandas ───────────────────────────────────────
--   Expõe alias "solicitante" e "responsavel" lidos pelo módulo;
--   sem JOIN com pessoas (tabela pode não existir ainda).
CREATE OR REPLACE VIEW public.v_demandas AS
SELECT
  d.id,
  d.area,
  d.subcategoria,
  d.titulo,
  d.descricao,
  COALESCE(d.solicitante, d.solicitante_txt)   AS solicitante,
  d.solicitante_id,
  d.solicitante_txt,
  COALESCE(d.responsavel, d.responsavel_txt)   AS responsavel,
  d.responsavel_id,
  d.responsavel_txt,
  d.prioridade,
  d.status,
  d.data_abertura,
  d.data_conclusao,
  d.prazo_previsto,
  d.congregacao_id,
  d.created_at               AS criado_em,
  d.updated_at               AS atualizado_em,
  d.id                       AS _row,
  d.financial_data,
  d.nome_solicitante_externo,
  d.telefone_solicitante,
  d.origem,
  d.numero_chamado
FROM public.demandas d
WHERE d.deleted_at IS NULL;

GRANT SELECT ON public.v_demandas TO authenticated;

-- ── 6. Função RPC para inserção pública ──────────────────────
--   SECURITY DEFINER: bypassa RLS e o schema cache do PostgREST.
--   Mesmo padrão de excluir_processo_eleitoral.
DROP FUNCTION IF EXISTS public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.registrar_chamado_publico(
  p_area               TEXT,
  p_subcategoria       TEXT,
  p_titulo             TEXT,
  p_descricao          TEXT,
  p_solicitante_nome   TEXT,
  p_solicitante_tel    TEXT,
  p_responsavel        TEXT
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
    solicitante, solicitante_txt,
    nome_solicitante_externo, telefone_solicitante,
    responsavel, responsavel_txt,
    origem, prioridade, status, data_abertura
  ) VALUES (
    p_area, p_subcategoria, p_titulo, p_descricao,
    p_solicitante_nome, p_solicitante_nome,
    p_solicitante_nome, p_solicitante_tel,
    p_responsavel, p_responsavel,
    'Portal Público', 'Média', 'Aberta', CURRENT_DATE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon;

-- ── Teste (opcional — execute separadamente para verificar) ───
-- SELECT public.registrar_chamado_publico(
--   'Manutenção', 'Elétrica', 'Teste portal', 'Descrição teste',
--   'Nome Teste', '(11) 99999-9999', 'Departamento de Manutenção'
-- );
-- SELECT id, titulo, origem, nome_solicitante_externo FROM public.demandas ORDER BY created_at DESC LIMIT 1;
