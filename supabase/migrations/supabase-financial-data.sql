-- ═══════════════════════════════════════════════════════
-- SIPEN — Adiciona campo financial_data na tabela demandas
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

ALTER TABLE demandas
  ADD COLUMN IF NOT EXISTS financial_data jsonb DEFAULT '{}'::jsonb;

-- Índice GIN para buscas dentro do JSONB (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_demandas_financial_data
  ON demandas USING GIN (financial_data);
