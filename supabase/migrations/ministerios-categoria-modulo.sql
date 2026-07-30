-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Taxonomia de entidades organizacionais
-- Adiciona categoria e modulo_rota à tabela ministerios.
-- Execute no Supabase SQL Editor do projeto SIPEN.
-- ═══════════════════════════════════════════════════════════════

-- ── Novos campos ────────────────────────────────────────────────
ALTER TABLE ministerios
  ADD COLUMN IF NOT EXISTS categoria   TEXT NOT NULL DEFAULT 'generico'
    CHECK (categoria IN ('essencial','importante','generico')),
  ADD COLUMN IF NOT EXISTS modulo_rota TEXT;

-- ── Essenciais com módulo próprio ───────────────────────────────
UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'pastoral'
  WHERE nome ILIKE '%equipe pastoral%';

UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'diac'
  WHERE tipo = 'DIACONIA';

UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'com'
  WHERE tipo = 'COMUNICACAO';

UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'ensino'
  WHERE nome ILIKE '%ensino%';

UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'evangelismo'
  WHERE tipo = 'EVANGELISMO' OR nome ILIKE '%evangeliza%';

UPDATE ministerios SET categoria = 'essencial', modulo_rota = 'acao-social'
  WHERE nome ILIKE '%ação social%' OR nome ILIKE '%acao social%';

-- ── Importante: aparecem no grid e usam min-min ──────────────────
UPDATE ministerios SET categoria = 'importante'
  WHERE nome ILIKE '%capelania%'
     OR nome ILIKE '%gestão patrimonial%'
     OR nome ILIKE '%gestao patrimonial%'
     OR nome ILIKE '%jurídico%'
     OR nome ILIKE '%juridico%'
     OR nome ILIKE '%lar cristão%'
     OR nome ILIKE '%lar cristao%'
     OR tipo  = 'MUSICA';

-- ── Pequenos Grupos — entra como registro real ───────────────────
INSERT INTO ministerios (nome, categoria, modulo_rota, ativo, tipo, descricao)
  VALUES (
    'Pequenos Grupos',
    'essencial',
    'pgs',
    true,
    'OUTRO',
    'Discipulado em células — acompanhamento, encontros, estudos e visitantes.'
  )
  ON CONFLICT DO NOTHING;

-- ── Conselho — entra no grid de ministérios ──────────────────────
-- Nada muda em Conselho e Governança (sidebar, rotas, módulos existentes).
-- O grid apenas exibe um card que navega para conselho-dash.
INSERT INTO ministerios (nome, categoria, modulo_rota, ativo, tipo, descricao)
  VALUES (
    'Conselho Presbiterial',
    'essencial',
    'conselho',
    true,
    'OUTRO',
    'Governança da igreja — nomeados, ordenados, atas e deliberações.'
  )
  ON CONFLICT DO NOTHING;

-- ── Índice para performance ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ministerios_categoria ON ministerios(categoria);
