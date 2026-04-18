-- ═══════════════════════════════════════════════════════
-- SIPEN — Atualização da tabela demandas
-- Adiciona coluna subcategoria e atualiza status flow
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. Adiciona coluna subcategoria (se ainda não existir)
ALTER TABLE demandas
  ADD COLUMN IF NOT EXISTS subcategoria text;

-- 2. Garante que data_abertura tem default
ALTER TABLE demandas
  ALTER COLUMN data_abertura SET DEFAULT CURRENT_DATE;

-- 3. Índice para buscas por status e área
CREATE INDEX IF NOT EXISTS idx_demandas_status ON demandas(status);
CREATE INDEX IF NOT EXISTS idx_demandas_area   ON demandas(area);
CREATE INDEX IF NOT EXISTS idx_demandas_resp   ON demandas(responsavel);

-- 4. (Opcional) Verificar constraint de status para os novos valores
-- ALTER TABLE demandas DROP CONSTRAINT IF EXISTS demandas_status_check;
-- ALTER TABLE demandas ADD CONSTRAINT demandas_status_check
--   CHECK (status IN ('Aberta','Em Análise','Em Andamento','Concluída','Cancelada'));
