-- ================================================================
-- SIPEN — Adiciona coluna `online` em congregacao_cultos
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE public.congregacao_cultos
  ADD COLUMN IF NOT EXISTS online integer DEFAULT 0;

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'congregacao_cultos' AND column_name = 'online';
