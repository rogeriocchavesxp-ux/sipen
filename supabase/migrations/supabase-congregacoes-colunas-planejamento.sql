-- ================================================================
-- SIPEN — Adiciona colunas de planejamento ausentes em congregacoes
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE congregacoes
  ADD COLUMN IF NOT EXISTS metas_ano         TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eventos           JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS acoes             JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS departamentos     JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS desafios          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS financeiro_historico JSONB NOT NULL DEFAULT '[]';

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'congregacoes'
  AND column_name IN ('metas_ano','eventos','acoes','departamentos','desafios','financeiro_historico')
ORDER BY column_name;
