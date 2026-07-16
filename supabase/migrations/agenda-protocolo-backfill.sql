-- ══════════════════════════════════════════════════════════════
-- SIPEN — Protocolo sequencial para agendamentos
-- Formato: AG-YYYY-000001  (mesmo padrão das demandas)
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Tabela de sequência por ano (igual ao padrão de demandas)
CREATE TABLE IF NOT EXISTS public.agenda_protocolo_seq (
  ano INTEGER NOT NULL PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0
);

-- 2. Função geradora
CREATE OR REPLACE FUNCTION public.gerar_protocolo_agenda()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq INTEGER;
BEGIN
  INSERT INTO public.agenda_protocolo_seq (ano, seq)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET seq = public.agenda_protocolo_seq.seq + 1
  RETURNING seq INTO v_seq;

  RETURN 'AG-' || v_ano::TEXT || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- 3. Trigger para novos agendamentos sem protocolo
CREATE OR REPLACE FUNCTION public.auto_protocolo_agenda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := public.gerar_protocolo_agenda();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_protocolo_agenda ON public.agenda;
CREATE TRIGGER trg_auto_protocolo_agenda
  BEFORE INSERT ON public.agenda
  FOR EACH ROW EXECUTE FUNCTION public.auto_protocolo_agenda();

-- 4. Backfill: zera protocolos anteriores (formato antigo AG-YYYYMMDD-RANDOM)
--    e regera em ordem cronológica com o novo padrão sequencial
UPDATE public.agenda SET protocolo = NULL
WHERE protocolo IS NOT NULL
  AND deleted_at IS NULL
  AND protocolo ~ '^AG-\d{8}-[A-Z0-9]{6}$';

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM public.agenda
    WHERE protocolo IS NULL
      AND deleted_at IS NULL
    ORDER BY COALESCE(data, created_at::date, CURRENT_DATE) ASC, id ASC
  LOOP
    UPDATE public.agenda
    SET protocolo = public.gerar_protocolo_agenda()
    WHERE id = r.id;
  END LOOP;
END $$;

-- Verificação
SELECT
  COUNT(*)                                    AS total,
  COUNT(protocolo)                            AS com_protocolo,
  COUNT(*) FILTER (WHERE protocolo IS NULL)   AS sem_protocolo,
  MIN(protocolo)                              AS primeiro,
  MAX(protocolo)                              AS ultimo
FROM public.agenda
WHERE deleted_at IS NULL;
