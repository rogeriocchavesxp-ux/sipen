-- ================================================================
-- demandas-auto-numero-chamado.sql
--
-- 1. Adiciona coluna numero_chamado à tabela demandas
-- 2. Cria tabela de controle de sequência por área/ano
-- 3. Cria função gerar_numero_chamado(area) — formato: FIN-2026-000001
-- 4. Trigger BEFORE INSERT: auto-gera numero_chamado para demandas
--    criadas internamente (via apiWrite) que não recebem o campo.
--    O portal público já pode passar numero_chamado no INSERT — o
--    IF IS NULL garante que não haverá dupla geração.
-- 5. Backfill: atribui numero_chamado a todos os registros existentes
--    em ordem cronológica para que a sequência reflita a data real.
-- ================================================================

-- ── 1. Adicionar coluna ──────────────────────────────────────
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS numero_chamado TEXT;

-- ── 2. Tabela de controle de sequência ──────────────────────
CREATE TABLE IF NOT EXISTS public.numero_chamado_seq (
  area TEXT    NOT NULL,
  ano  INTEGER NOT NULL,
  seq  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (area, ano)
);

-- ── 3. Função geradora ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gerar_numero_chamado(p_area TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prefixo TEXT;
  v_ano     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq     INTEGER;
BEGIN
  v_prefixo := CASE upper(trim(p_area))
    WHEN 'FINANCEIRO'     THEN 'FIN'
    WHEN 'SECRETARIA'     THEN 'SEC'
    WHEN 'INFRAESTRUTURA' THEN 'INF'
    WHEN 'PASTORAL'       THEN 'PAS'
    WHEN 'TECNOLOGIA'     THEN 'TEC'
    WHEN 'COMUNICAÇÃO'    THEN 'COM'
    WHEN 'RH'             THEN 'RH'
    ELSE upper(left(trim(p_area), 3))
  END;

  INSERT INTO public.numero_chamado_seq (area, ano, seq)
  VALUES (p_area, v_ano, 1)
  ON CONFLICT (area, ano) DO UPDATE
    SET seq = public.numero_chamado_seq.seq + 1
  RETURNING seq INTO v_seq;

  RETURN v_prefixo || '-' || v_ano::TEXT || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

-- ── 4. Trigger de auto-geração para novos INSERTs ───────────
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

-- ── 5. Backfill: gerar números para registros existentes ────
-- Percorre em ordem cronológica (created_at é a coluna real na tabela)
-- para que a sequência reflita a data de abertura de cada demanda.
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
      COALESCE(data_abertura, created_at::date, CURRENT_DATE) ASC,
      id ASC
  LOOP
    UPDATE public.demandas
    SET numero_chamado = public.gerar_numero_chamado(r.area)
    WHERE id = r.id;
  END LOOP;
END $$;
