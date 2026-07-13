-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Fluxo de aprovação de agendamentos com reserva provisória
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Novas colunas na tabela agenda ────────────────────────
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS solicitante_txt      TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_tel      TEXT,
  ADD COLUMN IF NOT EXISTS protocolo            TEXT,
  ADD COLUMN IF NOT EXISTS origem_sol           TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS visibilidade_publica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovador_id         UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notif_historico      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS participantes        INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agenda_protocolo
  ON public.agenda(protocolo) WHERE protocolo IS NOT NULL;

-- ── 2. Estender o CHECK de status para incluir novos valores ──
-- Remove o constraint existente (PostgreSQL auto-nomeia como agenda_status_check)
DO $$
DECLARE v_con TEXT;
BEGIN
  FOR v_con IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'agenda'
      AND constraint_type = 'CHECK'
  LOOP
    EXECUTE 'ALTER TABLE public.agenda DROP CONSTRAINT IF EXISTS ' || quote_ident(v_con);
  END LOOP;
END $$;

ALTER TABLE public.agenda ADD CONSTRAINT agenda_status_check
  CHECK (status IN (
    'pendente','confirmado','cancelado','realizado','reagendado',
    'aguardando_aprovacao','em_analise','ajuste_solicitado','recusado'
  ));

-- ── 3. RLS: anon só enxerga confirmados e públicos ───────────
-- Política existente pode precisar ser recriada
DROP POLICY IF EXISTS "agenda_anon_select"   ON public.agenda;
DROP POLICY IF EXISTS "agenda_public_select" ON public.agenda;

CREATE POLICY "agenda_anon_select" ON public.agenda
  FOR SELECT TO anon
  USING (
    status = 'confirmado'
    AND (visibilidade_publica = true OR visibilidade_publica IS NULL)
    AND deleted_at IS NULL
  );

-- Autenticados continuam vendo tudo
DROP POLICY IF EXISTS "agenda_auth_all" ON public.agenda;
CREATE POLICY "agenda_auth_all" ON public.agenda
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- ── 4. GRANT anon para INSERT via RPC ─────────────────────────
-- (a RPC usa SECURITY DEFINER, então ela própria faz o INSERT)

-- ── 5. Função pública de solicitação de agendamento ───────────
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN);
DROP FUNCTION IF EXISTS public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT);

CREATE OR REPLACE FUNCTION public.solicitar_agendamento(
  p_titulo        TEXT,
  p_data          DATE,
  p_hora_inicio   TEXT,
  p_hora_fim      TEXT,
  p_espaco        TEXT,
  p_subcategoria  TEXT,
  p_observacao    TEXT,
  p_nome          TEXT,
  p_telefone      TEXT,
  p_participantes INTEGER DEFAULT NULL,
  p_origem        TEXT    DEFAULT 'link_publico',
  p_publica       BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo TEXT;
  v_agenda_id UUID;
  v_conflito  BOOLEAN := false;
  v_nomeMes   TEXT;
  v_diaSem    TEXT;
BEGIN
  -- Gera protocolo único
  v_protocolo := 'AG-' || to_char(p_data, 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  -- Verifica conflito de espaço e horário
  IF p_espaco IS NOT NULL AND p_hora_inicio IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.agenda
      WHERE data = p_data
        AND espaco IS NOT NULL
        AND LOWER(espaco) = LOWER(p_espaco)
        AND status NOT IN ('cancelado','recusado')
        AND deleted_at IS NULL
        AND hora_inicio IS NOT NULL
        AND (
          (hora_inicio <= p_hora_inicio AND (hora_fim IS NULL OR hora_fim > p_hora_inicio))
          OR (hora_inicio < COALESCE(p_hora_fim,'23:59') AND (hora_fim IS NULL OR hora_fim >= COALESCE(p_hora_fim,'23:59')))
          OR (hora_inicio >= p_hora_inicio AND hora_inicio < COALESCE(p_hora_fim,'23:59'))
        )
    ) INTO v_conflito;
  END IF;

  IF v_conflito THEN
    RETURN jsonb_build_object(
      'ok',       false,
      'conflito', true,
      'erro',     'Já existe uma solicitação para este espaço neste horário. Entre em contato com a secretaria para verificar disponibilidade.'
    );
  END IF;

  -- Calcula mês e dia da semana
  v_nomeMes := to_char(p_data, 'TMMonth');
  v_nomeMes := UPPER(LEFT(v_nomeMes,1)) || LOWER(SUBSTRING(v_nomeMes FROM 2));
  v_diaSem  := to_char(p_data, 'TMDay');
  v_diaSem  := UPPER(LEFT(v_diaSem,1)) || LOWER(SUBSTRING(v_diaSem FROM 2)) || '-feira';

  -- Cria entrada na agenda como reserva provisória
  INSERT INTO public.agenda (
    titulo, descricao, tipo,
    data, mes, dia_semana, hora_inicio, hora_fim,
    espaco, organizador, observacao,
    status, visibilidade_publica,
    solicitante_txt, solicitante_tel,
    protocolo, origem_sol, origem,
    participantes, recorrencia
  ) VALUES (
    p_titulo,
    p_subcategoria || CASE WHEN p_observacao IS NOT NULL THEN E'\n' || p_observacao ELSE '' END,
    p_subcategoria,
    p_data, v_nomeMes, v_diaSem,
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


-- ── 6. Função de aprovação (autenticados) ────────────────────
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
    status              = 'confirmado',
    visibilidade_publica = true,
    aprovado_por_nome   = p_aprovador,
    aprovado_em         = NOW(),
    obs                 = COALESCE(p_obs, obs),
    notif_historico     = notif_historico || jsonb_build_object(
      'evento', 'aprovado', 'em', NOW()::TEXT, 'por', p_aprovador
    )
  WHERE id = p_agenda_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'protocolo',   v_row.protocolo,
    'titulo',      v_row.titulo,
    'telefone',    v_row.solicitante_tel,
    'solicitante', v_row.solicitante_txt,
    'data',        v_row.data::TEXT,
    'hora_inicio', v_row.hora_inicio,
    'hora_fim',    v_row.hora_fim,
    'espaco',      v_row.espaco
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_agendamento TO authenticated;


-- ── 7. Função de recusa (autenticados) ───────────────────────
CREATE OR REPLACE FUNCTION public.recusar_agendamento(
  p_agenda_id UUID,
  p_motivo    TEXT,
  p_aprovador TEXT DEFAULT 'Administrador'
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
    status              = 'recusado',
    visibilidade_publica = false,
    motivo_rejeicao     = p_motivo,
    aprovado_por_nome   = p_aprovador,
    aprovado_em         = NOW(),
    notif_historico     = notif_historico || jsonb_build_object(
      'evento', 'recusado', 'em', NOW()::TEXT, 'por', p_aprovador, 'motivo', p_motivo
    )
  WHERE id = p_agenda_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'protocolo',   v_row.protocolo,
    'titulo',      v_row.titulo,
    'telefone',    v_row.solicitante_tel,
    'solicitante', v_row.solicitante_txt,
    'data',        v_row.data::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recusar_agendamento TO authenticated;
