-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Auditoria: Trigger dízimos/ofertas → financeiro
-- audit-04-dizimos-trigger-financeiro.sql
-- Idempotente. Executar no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════
-- OBJETIVO: quando uma demanda de Dízimos ou Ofertas é marcada
-- como "Concluída", criar automaticamente um lançamento na tabela
-- financeiro (receita), evitando entrada manual duplicada.
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Adicionar demanda_id em financeiro ──────────────────
-- Chave para idempotência: impede inserção dupla por demanda.

ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS demanda_id UUID
  REFERENCES public.demandas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_financeiro_demanda_id
  ON public.financeiro(demanda_id)
  WHERE demanda_id IS NOT NULL;

-- ── PASSO 2: Função do trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_dizimos_to_financeiro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valor     NUMERIC;
  v_forma     TEXT;
  v_desc      TEXT;
  v_pessoa_id UUID;
BEGIN
  -- Só dispara na transição para Concluída em demandas financeiras
  IF (NEW.status = 'Concluída' AND OLD.status IS DISTINCT FROM 'Concluída')
     AND NEW.area = 'Financeiro'
     AND NEW.subcategoria IN ('Dízimos', 'Ofertas')
  THEN
    -- Extrai dados do JSONB financial_data
    v_valor     := (NEW.financial_data->>'valor')::NUMERIC;
    v_forma     := NEW.financial_data->>'forma_pagamento';
    v_pessoa_id := NEW.solicitante_id;

    -- Monta descrição legível
    v_desc := NEW.subcategoria
      || CASE WHEN v_forma IS NOT NULL THEN ' — ' || v_forma ELSE '' END
      || CASE WHEN NEW.descricao IS NOT NULL THEN ' (' || LEFT(NEW.descricao, 80) || ')' ELSE '' END;

    -- Insere em financeiro (ON CONFLICT ignora duplicata)
    INSERT INTO public.financeiro (
      id,
      tipo,
      categoria,
      descricao,
      valor,
      pessoa_id,
      demanda_id,
      data_lancamento,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'receita',
      NEW.subcategoria,
      v_desc,
      COALESCE(v_valor, 0),
      v_pessoa_id,
      NEW.id,
      COALESCE(NEW.updated_at::date, CURRENT_DATE),
      NEW.updated_by,
      NOW(),
      NOW()
    )
    ON CONFLICT (demanda_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ── PASSO 3: Criar trigger ───────────────────────────────────────

DROP TRIGGER IF EXISTS trg_dizimos_to_financeiro ON public.demandas;

CREATE TRIGGER trg_dizimos_to_financeiro
  AFTER UPDATE OF status ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_dizimos_to_financeiro();

-- ── PASSO 4: Backfill — demandas já concluídas ───────────────────
-- Insere lançamentos para demandas de dízimos já marcadas como
-- Concluídas antes do trigger existir.

INSERT INTO public.financeiro (
  id,
  tipo,
  categoria,
  descricao,
  valor,
  pessoa_id,
  demanda_id,
  data_lancamento,
  created_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'receita',
  d.subcategoria,
  d.subcategoria
    || CASE WHEN d.financial_data->>'forma_pagamento' IS NOT NULL
            THEN ' — ' || (d.financial_data->>'forma_pagamento') ELSE '' END,
  COALESCE((d.financial_data->>'valor')::NUMERIC, 0),
  d.solicitante_id,
  d.id,
  COALESCE(d.updated_at::date, CURRENT_DATE),
  d.updated_by,
  NOW(),
  NOW()
FROM public.demandas d
WHERE d.status = 'Concluída'
  AND d.area = 'Financeiro'
  AND d.subcategoria IN ('Dízimos', 'Ofertas')
  AND NOT EXISTS (
    SELECT 1 FROM public.financeiro f WHERE f.demanda_id = d.id
  );

-- ── PASSO 5: Validação ───────────────────────────────────────────
--
-- SELECT COUNT(*) AS demandas_dizimos_concluidas
-- FROM public.demandas
-- WHERE status = 'Concluída' AND area = 'Financeiro' AND subcategoria IN ('Dízimos','Ofertas');
--
-- SELECT COUNT(*) AS lancamentos_gerados
-- FROM public.financeiro WHERE demanda_id IS NOT NULL;
--
-- Os dois valores devem ser iguais.

NOTIFY pgrst, 'reload schema';
