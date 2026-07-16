-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: agenda pública não exibia eventos
-- Problema: RLS exigia visibilidade_publica = true, mas eventos
--           criados internamente ficam false (default NOT NULL).
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Marca todos os confirmados como públicos
UPDATE public.agenda
SET visibilidade_publica = true
WHERE status = 'confirmado'
  AND deleted_at IS NULL
  AND visibilidade_publica = false;

-- 2. Ajusta a policy anon para não depender de visibilidade_publica
--    (status=confirmado + deleted_at IS NULL já é suficiente)
DROP POLICY IF EXISTS "agenda_anon_select" ON public.agenda;

CREATE POLICY "agenda_anon_select" ON public.agenda
  FOR SELECT TO anon
  USING (
    status = 'confirmado'
    AND deleted_at IS NULL
  );

-- 3. Verificação
SELECT
  COUNT(*)                                              AS total_confirmados,
  COUNT(*) FILTER (WHERE visibilidade_publica = true)  AS publicos,
  COUNT(*) FILTER (WHERE visibilidade_publica = false) AS privados
FROM public.agenda
WHERE status = 'confirmado' AND deleted_at IS NULL;
