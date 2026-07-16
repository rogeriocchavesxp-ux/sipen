-- ══════════════════════════════════════════════════════════════
-- SIPEN — Backfill completo de numero_chamado em demandas
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Coluna (caso não exista ainda)
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS numero_chamado TEXT;

-- 2. Tabela de sequência (caso não exista)
CREATE TABLE IF NOT EXISTS public.numero_chamado_seq (
  area TEXT    NOT NULL,
  ano  INTEGER NOT NULL,
  seq  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (area, ano)
);

-- 3. Função geradora (cria ou substitui)
CREATE OR REPLACE FUNCTION public.gerar_numero_chamado(p_area TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prefixo TEXT;
  v_ano     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq     INTEGER;
BEGIN
  v_prefixo := CASE upper(trim(coalesce(p_area, '')))
    WHEN 'FINANCEIRO'     THEN 'FIN'
    WHEN 'SECRETARIA'     THEN 'SEC'
    WHEN 'INFRAESTRUTURA' THEN 'INF'
    WHEN 'PASTORAL'       THEN 'PAS'
    WHEN 'TECNOLOGIA'     THEN 'TEC'
    WHEN 'COMUNICAÇÃO'    THEN 'COM'
    WHEN 'RH'             THEN 'RH'
    WHEN ''               THEN 'GRL'
    ELSE upper(left(trim(p_area), 3))
  END;

  INSERT INTO public.numero_chamado_seq (area, ano, seq)
  VALUES (coalesce(p_area, 'GERAL'), v_ano, 1)
  ON CONFLICT (area, ano) DO UPDATE
    SET seq = public.numero_chamado_seq.seq + 1
  RETURNING seq INTO v_seq;

  RETURN v_prefixo || '-' || v_ano::TEXT || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

-- 4. Trigger para novos registros
CREATE OR REPLACE FUNCTION public.auto_numero_chamado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.numero_chamado IS NULL THEN
    NEW.numero_chamado := public.gerar_numero_chamado(NEW.area);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_numero_chamado ON public.demandas;
CREATE TRIGGER trg_auto_numero_chamado
  BEFORE INSERT ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.auto_numero_chamado();

-- 5. Backfill em ordem cronológica (inclui registros sem area)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, area
    FROM public.demandas
    WHERE numero_chamado IS NULL
    ORDER BY
      COALESCE(data_abertura, created_at::date, CURRENT_DATE) ASC,
      id ASC
  LOOP
    UPDATE public.demandas
    SET numero_chamado = public.gerar_numero_chamado(r.area)
    WHERE id = r.id;
  END LOOP;
END $$;

-- Verificação
SELECT
  COUNT(*)                                        AS total,
  COUNT(numero_chamado)                           AS com_numero,
  COUNT(*) FILTER (WHERE numero_chamado IS NULL)  AS sem_numero
FROM public.demandas;
