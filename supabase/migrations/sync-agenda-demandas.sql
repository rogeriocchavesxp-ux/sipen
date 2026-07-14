-- ══════════════════════════════════════════════════════════════════
-- SIPEN — Sync agenda ↔ demandas
-- Problema: criar agendamento via portal cria dois registros separados
-- (demandas + agenda) sem vínculo entre si. Exclusão em um não reflete no outro.
-- Solução: adicionar agenda_ref_id em demandas e gravar o link na criação.
-- ══════════════════════════════════════════════════════════════════

-- 1. Coluna de vínculo
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS agenda_ref_id UUID REFERENCES public.agenda(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demandas_agenda_ref ON public.demandas(agenda_ref_id)
  WHERE agenda_ref_id IS NOT NULL;

-- 2. Atualiza solicitar_agendamento para receber e gravar o vínculo
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
  p_data_encerramento DATE    DEFAULT NULL,
  p_demanda_id        UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF p_espaco IS NOT NULL THEN
    SELECT id INTO v_espaco_id
    FROM public.espacos
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_espaco))
      AND ativo = true
    LIMIT 1;
  END IF;

  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda ag
      WHERE ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND ag.deleted_at IS NULL
        AND ag.data <= v_data_enc
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data
        AND (
          (v_espaco_id IS NOT NULL AND ag.espaco_id = v_espaco_id)
          OR (v_espaco_id IS NULL  AND ag.espaco IS NOT NULL AND (
            ag.espaco ILIKE '%' || p_espaco || '%'
            OR p_espaco  ILIKE '%' || ag.espaco || '%'
          ))
        )
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

  -- Grava o vínculo na demanda correspondente (quando chamado via portal público)
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
