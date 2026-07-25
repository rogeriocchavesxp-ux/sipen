-- ══════════════════════════════════════════════════════════════
-- SIPEN — Eventos multi-dia na Agenda
-- Adiciona coluna `dias` (JSONB) para armazenar horários por dia.
--
-- Formato: [{"data":"2026-07-24","hora_inicio":"20:00","hora_fim":"23:59"},
--           {"data":"2026-07-25","hora_inicio":"09:00","hora_fim":"23:59"},
--           {"data":"2026-07-26","hora_inicio":"09:00","hora_fim":"18:00"}]
--
-- Os campos existentes (data, hora_inicio, hora_fim, data_encerramento)
-- continuam como estão para retrocompatibilidade e índices.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS dias JSONB DEFAULT NULL;

COMMENT ON COLUMN public.agenda.dias IS
  'Array de dias com horários individuais para eventos multi-dia. '
  'Null = evento de dia único (usar data/hora_inicio/hora_fim).';
