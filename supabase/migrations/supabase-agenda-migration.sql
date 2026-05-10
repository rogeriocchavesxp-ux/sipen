-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Migration: agenda adaptada para importação da planilha 2026
-- Executar no SQL Editor do Supabase ANTES de rodar importar-agenda.js
-- ══════════════════════════════════════════════════════════════════════

-- 1. Tornar data_inicio nullable (frontend usa "data", não "data_inicio")
ALTER TABLE public.agenda
  ALTER COLUMN data_inicio DROP NOT NULL;

-- 2. Adicionar colunas que o frontend usa e a planilha fornece
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS data        date,
  ADD COLUMN IF NOT EXISTS mes         text,
  ADD COLUMN IF NOT EXISTS dia_semana  text,
  ADD COLUMN IF NOT EXISTS hora_inicio text,
  ADD COLUMN IF NOT EXISTS hora_fim    text,
  ADD COLUMN IF NOT EXISTS organizador text,
  ADD COLUMN IF NOT EXISTS espaco      text,
  ADD COLUMN IF NOT EXISTS observacao  text;

-- 3. Índices úteis para os filtros do frontend
CREATE INDEX IF NOT EXISTS idx_agenda_data        ON public.agenda(data) WHERE data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_mes         ON public.agenda(mes)  WHERE mes  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_espaco      ON public.agenda(espaco) WHERE espaco IS NOT NULL;

-- 4. Constraint de unicidade para evitar duplicidade na reimportação
--    (titulo + data + hora_inicio)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agenda_uniq
  ON public.agenda(titulo, data, COALESCE(hora_inicio, ''))
  WHERE deleted_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════
-- FIM
-- ══════════════════════════════════════════════════════════════════════
