-- ================================================================
-- SIPEN — Adiciona coluna criancas em congregacao_cultos
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE congregacao_cultos
  ADD COLUMN IF NOT EXISTS criancas INTEGER NOT NULL DEFAULT 0;
