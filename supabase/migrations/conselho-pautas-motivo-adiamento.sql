-- ══════════════════════════════════════════════════════════════════
-- SIPEN — Motivo de adiamento de pautas
-- Executar no Supabase SQL Editor (Dashboard > SQL Editor)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE conselho_pautas
  ADD COLUMN IF NOT EXISTS motivo_adiamento TEXT;
