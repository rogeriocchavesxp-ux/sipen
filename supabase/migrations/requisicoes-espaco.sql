-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Requisição de Espaço Ocupado
-- Execute no Supabase SQL Editor (bloco único)
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabela ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requisicoes_espaco (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo                    TEXT        UNIQUE NOT NULL,

  -- Espaço e período requisitado
  espaco_nome                  TEXT        NOT NULL,
  data_solicitada              DATE        NOT NULL,
  hora_inicio_sol              TEXT,
  hora_fim_sol                 TEXT,

  -- Ocupações conflitantes (apenas horários — sem dados internos)
  ocupacoes_conflito           JSONB       NOT NULL DEFAULT '[]',

  -- Dados do solicitante
  solicitante_nome             TEXT        NOT NULL,
  solicitante_tel              TEXT,

  -- Programação pretendida
  tipo_programacao             TEXT,
  titulo                       TEXT        NOT NULL,
  descricao                    TEXT,
  participantes                INTEGER,
  justificativa                TEXT        NOT NULL,

  -- Flexibilidade
  aceita_outro_espaco          TEXT        NOT NULL DEFAULT 'Não',
  espacos_alternativos         TEXT,
  aceita_outro_horario         TEXT        NOT NULL DEFAULT 'Não',
  horarios_alternativos        TEXT,
  observacoes_alt              TEXT,

  -- Status
  status                       TEXT        NOT NULL DEFAULT 'AGUARDANDO_ANALISE',

  -- Análise administrativa
  analisado_por                UUID,
  analisado_em                 TIMESTAMPTZ,
  decisao                      TEXT,
  decisao_justificativa        TEXT,
  espaco_alternativo_oferecido TEXT,
  horario_alternativo_oferecido TEXT,

  -- Rastreabilidade
  historico                    JSONB       NOT NULL DEFAULT '[]',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                   TIMESTAMPTZ
);

-- CHECK de status válidos
ALTER TABLE public.requisicoes_espaco
  DROP CONSTRAINT IF EXISTS req_espaco_status_check;
ALTER TABLE public.requisicoes_espaco
  ADD CONSTRAINT req_espaco_status_check CHECK (status IN (
    'AGUARDANDO_ANALISE','EM_ANALISE','SOLICITANDO_INFORMACOES',
    'NEGOCIACAO_NECESSARIA','ESPACO_LIBERADO','ALTERNATIVA_OFERECIDA',
    'REQUISICAO_NEGADA','CANCELADA'
  ));

-- RLS
ALTER TABLE public.requisicoes_espaco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "req_anon_insert"   ON public.requisicoes_espaco;
DROP POLICY IF EXISTS "req_auth_select"   ON public.requisicoes_espaco;
DROP POLICY IF EXISTS "req_auth_update"   ON public.requisicoes_espaco;

CREATE POLICY "req_anon_insert"  ON public.requisicoes_espaco
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "req_auth_select"  ON public.requisicoes_espaco
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "req_auth_update"  ON public.requisicoes_espaco
  FOR UPDATE TO authenticated USING (true);


-- ── 2. RPC pública: submeter requisição ───────────────────────────────
DROP FUNCTION IF EXISTS public.requisitar_espaco_ocupado(
  TEXT,DATE,TEXT,TEXT,JSONB,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
);

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
  -- Validações mínimas
  IF p_espaco_nome IS NULL OR p_data IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Espaço e data são obrigatórios.');
  END IF;
  IF COALESCE(TRIM(p_titulo), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe o título da programação.');
  END IF;
  IF COALESCE(TRIM(p_justificativa), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'A justificativa é obrigatória.');
  END IF;

  -- Verificar duplicata (mesmo espaço + data + hora + status ativo)
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

  -- Gerar protocolo
  v_protocolo := 'REQ-' || to_char(p_data, 'YYYY') || '-'
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


-- ── 3. RPC admin: atualizar status / registrar decisão ────────────────
DROP FUNCTION IF EXISTS public.admin_atualizar_requisicao(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_atualizar_requisicao(
  p_id                TEXT,
  p_status            TEXT,
  p_decisao           TEXT    DEFAULT NULL,
  p_justificativa     TEXT    DEFAULT NULL,
  p_espaco_alt        TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_hist JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado.');
  END IF;

  SELECT historico INTO v_hist FROM public.requisicoes_espaco WHERE id = p_id::UUID;
  IF v_hist IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Requisição não encontrada.');
  END IF;

  v_hist := v_hist || jsonb_build_array(jsonb_build_object(
    'ts',            now(),
    'por',           v_uid,
    'status',        p_status,
    'decisao',       p_decisao,
    'justificativa', p_justificativa
  ));

  UPDATE public.requisicoes_espaco SET
    status                       = p_status,
    decisao                      = p_decisao,
    decisao_justificativa        = p_justificativa,
    espaco_alternativo_oferecido = p_espaco_alt,
    analisado_por                = v_uid,
    analisado_em                 = now(),
    historico                    = v_hist,
    updated_at                   = now()
  WHERE id = p_id::UUID;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_atualizar_requisicao FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_requisicao(TEXT,TEXT,TEXT,TEXT,TEXT)
  TO authenticated;
