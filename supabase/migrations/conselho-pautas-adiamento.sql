-- ══════════════════════════════════════════════════════════════════
-- SIPEN — Adiamento de pautas entre reuniões do Conselho
-- Executar no Supabase SQL Editor (Dashboard > SQL Editor)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE conselho_pautas
  ADD COLUMN IF NOT EXISTS pauta_origem_id    UUID REFERENCES conselho_pautas(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reuniao_destino_id  UUID REFERENCES conselho_reunioes(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reuniao_origem_id   UUID REFERENCES conselho_reunioes(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pautas_pauta_origem    ON conselho_pautas(pauta_origem_id)    WHERE pauta_origem_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pautas_reuniao_destino ON conselho_pautas(reuniao_destino_id) WHERE reuniao_destino_id IS NOT NULL;
