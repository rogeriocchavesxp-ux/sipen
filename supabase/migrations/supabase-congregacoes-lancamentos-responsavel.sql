-- ================================================================
-- SIPEN — Adiciona coluna responsavel em congregacao_lancamentos
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE congregacao_lancamentos
  ADD COLUMN IF NOT EXISTS responsavel TEXT DEFAULT '';
