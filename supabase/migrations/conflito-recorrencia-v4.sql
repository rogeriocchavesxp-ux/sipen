-- ═══════════════════════════════════════════════════════════════════════
-- SIPEN — Conflito recorrência v4: detecção de conflito consciente de recorrência
--
-- PROBLEMA: após consolidação de recorrentes, eventos como "Culto - toda sexta"
-- ficaram com data = Jan/15 e data_encerramento = Dez/27. O check de conflito
-- tratava isso como um bloco contínuo de 11 meses, bloqueando qualquer reserva
-- no mesmo espaço durante o ano inteiro.
--
-- SOLUÇÃO: check de conflito com ramificação por recorrência:
--   • Semanal   → conflito só se DOW(solicitado) = DOW(série) E horários se sobrepõem
--   • Quinzenal → idem + (dias desde início) % 14 = 0
--   • Mensal    → conflito só se DIA do mês bate E horários se sobrepõem
--   • Anual     → conflito só se DIA + MÊS batem E horários se sobrepõem
--   • Único/Eventual/Esporádico → comparação normal de datetime
--
-- Inclui também: p_demanda_id em solicitar_agendamento, ocupacoes em
-- espacos_disponibilidade, e match de espaço em uma única direção (ag.espaco
-- ILIKE '%' || nome || '%') para ser consistente entre as duas RPCs.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Limpa todos os overloads existentes ───────────────────────────
DROP FUNCTION IF EXISTS public.espacos_disponibilidade(DATE,TEXT,DATE,TEXT,UUID);
DROP FUNCTION IF EXISTS public.espacos_disponibilidade(DATE,TIME,DATE,TIME,UUID);

DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE);
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE,UUID);


-- ── 2. espacos_disponibilidade ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.espacos_disponibilidade(
  p_data_inicio DATE,
  p_hora_inicio TEXT    DEFAULT NULL,
  p_data_fim    DATE    DEFAULT NULL,
  p_hora_fim    TEXT    DEFAULT NULL,
  p_excluir_id  UUID    DEFAULT NULL
)
RETURNS TABLE(nome TEXT, grupo TEXT, disponivel BOOLEAN, ocupacoes JSONB)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_fim DATE;
  v_hora_ini TEXT;
  v_hora_fim TEXT;
