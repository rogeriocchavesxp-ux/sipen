-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Fix: trigger dízimos → financeiro
-- audit-04-fix-trigger.sql
-- Corrige "record new has no field updated_by" no trigger.
-- Executar no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════

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
  IF (NEW.status = 'Concluída' AND OLD.status IS DISTINCT FROM 'Concluída')
     AND NEW.area = 'Financeiro'
     AND NEW.subcategoria IN ('Dízimos', 'Ofertas')
  THEN
    v_valor     := (NEW.financial_data->>'valor')::NUMERIC;
    v_forma     := NEW.financial_data->>'forma_pagamento';
    v_pessoa_id := NEW.solicitante_id;

    v_desc := NEW.subcategoria
      || CASE WHEN v_forma IS NOT NULL THEN ' — ' || v_forma ELSE '' END
      || CASE WHEN NEW.descricao IS NOT NULL THEN ' (' || LEFT(NEW.descricao, 80) || ')' ELSE '' END;

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
      CURRENT_DATE,
      NEW.created_by,
      NOW(),
      NOW()
    )
    ON CONFLICT (demanda_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
