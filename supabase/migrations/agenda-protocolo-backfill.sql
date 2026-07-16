-- ══════════════════════════════════════════════════════════════
-- SIPEN — Backfill de protocolo em agendamentos sem número
-- Formato: AG-YYYYMMDD-XXXXXX  (padrão já em uso)
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  r        RECORD;
  v_proto  TEXT;
  v_data   DATE;
BEGIN
  FOR r IN
    SELECT id, data, created_at
    FROM public.agenda
    WHERE protocolo IS NULL
      AND deleted_at IS NULL
    ORDER BY COALESCE(data, created_at::date, CURRENT_DATE) ASC, id ASC
  LOOP
    v_data  := COALESCE(r.data, r.created_at::date, CURRENT_DATE);
    v_proto := 'AG-' || to_char(v_data, 'YYYYMMDD') || '-'
               || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

    -- Garante unicidade
    WHILE EXISTS (SELECT 1 FROM public.agenda WHERE protocolo = v_proto) LOOP
      v_proto := 'AG-' || to_char(v_data, 'YYYYMMDD') || '-'
                 || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
    END LOOP;

    UPDATE public.agenda SET protocolo = v_proto WHERE id = r.id;
  END LOOP;
END $$;

-- Verificação
SELECT
  COUNT(*)                                      AS total,
  COUNT(protocolo)                              AS com_protocolo,
  COUNT(*) FILTER (WHERE protocolo IS NULL)     AS sem_protocolo
FROM public.agenda
WHERE deleted_at IS NULL;
