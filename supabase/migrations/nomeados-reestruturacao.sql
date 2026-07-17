-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Reestruturação do módulo Nomeados
-- Central de Nomeações Anuais da IPPenha
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. ADICIONAR COLUNAS À TABELA nomeados
-- ────────────────────────────────────────────────────────────────

ALTER TABLE nomeados
  ADD COLUMN IF NOT EXISTS ano            integer,
  ADD COLUMN IF NOT EXISTS tipo_nomeacao  text CHECK (tipo_nomeacao IN ('lider','membro','outro')),
  ADD COLUMN IF NOT EXISTS funcao_lider   text CHECK (funcao_lider IN ('lider_area','coordenador','supervisor')),
  ADD COLUMN IF NOT EXISTS tipo_membro    text CHECK (tipo_membro IN ('sociedade','ministerio','governo','comissao','grupo','congregacao')),
  ADD COLUMN IF NOT EXISTS area           text,
  ADD COLUMN IF NOT EXISTS departamento   text,
  ADD COLUMN IF NOT EXISTS pessoa_id      uuid,
  ADD COLUMN IF NOT EXISTS data_inicio    date,
  ADD COLUMN IF NOT EXISTS data_fim       date,
  ADD COLUMN IF NOT EXISTS ata_origem     text,
  ADD COLUMN IF NOT EXISTS deleted_at     timestamptz;

-- ────────────────────────────────────────────────────────────────
-- 2. MARCAR REGISTROS EXISTENTES COM ANO 2026
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET ano = 2026 WHERE ano IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 3. CLASSIFICAR SUPERVISORES (cargo contém supervisor/supervisão)
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'lider',
  funcao_lider  = 'supervisor'
WHERE tipo_nomeacao IS NULL
  AND (
    lower(unaccent(cargo)) LIKE '%supervisor%'
    OR lower(unaccent(cargo)) LIKE '%supervisao%'
    OR lower(unaccent(cargo)) = 'pastor supervisor'
    OR lower(unaccent(cargo)) = 'pastor'
  );

-- ────────────────────────────────────────────────────────────────
-- 4. CLASSIFICAR COORDENADORES
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'lider',
  funcao_lider  = 'coordenador'
WHERE tipo_nomeacao IS NULL
  AND (
    lower(unaccent(cargo)) LIKE 'coordena%'
    OR lower(unaccent(cargo)) = 'presidente'
    OR lower(unaccent(cargo)) = 'vice-presidente'
    OR lower(unaccent(cargo)) LIKE 'dir%'
    OR lower(unaccent(cargo)) LIKE 'regente%'
  );

-- ────────────────────────────────────────────────────────────────
-- 5. CLASSIFICAR LÍDERES DE ÁREA
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'lider',
  funcao_lider  = 'lider_area'
WHERE tipo_nomeacao IS NULL
  AND (
    lower(unaccent(cargo)) LIKE 'lider%'
    OR lower(unaccent(cargo)) LIKE 'lideranca%'
    OR lower(unaccent(cargo)) = 'responsavel'
    OR lower(unaccent(cargo)) LIKE 'gestao%'
    OR lower(unaccent(cargo)) LIKE 'gerenciamento%'
  );

-- ────────────────────────────────────────────────────────────────
-- 6. CLASSIFICAR MEMBROS DE SOCIEDADES INTERNAS
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'membro',
  tipo_membro   = 'sociedade',
  area          = orgao
WHERE tipo_nomeacao IS NULL
  AND orgao_tipo = 'sociedade';

-- ────────────────────────────────────────────────────────────────
-- 7. CLASSIFICAR MEMBROS DE MINISTÉRIOS
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'membro',
  tipo_membro   = 'ministerio',
  area          = orgao
WHERE tipo_nomeacao IS NULL
  AND orgao_tipo = 'ministerio';

-- ────────────────────────────────────────────────────────────────
-- 8. DEMAIS REGISTROS (governo, comissão, grupo, congregação)
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET
  tipo_nomeacao = 'outro',
  tipo_membro   = orgao_tipo,
  area          = orgao
WHERE tipo_nomeacao IS NULL;

-- Garantir que area seja preenchida para todos
UPDATE nomeados SET area = orgao WHERE area IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 9. TABELA: nomeacoes_anuais
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nomeacoes_anuais (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ano             integer     NOT NULL,
  titulo          text        NOT NULL,
  descricao       text,
  periodo_inicio  date,
  periodo_fim     date,
  status          text        NOT NULL DEFAULT 'rascunho'
                              CHECK (status IN ('rascunho','em_preparacao','aprovada','publicada','encerrada','arquivada')),
  ata_origem      text,
  data_aprovacao  date,
  responsavel     text,
  observacoes     text,
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now(),
  CONSTRAINT uq_nomeacoes_anuais_ano UNIQUE (ano)
);

INSERT INTO nomeacoes_anuais (ano, titulo, status, periodo_inicio, periodo_fim, responsavel)
VALUES (2026, 'Nomeações 2026', 'publicada', '2026-01-01', '2026-12-31', 'Secretaria')
ON CONFLICT (ano) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 10. RLS
-- ────────────────────────────────────────────────────────────────

ALTER TABLE nomeacoes_anuais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomeacoes_anuais_sel" ON nomeacoes_anuais;
DROP POLICY IF EXISTS "nomeacoes_anuais_ins" ON nomeacoes_anuais;
DROP POLICY IF EXISTS "nomeacoes_anuais_upd" ON nomeacoes_anuais;

CREATE POLICY "nomeacoes_anuais_sel" ON nomeacoes_anuais FOR SELECT TO authenticated USING (true);
CREATE POLICY "nomeacoes_anuais_ins" ON nomeacoes_anuais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nomeacoes_anuais_upd" ON nomeacoes_anuais FOR UPDATE TO authenticated USING (true);

-- Garantir que nomeados tem RLS habilitado e políticas básicas
ALTER TABLE nomeados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomeados_sel" ON nomeados;
DROP POLICY IF EXISTS "nomeados_ins" ON nomeados;
DROP POLICY IF EXISTS "nomeados_upd" ON nomeados;
DROP POLICY IF EXISTS "nomeados_del" ON nomeados;

CREATE POLICY "nomeados_sel" ON nomeados FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "nomeados_ins" ON nomeados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nomeados_upd" ON nomeados FOR UPDATE TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "nomeados_del" ON nomeados FOR DELETE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────────
-- 11. ÍNDICES
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_nomeados_ano           ON nomeados(ano);
CREATE INDEX IF NOT EXISTS idx_nomeados_tipo_nomeacao  ON nomeados(tipo_nomeacao);
CREATE INDEX IF NOT EXISTS idx_nomeados_funcao_lider   ON nomeados(funcao_lider);
CREATE INDEX IF NOT EXISTS idx_nomeados_tipo_membro    ON nomeados(tipo_membro);
CREATE INDEX IF NOT EXISTS idx_nomeados_deleted_at     ON nomeados(deleted_at) WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 12. VERIFICAÇÃO
-- ────────────────────────────────────────────────────────────────

SELECT
  tipo_nomeacao,
  funcao_lider,
  tipo_membro,
  COUNT(*) AS total
FROM nomeados
WHERE deleted_at IS NULL
GROUP BY tipo_nomeacao, funcao_lider, tipo_membro
ORDER BY tipo_nomeacao, funcao_lider, tipo_membro;
