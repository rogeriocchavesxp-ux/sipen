-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: protocolo de requisição agora usa data completa
-- Antes: REQ-YYYY-XXXXXX
-- Depois: REQ-YYYYMMDD-XXXXXX  (consistente com AG-YYYYMMDD-XXXXXX)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.requisitar_espaco_ocupado(
  p_espaco_nome        TEXT,
  p_data               DATE,
  p_hora_ini           TEXT,
  p_hora_fim           TEXT,
  p_ocupacoes          JSONB,
  p_solicitante_nome   TEXT,
  p_solicitante_tel    TEXT,
  p_tipo               TEXT    DEFAULT NULL,
  p_titulo             TEXT    DEFAULT NULL,
  p_descricao          TEXT    DEFAULT NULL,
  p_participantes      INTEGER DEFAULT NULL,
  p_justificativa      TEXT    DEFAULT NULL,
  p_aceita_outro_esp   TEXT    DEFAULT 'Não',
  p_espacos_alt        TEXT    DEFAULT NULL,
  p_aceita_outro_hor   TEXT    DEFAULT 'Não',
  p_horarios_alt       TEXT    DEFAULT NULL,
  p_obs_alt            TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo   TEXT;
  v_dup_prot    TEXT;
BEGIN
  IF p_espaco_nome IS NULL OR p_data IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Espaço e data são obrigatórios.');
  END IF;
  IF COALESCE(TRIM(p_titulo), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o título da programação.');
  END IF;
  IF COALESCE(TRIM(p_justificativa), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'A justificativa é obrigatória.');
  END IF;

  SELECT protocolo INTO v_dup_prot
  FROM public.requisicoes_espaco
  WHERE espaco_nome      = p_espaco_nome
    AND data_solicitada  = p_data
    AND hora_inicio_sol  = p_hora_ini
    AND status NOT IN ('REQUISICAO_NEGADA', 'CANCELADA', 'ESPACO_LIBERADO')
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_dup_prot IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok',        false,
      'duplicado', true,
      'protocolo', v_dup_prot,
      'erro',      'Já existe uma requisição em análise para este espaço e período.'
    );
  END IF;

  -- Formato agora consistente com AG-YYYYMMDD-XXXXXX
  v_protocolo := 'REQ-' || to_char(p_data, 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  INSERT INTO public.requisicoes_espaco (
    protocolo, espaco_nome, data_solicitada, hora_inicio_sol, hora_fim_sol,
    ocupacoes_conflito, solicitante_nome, solicitante_tel,
    tipo_programacao, titulo, descricao, participantes, justificativa,
    aceita_outro_espaco, espacos_alternativos,
    aceita_outro_horario, horarios_alternativos, observacoes_alt
  ) VALUES (
    v_protocolo, p_espaco_nome, p_data, p_hora_ini, p_hora_fim,
    COALESCE(p_ocupacoes, '[]'),
    p_solicitante_nome, p_solicitante_tel,
    p_tipo,
    COALESCE(NULLIF(TRIM(p_titulo), ''), 'Sem título'),
    p_descricao, p_participantes,
    COALESCE(NULLIF(TRIM(p_justificativa), ''), 'Não informada'),
    COALESCE(p_aceita_outro_esp, 'Não'), p_espacos_alt,
    COALESCE(p_aceita_outro_hor, 'Não'), p_horarios_alt, p_obs_alt
  );

  RETURN jsonb_build_object('ok', true, 'protocolo', v_protocolo);
END;
$$;

REVOKE ALL ON FUNCTION public.requisitar_espaco_ocupado FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requisitar_espaco_ocupado(
  TEXT,DATE,TEXT,TEXT,JSONB,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
) TO anon, authenticated;
