-- ══════════════════════════════════════════════════════════════
-- SIPEN — Aceite retroativo de termos até hoje (2026-07-15)
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Marca como aceito na tabela de aceites (onde o registro existe)
UPDATE public.agenda_termo_aceites
SET
  aceito_em  = NOW(),
  ip_origem  = 'retroativo',
  user_agent = 'aceite-retroativo-admin'
WHERE
  aceito_em IS NULL
  AND agenda_id IN (
    SELECT id FROM public.agenda
    WHERE status = 'confirmado'
      AND deleted_at IS NULL
      AND data <= CURRENT_DATE
  );

-- 2. Marca status_termo = 'aceito' em agenda para todos os confirmados até hoje
--    (cobre tanto os que têm registro em agenda_termo_aceites quanto os aprovados
--    antes da migration, que não têm token_termo ainda)
UPDATE public.agenda
SET status_termo = 'aceito'
WHERE
  status = 'confirmado'
  AND deleted_at IS NULL
  AND data <= CURRENT_DATE
  AND (status_termo IS NULL OR status_termo = 'aguardando');

-- Verificação
SELECT
  COUNT(*)                                              AS total_confirmados,
  COUNT(*) FILTER (WHERE status_termo = 'aceito')      AS aceitos,
  COUNT(*) FILTER (WHERE status_termo = 'aguardando')  AS aguardando,
  COUNT(*) FILTER (WHERE status_termo IS NULL)         AS sem_termo
FROM public.agenda
WHERE status = 'confirmado'
  AND deleted_at IS NULL
  AND data <= CURRENT_DATE;
