-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Atualiza criar_sol_comunicacao_publica
-- Adiciona: p_areas, p_data_evento, p_horario_evento, p_local_evento
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.criar_sol_comunicacao_publica(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT[],DATE,TEXT);
DROP FUNCTION IF EXISTS public.criar_sol_comunicacao_publica(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT[],DATE,TEXT,TEXT[],DATE,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.criar_sol_comunicacao_publica(
  p_agenda_id         UUID,
  p_agenda_protocolo  TEXT,
  p_responsavel       TEXT    DEFAULT NULL,
  p_telefone          TEXT    DEFAULT NULL,
  p_descricao         TEXT    DEFAULT NULL,
  p_ministerio        TEXT    DEFAULT NULL,
  p_formatos          TEXT[]  DEFAULT NULL,
  p_prazo             DATE    DEFAULT NULL,
  p_informacoes       TEXT    DEFAULT NULL,
  p_areas             TEXT[]  DEFAULT NULL,
  p_data_evento       DATE    DEFAULT NULL,
  p_horario_evento    TEXT    DEFAULT NULL,
  p_local_evento      TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol_id    UUID;
  v_titulo    TEXT;
  v_min       TEXT;
  v_resp      TEXT;
  v_desc      TEXT;
  v_hora      TIME;
BEGIN
  SELECT titulo INTO v_titulo FROM public.agenda WHERE id = p_agenda_id LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM public.com_solicitacoes_arte
    WHERE agenda_id = p_agenda_id
      AND status NOT IN ('Cancelada')
  ) THEN
    SELECT id INTO v_sol_id FROM public.com_solicitacoes_arte
    WHERE agenda_id = p_agenda_id AND status NOT IN ('Cancelada') LIMIT 1;
    RETURN jsonb_build_object(
      'ok',        false,
      'duplicado', true,
      'sol_id',    v_sol_id,
      'erro',      'Já existe uma solicitação de arte para esta programação.'
    );
  END IF;

  v_min  := COALESCE(NULLIF(TRIM(COALESCE(p_ministerio,'')), ''), 'Solicitação pública');
  v_resp := COALESCE(NULLIF(TRIM(COALESCE(p_responsavel,'')), ''), 'Solicitante');
  v_desc := COALESCE(
    NULLIF(TRIM(COALESCE(p_descricao,'')), ''),
    'Arte digital para a programação "' || COALESCE(v_titulo, p_agenda_protocolo) || '".'
  );

  v_hora := CASE
    WHEN p_horario_evento IS NOT NULL AND TRIM(p_horario_evento) <> ''
    THEN TRIM(p_horario_evento)::TIME
    ELSE NULL
  END;

  INSERT INTO public.com_solicitacoes_arte (
    agenda_id, agenda_protocolo, origem_vinculo,
    ministerio_solicitante, responsavel_nome, telefone_whatsapp,
    descricao_demanda,
    areas_comunicacao, formatos_divulgacao,
    data_evento, horario_evento, local_evento,
    prazo_entrega, informacoes_adicionais,
    publico_alvo, anexos,
    status, criado_em, atualizado_em
  ) VALUES (
    p_agenda_id, p_agenda_protocolo, 'formulario_publico',
    v_min, v_resp, p_telefone,
    v_desc,
    COALESCE(p_areas,   ARRAY[]::TEXT[]),
    COALESCE(p_formatos, ARRAY[]::TEXT[]),
    p_data_evento, v_hora, p_local_evento,
    p_prazo, p_informacoes,
    ARRAY[]::TEXT[], '[]'::JSONB,
    'Recebida', now(), now()
  )
  RETURNING id INTO v_sol_id;

  UPDATE public.agenda SET precisa_arte = true WHERE id = p_agenda_id;

  INSERT INTO public.com_andamentos (sol_id, texto, automatico, criado_em)
  VALUES (
    v_sol_id,
    'Solicitação criada pelo formulário público de agendamentos.'
      || CASE WHEN p_agenda_protocolo IS NOT NULL
              THEN ' Protocolo: ' || p_agenda_protocolo || '.' ELSE '' END,
    true, now()
  );

  RETURN jsonb_build_object('ok', true, 'sol_id', v_sol_id);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_sol_comunicacao_publica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_sol_comunicacao_publica TO anon, authenticated;
