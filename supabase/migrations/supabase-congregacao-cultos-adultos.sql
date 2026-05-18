-- ================================================================
-- SIPEN — Adiciona coluna adultos em congregacao_cultos
-- Data: 2026-05-18
-- Contexto: separar contagem de adultos e crianças no registro de cultos.
--   participantes = adultos + criancas (calculado no front-end)
-- ================================================================

-- 1. Adiciona coluna adultos (retrocompat: DEFAULT 0 para registros antigos)
ALTER TABLE public.congregacao_cultos
  ADD COLUMN IF NOT EXISTS adultos integer NOT NULL DEFAULT 0;

-- 2. Migra registros existentes: adultos = participantes - criancas (mín. 0)
UPDATE public.congregacao_cultos
SET adultos = GREATEST(0, participantes - criancas)
WHERE adultos = 0 AND participantes > 0;

-- 3. Verificação
SELECT id, data, participantes, adultos, criancas,
       (adultos + criancas) AS total_calculado
FROM public.congregacao_cultos
ORDER BY criado_em DESC
LIMIT 20;
