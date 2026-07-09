-- ================================================================
-- demandas-auto-numero-chamado.sql
--
-- 1. Trigger BEFORE INSERT: auto-gera numero_chamado para demandas
--    criadas internamente (via apiWrite) que não recebem o campo.
--    O portal público já passa numero_chamado no INSERT, então o
--    IF IS NULL garante que não haverá dupla geração.
--
-- 2. Backfill: atribui numero_chamado a todas as demandas existentes
--    que ainda estão com NULL, em ordem cronológica para que a
--    sequência reflita a data de abertura real.
-- ================================================================

-- ── 1. Trigger de auto-geração ────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_numero_chamado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.numero_chamado IS NULL AND NEW.area IS NOT NULL THEN
    NEW.numero_chamado := public.gerar_numero_chamado(NEW.area);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_numero_chamado ON public.demandas;
CREATE TRIGGER trg_auto_numero_chamado
  BEFORE INSERT ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.auto_numero_chamado();

-- ── 2. Backfill de registros existentes sem número ───────────
-- Percorre em ordem cronológica para que a sequência seja coerente
-- com a data de abertura de cada demanda.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, area
    FROM public.demandas
    WHERE numero_chamado IS NULL
      AND area IS NOT NULL
    ORDER BY
      COALESCE(data_abertura, (criado_em::date), CURRENT_DATE) ASC,
      id ASC
  LOOP
    UPDATE public.demandas
    SET numero_chamado = public.gerar_numero_chamado(r.area)
    WHERE id = r.id;
  END LOOP;
END $$;
