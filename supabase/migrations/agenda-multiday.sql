-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Suporte a eventos de vários dias na agenda
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Nova coluna data_encerramento ─────────────────────────
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS data_encerramento DATE;

-- ── 2. Migração: eventos existentes terminam no mesmo dia ─────
UPDATE public.agenda
SET data_encerramento = data
WHERE data_encerramento IS NULL AND data IS NOT NULL;

-- ── 3. Atualizar solicitar_agendamento com suporte multi-day ──
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN);
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT);

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

  -- Validação: encerramento não pode ser anterior ao início
  IF v_data_enc < p_data THEN
    RETURN jsonb_build_object(
      'ok',   false,
      'erro', 'A data de encerramento não pode ser anterior à data de início.'
    );
  END IF;

  -- Gera protocolo único
  v_protocolo := 'AG-' || to_char(p_data, 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  -- Verifica conflito de espaço no período completo
  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda
      WHERE espaco IS NOT NULL
        AND LOWER(espaco) = LOWER(p_espaco)
        AND status NOT IN ('cancelado','recusado')
        AND deleted_at IS NULL
        -- Períodos se sobrepõem se início_A < fim_B E fim_A > início_B
        AND data <= v_data_enc
        AND COALESCE(data_encerramento, data) >= p_data
    ) INTO v_conflito;
  END IF;

  IF v_conflito THEN
    RETURN jsonb_build_object(
      'ok',       false,
      'conflito', true,
      'erro',     'Já existe uma reserva para este espaço neste período. A administração verificará a disponibilidade.'
    );
  END IF;

  -- Mês e dia da semana baseados na data de início
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


-- ── 4. Atualizar aprovar_agendamento para retornar data_encerramento ──
CREATE OR REPLACE FUNCTION public.aprovar_agendamento(
  p_agenda_id   UUID,
  p_aprovador   TEXT DEFAULT 'Administrador',
  p_obs         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.agenda%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.agenda WHERE id = p_agenda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Agendamento não encontrado.');
  END IF;

  UPDATE public.agenda SET
    status               = 'confirmado',
    visibilidade_publica = true,
    aprovado_por_nome    = p_aprovador,
    aprovado_em          = NOW(),
    obs                  = COALESCE(p_obs, obs),
    notif_historico      = notif_historico || jsonb_build_object(
      'evento', 'aprovado', 'em', NOW()::TEXT, 'por', p_aprovador
    )
  WHERE id = p_agenda_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'protocolo',        v_row.protocolo,
    'titulo',           v_row.titulo,
    'telefone',         v_row.solicitante_tel,
    'solicitante',      v_row.solicitante_txt,
    'data',             v_row.data::TEXT,
    'data_encerramento',v_row.data_encerramento::TEXT,
    'hora_inicio',      v_row.hora_inicio,
    'hora_fim',         v_row.hora_fim,
    'espaco',           v_row.espaco
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_agendamento TO authenticated;
