-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Solicitação de comunicação pelo formulário público
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- RPC pública para criar solicitação de arte SEM vínculo de agenda
-- (formulário público → categoria Comunicação)
DROP FUNCTION IF EXISTS public.criar_sol_comunicacao_direta(TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT[],DATE,TEXT,TEXT,DATE,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.criar_sol_comunicacao_direta(
  p_responsavel       TEXT,
  p_telefone          TEXT    DEFAULT NULL,
  p_descricao         TEXT    DEFAULT NULL,
  p_titulo            TEXT    DEFAULT NULL,
  p_areas             TEXT[]  DEFAULT NULL,
  p_formatos          TEXT[]  DEFAULT NULL,
  p_data_evento       DATE    DEFAULT NULL,
  p_horario_evento    TEXT    DEFAULT NULL,   -- TEXT para evitar cast de vazio
  p_local_evento      TEXT    DEFAULT NULL,
  p_prazo             DATE    DEFAULT NULL,
  p_informacoes       TEXT    DEFAULT NULL,
  p_subcategoria      TEXT    DEFAULT NULL,
  p_ministerio        TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol_id UUID;
  v_resp   TEXT;
  v_desc   TEXT;
  v_hora   TIME;
BEGIN
  v_resp := COALESCE(NULLIF(TRIM(COALESCE(p_responsavel,'')), ''), 'Solicitante');
  v_desc := COALESCE(
    NULLIF(TRIM(COALESCE(p_descricao,'')), ''),
    'Solicitação de comunicação: '
      || COALESCE(p_titulo, COALESCE(p_subcategoria, 'Arte / Comunicação')) || '.'
  );

  -- converte horário texto → time (ignora valores em branco)
  v_hora := CASE
    WHEN p_horario_evento IS NOT NULL AND TRIM(p_horario_evento) <> ''
    THEN TRIM(p_horario_evento)::TIME
    ELSE NULL
  END;

  INSERT INTO public.com_solicitacoes_arte (
    ministerio_solicitante,
    responsavel_nome,
    telefone_whatsapp,
    descricao_demanda,
    areas_comunicacao,
    formatos_divulgacao,
    data_evento,
    horario_evento,
    local_evento,
    prazo_entrega,
    informacoes_adicionais,
    publico_alvo,
    anexos,
    origem_vinculo,
    status,
    criado_em,
    atualizado_em
  ) VALUES (
    COALESCE(NULLIF(TRIM(COALESCE(p_ministerio,'')), ''), 'Solicitação pública'),
    v_resp,
    p_telefone,
    v_desc,
    COALESCE(p_areas,   ARRAY[]::TEXT[]),
    COALESCE(p_formatos, ARRAY[]::TEXT[]),
    p_data_evento,
    v_hora,
    p_local_evento,
    p_prazo,
    p_informacoes,
    ARRAY[]::TEXT[],
    '[]'::JSONB,
    'formulario_publico',
    'Recebida',
    now(),
    now()
  )
  RETURNING id INTO v_sol_id;

  INSERT INTO public.com_andamentos (sol_id, texto, automatico, criado_em)
  VALUES (
    v_sol_id,
    'Solicitação criada pelo formulário público de comunicação.'
      || CASE WHEN p_subcategoria IS NOT NULL THEN ' Tipo: ' || p_subcategoria || '.' ELSE '' END,
    true,
    now()
  );

  RETURN jsonb_build_object('ok', true, 'sol_id', v_sol_id);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_sol_comunicacao_direta FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_sol_comunicacao_direta TO anon, authenticated;
