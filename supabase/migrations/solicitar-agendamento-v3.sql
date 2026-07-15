-- Migração: solicitar_agendamento v3 — unifica p_demanda_id + verificação de horário
--
-- Problema: a versão sync-agenda-demandas.sql adicionou p_demanda_id mas perdeu
-- a verificação de sobreposição de HORÁRIO (mantinha só verificação de DATA).
-- Após consolidação de recorrentes, eventos têm data_encerramento = dez/2026,
-- causando falso conflito em QUALQUER reserva do mesmo espaço no ano inteiro.
--
-- Esta versão combina:
--   • p_demanda_id  (de sync-agenda-demandas.sql)
--   • verificação de hora (de conflito-horario-unificado.sql)

DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE);
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE,UUID);

CREATE OR REPLACE FUNCTION public.solicitar_agendamento(
  p_titulo            TEXT,
  p_data              DATE,
  p_hora_inicio       TEXT,
  p_hora_fim          TEXT,
  p_espaco            TEXT,
  p_subcategoria      TEXT,
  p_observacao        TEXT,
  p_nome              TEXT,
  p_telefone          TEXT,
  p_participantes     INTEGER  DEFAULT NULL,
  p_origem            TEXT     DEFAULT 'link_publico',
  p_publica           BOOLEAN  DEFAULT false,
  p_data_encerramento DATE     DEFAULT NULL,
  p_demanda_id        UUID     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo  TEXT;
  v_agenda_id  UUID;
  v_espaco_id  UUID;
  v_conflito   BOOLEAN := false;
  v_nomeMes    TEXT;
  v_diaSem     TEXT;
  v_data_enc   DATE;
  v_hora_ini   TEXT;
  v_hora_fim   TEXT;
BEGIN
  v_data_enc := COALESCE(p_data_encerramento, p_data);
  v_hora_ini := COALESCE(NULLIF(p_hora_inicio, ''), '00:00');
  v_hora_fim := COALESCE(NULLIF(p_hora_fim,    ''), '23:59');

  IF v_data_enc < p_data THEN
    RETURN jsonb_build_object(
      'ok',   false,
      'erro', 'A data de encerramento não pode ser anterior à data de início.'
    );
  END IF;

  v_protocolo := 'AG-' || to_char(p_data, 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  -- Tenta resolver espaco_id pelo nome (para comparação via FK quando disponível)
  IF p_espaco IS NOT NULL THEN
    SELECT id INTO v_espaco_id
    FROM public.espacos
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_espaco))
      AND ativo = true
    LIMIT 1;
  END IF;

  -- Verificação de conflito: sobreposição de DATA e de HORÁRIO
  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND ag.data <= v_data_enc
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data
        AND (
          (v_espaco_id IS NOT NULL AND ag.espaco_id = v_espaco_id)
          OR (v_espaco_id IS NULL  AND ag.espaco IS NOT NULL AND (
            ag.espaco ILIKE '%' || p_espaco || '%'
            OR p_espaco  ILIKE '%' || ag.espaco || '%'
          ))
        )
        -- Sobreposição de horário (idêntico a espacos_disponibilidade)
        AND (p_data::TEXT   || 'T' || v_hora_ini)
            < (COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T'
               || COALESCE(NULLIF(ag.hora_fim, ''), '23:59'))
        AND (v_data_enc::TEXT || 'T' || v_hora_fim)
            > (ag.data::TEXT || 'T'
               || COALESCE(NULLIF(ag.hora_inicio, ''), '00:00'))
    ) INTO v_conflito;
  END IF;

  IF v_conflito THEN
    RETURN jsonb_build_object(
      'ok',       false,
      'conflito', true,
      'espaco',   p_espaco,
      'erro',     'Já existe uma reserva para este espaço neste período.'
    );
  END IF;

  v_nomeMes := to_char(p_data, 'TMMonth');
  v_nomeMes := UPPER(LEFT(v_nomeMes, 1)) || LOWER(SUBSTRING(v_nomeMes FROM 2));
  v_diaSem  := to_char(p_data, 'TMDay');
  v_diaSem  := UPPER(LEFT(v_diaSem, 1)) || LOWER(SUBSTRING(v_diaSem FROM 2)) || '-feira';

  INSERT INTO public.agenda (
    titulo, descricao, tipo,
    data, data_encerramento, mes, dia_semana, hora_inicio, hora_fim,
    espaco, espaco_id, organizador, observacao,
    status, visibilidade_publica,
    solicitante_txt, solicitante_tel,
    protocolo, origem_sol, origem,
    participantes, recorrencia
  ) VALUES (
    p_titulo,
    p_subcategoria || CASE WHEN p_observacao IS NOT NULL THEN E'\n' || p_observacao ELSE '' END,
    p_subcategoria,
    p_data, v_data_enc, v_nomeMes, v_diaSem,
    p_hora_inicio, p_hora_fim,
    p_espaco, v_espaco_id, p_nome, p_observacao,
    'aguardando_aprovacao', false,
    p_nome, p_telefone,
    v_protocolo, p_origem, 'solicitacao',
    p_participantes, 'Único'
  )
  RETURNING id INTO v_agenda_id;

  IF p_demanda_id IS NOT NULL THEN
    UPDATE public.demandas
    SET agenda_ref_id = v_agenda_id
    WHERE id = p_demanda_id;
  END IF;

  RETURN jsonb_build_object(
    'ok',        true,
    'protocolo', v_protocolo,
    'agenda_id', v_agenda_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_agendamento FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_agendamento(
  TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE,UUID
) TO anon, authenticated;
