-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Portal Público: adiciona financial_data ao RPC
-- Execute TODO este bloco de uma vez no Supabase SQL Editor
-- Pré-requisito: chamado-portal-publico.sql já executado
-- ═══════════════════════════════════════════════════════════════

-- Remove a versão anterior do RPC (assinatura sem financial_data)
DROP FUNCTION IF EXISTS public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.registrar_chamado_publico(
  p_area               TEXT,
  p_subcategoria       TEXT,
  p_titulo             TEXT,
  p_descricao          TEXT,
  p_solicitante_nome   TEXT,
  p_solicitante_tel    TEXT,
  p_responsavel        TEXT,
  p_financial_data     JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.demandas (
    area, subcategoria, titulo, descricao,
    solicitante, solicitante_txt,
    nome_solicitante_externo, telefone_solicitante,
    responsavel, responsavel_txt,
    financial_data,
    origem, prioridade, status, data_abertura
  ) VALUES (
    p_area, p_subcategoria, p_titulo, p_descricao,
    p_solicitante_nome, p_solicitante_nome,
    p_solicitante_nome, p_solicitante_tel,
    p_responsavel, p_responsavel,
    p_financial_data,
    'Portal Público', 'Média', 'Aberta', CURRENT_DATE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_chamado_publico(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO anon;

-- ── Teste (execute separadamente) ─────────────────────────────
-- SELECT public.registrar_chamado_publico(
--   'Financeiro', 'Solicitação de pagamento', 'Teste portal v2', 'Descrição',
--   'Nome Teste', '(11) 99999-9999', 'Tesouraria / Financeiro',
--   '{"tipo":"Pagamento","valor":1500.00,"beneficiario":"João Silva","forma_pagamento":"PIX","chave_pix":"joao@email.com"}'::jsonb
-- );
