-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Correção crítica: conflito de reserva no portal público
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
--
-- Problemas resolvidos:
--   1. espacos_disponibilidade agora RETURNS TABLE em vez de RETURNS JSONB,
--      eliminando o duplo-wrapping [[...]] que confundia o PostgREST.
--   2. solicitar_agendamento usa ILIKE bidirecional para detectar conflitos
--      quando o campo espaco contém listas separadas por vírgula.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Recriar espacos_disponibilidade com RETURNS TABLE ─────
DROP FUNCTION IF EXISTS public.espacos_disponibilidade(DATE,TEXT,DATE,TEXT,UUID);

CREATE OR REPLACE FUNCTION public.espacos_disponibilidade(
  p_data_inicio   DATE,
  p_hora_inicio   TEXT,
  p_data_fim      DATE    DEFAULT NULL,
  p_hora_fim      TEXT    DEFAULT NULL,
  p_excluir_id    UUID    DEFAULT NULL
)
RETURNS TABLE(nome TEXT, grupo TEXT, disponivel BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_fim   DATE;
  v_hora_fim   TEXT;
  v_hora_ini   TEXT;
BEGIN
  v_data_fim := COALESCE(p_data_fim, p_data_inicio);
  v_hora_ini := COALESCE(NULLIF(p_hora_inicio,''), '00:00');
  v_hora_fim := COALESCE(NULLIF(p_hora_fim,''),    '23:59');

  RETURN QUERY
  SELECT
    esp.nome::TEXT,
    COALESCE(esp.grupo, '')::TEXT AS grupo,
    NOT EXISTS (
      SELECT 1
      FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
        -- Captura espaço mesmo quando agenda.espaco é lista separada por vírgula
        AND ag.espaco ILIKE '%' || esp.nome || '%'
        -- Sobreposição: novo_inicio < existente_fim  E  novo_fim > existente_inicio
        AND (p_data_inicio::TEXT || 'T' || v_hora_ini)
            < (COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T'
               || COALESCE(NULLIF(ag.hora_fim,''), '23:59'))
        AND (v_data_fim::TEXT || 'T' || v_hora_fim)
            > (ag.data::TEXT || 'T'
               || COALESCE(NULLIF(ag.hora_inicio,''), '00:00'))
    ) AS disponivel
  FROM public.espacos esp
  WHERE esp.disponivel_publico = true
    AND esp.ativo              = true
  ORDER BY esp.ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.espacos_disponibilidade FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade TO anon, authenticated;


-- ── 2. Corrigir solicitar_agendamento: ILIKE bidirecional ────
-- Antes: LOWER(espaco) = LOWER(p_espaco) — falha quando espaco é lista
-- Depois: ILIKE bidirecional captura "Sala A06" dentro de "Sala A06, Cozinha"
-- e vice-versa.
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE);

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
  p_participantes     INTEGER DEFAULT NULL,
  p_origem            TEXT    DEFAULT 'link_publico',
  p_publica           BOOLEAN DEFAULT false,
  p_data_encerramento DATE    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo         TEXT;
  v_agenda_id         UUID;
  v_conflito          BOOLEAN := false;
  v_nomeMes           TEXT;
  v_diaSem            TEXT;
  v_data_enc          DATE;
BEGIN
  v_data_enc := COALESCE(p_data_encerramento, p_data);

  IF v_data_enc < p_data THEN
    RETURN jsonb_build_object(
      'ok',   false,
      'erro', 'A data de encerramento não pode ser anterior à data de início.'
    );
  END IF;

  v_protocolo := 'AG-' || to_char(p_data, 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  -- Verifica conflito com ILIKE bidirecional:
  --   ag.espaco ILIKE '%p_espaco%'  → "Sala A06, Cozinha" contém "Sala A06"
  --   p_espaco  ILIKE '%ag.espaco%' → "Sala A06, Cozinha" contém "Sala A06" (reverso)
  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda ag
      WHERE ag.espaco IS NOT NULL
        AND (
          ag.espaco ILIKE '%' || p_espaco || '%'
          OR p_espaco  ILIKE '%' || ag.espaco || '%'
        )
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND ag.deleted_at IS NULL
        AND ag.data <= v_data_enc
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data
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
  v_nomeMes := UPPER(LEFT(v_nomeMes,1)) || LOWER(SUBSTRING(v_nomeMes FROM 2));
  v_diaSem  := to_char(p_data, 'TMDay');
  v_diaSem  := UPPER(LEFT(v_diaSem,1)) || LOWER(SUBSTRING(v_diaSem FROM 2)) || '-feira';

  INSERT INTO public.agenda (
    titulo, descricao, tipo,
    data, data_encerramento, mes, dia_semana, hora_inicio, hora_fim,
    espaco, organizador, observacao,
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
    p_espaco, p_nome, p_observacao,
    'aguardando_aprovacao', false,
    p_nome, p_telefone,
    v_protocolo, p_origem, 'solicitacao',
    p_participantes, 'Único'
  )
  RETURNING id INTO v_agenda_id;

  RETURN jsonb_build_object(
    'ok',        true,
    'protocolo', v_protocolo,
    'agenda_id', v_agenda_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_agendamento FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_agendamento TO anon, authenticated;