BEGIN
  v_data_fim := COALESCE(p_data_fim, p_data_inicio);
  v_hora_ini := COALESCE(NULLIF(p_hora_inicio, ''), '00:00');
  v_hora_fim := COALESCE(NULLIF(p_hora_fim,    ''), '23:59');

  RETURN QUERY
  SELECT
    esp.nome::TEXT,
    COALESCE(esp.grupo, '')::TEXT AS grupo,

    NOT EXISTS (
      SELECT 1 FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
        -- Correspondência de espaço (FK exato ou texto unidirecional)
        AND (
          (ag.espaco_id IS NOT NULL AND ag.espaco_id = esp.id)
          OR (ag.espaco_id IS NULL  AND ag.espaco ILIKE '%' || esp.nome || '%')
        )
        -- Série cobre o período consultado
        AND ag.data <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data_inicio
        -- Check de conflito consciente de recorrência
        AND CASE
          WHEN ag.recorrencia = 'Semanal' THEN
            EXTRACT(DOW FROM p_data_inicio) = EXTRACT(DOW FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Quinzenal' THEN
            EXTRACT(DOW FROM p_data_inicio) = EXTRACT(DOW FROM ag.data)
            AND (p_data_inicio - ag.data) % 14 = 0
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Mensal' THEN
            EXTRACT(DAY FROM p_data_inicio) = EXTRACT(DAY FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Anual' THEN
            EXTRACT(MONTH FROM p_data_inicio) = EXTRACT(MONTH FROM ag.data)
            AND EXTRACT(DAY   FROM p_data_inicio) = EXTRACT(DAY   FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          ELSE
            -- Único, Eventual, Esporádico, NULL — datetime overlap normal
            (p_data_inicio::TEXT || 'T' || v_hora_ini)
              < (COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T'
                 || COALESCE(NULLIF(ag.hora_fim, ''), '23:59'))
            AND (v_data_fim::TEXT || 'T' || v_hora_fim)
              > (ag.data::TEXT || 'T'
                 || COALESCE(NULLIF(ag.hora_inicio, ''), '00:00'))
        END
    ) AS disponivel,

    -- ocupacoes: retorna dados da ocorrência específica, não da série inteira
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'hora_inicio', ag.hora_inicio,
            'hora_fim',    ag.hora_fim,
            'data',        GREATEST(ag.data,                                      p_data_inicio),
            'data_enc',    LEAST  (COALESCE(ag.data_encerramento, ag.data),       v_data_fim)
          )
          ORDER BY ag.data, ag.hora_inicio
        ),
        '[]'::jsonb
      )
      FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
        AND (
          (ag.espaco_id IS NOT NULL AND ag.espaco_id = esp.id)
          OR (ag.espaco_id IS NULL  AND ag.espaco ILIKE '%' || esp.nome || '%')
        )
        AND ag.data <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data_inicio
        AND CASE
          WHEN ag.recorrencia = 'Semanal' THEN
            EXTRACT(DOW FROM p_data_inicio) = EXTRACT(DOW FROM ag.data)
          WHEN ag.recorrencia = 'Quinzenal' THEN
            EXTRACT(DOW FROM p_data_inicio) = EXTRACT(DOW FROM ag.data)
            AND (p_data_inicio - ag.data) % 14 = 0
          WHEN ag.recorrencia = 'Mensal' THEN
            EXTRACT(DAY FROM p_data_inicio) = EXTRACT(DAY FROM ag.data)
          WHEN ag.recorrencia = 'Anual' THEN
            EXTRACT(MONTH FROM p_data_inicio) = EXTRACT(MONTH FROM ag.data)
            AND EXTRACT(DAY FROM p_data_inicio) = EXTRACT(DAY FROM ag.data)
          ELSE TRUE
        END
    ) AS ocupacoes

  FROM public.espacos esp
  WHERE esp.disponivel_publico = true
    AND esp.ativo              = true
  ORDER BY esp.ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.espacos_disponibilidade FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade(DATE,TEXT,DATE,TEXT,UUID)
  TO anon, authenticated;


-- ── 3. solicitar_agendamento ─────────────────────────────────────────
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

  -- Resolve espaco_id pelo nome
  IF p_espaco IS NOT NULL THEN
    SELECT id INTO v_espaco_id
    FROM public.espacos
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_espaco))
      AND ativo = true
    LIMIT 1;
  END IF;

  -- Check de conflito com recorrência
  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND ag.data <= v_data_enc
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data
        -- Correspondência de espaço (mesma lógica de espacos_disponibilidade)
        AND (
          (v_espaco_id IS NOT NULL AND ag.espaco_id = v_espaco_id)
          OR (v_espaco_id IS NULL  AND ag.espaco IS NOT NULL
              AND ag.espaco ILIKE '%' || p_espaco || '%')
        )
        -- Check de conflito consciente de recorrência
        AND CASE
          WHEN ag.recorrencia = 'Semanal' THEN
            EXTRACT(DOW FROM p_data) = EXTRACT(DOW FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Quinzenal' THEN
            EXTRACT(DOW FROM p_data) = EXTRACT(DOW FROM ag.data)
            AND (p_data - ag.data) % 14 = 0
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Mensal' THEN
            EXTRACT(DAY FROM p_data) = EXTRACT(DAY FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          WHEN ag.recorrencia = 'Anual' THEN
            EXTRACT(MONTH FROM p_data) = EXTRACT(MONTH FROM ag.data)
            AND EXTRACT(DAY   FROM p_data) = EXTRACT(DAY   FROM ag.data)
            AND v_hora_ini::TIME < COALESCE(NULLIF(ag.hora_fim,    ''), '23:59')::TIME
            AND v_hora_fim::TIME > COALESCE(NULLIF(ag.hora_inicio, ''), '00:00')::TIME
          ELSE
            (p_data::TEXT   || 'T' || v_hora_ini)
              < (COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T'
                 || COALESCE(NULLIF(ag.hora_fim, ''), '23:59'))
            AND (v_data_enc::TEXT || 'T' || v_hora_fim)
              > (ag.data::TEXT || 'T'
                 || COALESCE(NULLIF(ag.hora_inicio, ''), '00:00'))
        END
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
