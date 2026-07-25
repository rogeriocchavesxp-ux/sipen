-- ══════════════════════════════════════════════════════════════
-- SIPEN — Padronização de protocolos e números de chamado
-- Objetivo: unificar todos os formatos em PREFIX-YYYY-000001 (6 dígitos)
--
-- Antes:
--   agenda (via trigger)  → AG-YYYY-0001       (4 dígitos)
--   agenda (via RPC)      → AG-YYYYMMDD-XXXXXX (data+UUID)
--   requisicoes_espaco    → REQ-YYYY-XXXXXX    (ano+UUID)
--   demandas              → AGE-YYYY-000001    (6 dígitos) ✓ inalterado
--
-- Depois (todos):
--   agenda                → AG-YYYY-000001     (6 dígitos, sequencial)
--   requisicoes_espaco    → REQ-YYYY-000001    (6 dígitos, sequencial)
--   demandas              → AGE-YYYY-000001    (6 dígitos) ✓ inalterado
--
-- ⚠ Este script renumera protocolos existentes em ordem cronológica.
--   Execute apenas em ambiente com backup recente.
-- ══════════════════════════════════════════════════════════════


-- ── 1. Atualizar gerar_protocolo_agenda(): 4 → 6 dígitos ─────────────
CREATE OR REPLACE FUNCTION public.gerar_protocolo_agenda()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq INTEGER;
BEGIN
  INSERT INTO public.agenda_protocolo_seq (ano, seq)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET seq = public.agenda_protocolo_seq.seq + 1
  RETURNING seq INTO v_seq;

  RETURN 'AG-' || v_ano::TEXT || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;


-- ── 2. Tabela de sequência para requisições de espaço ─────────────────
CREATE TABLE IF NOT EXISTS public.requisicoes_espaco_seq (
  ano INTEGER NOT NULL PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0
);


-- ── 3. Função geradora de protocolo para requisições ──────────────────
CREATE OR REPLACE FUNCTION public.gerar_protocolo_requisicao()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_ano INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq INTEGER;
BEGIN
  INSERT INTO public.requisicoes_espaco_seq (ano, seq)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET seq = public.requisicoes_espaco_seq.seq + 1
  RETURNING seq INTO v_seq;

  RETURN 'REQ-' || v_ano::TEXT || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_protocolo_requisicao() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_protocolo_requisicao() TO authenticated;


-- ── 4. solicitar_agendamento: substituir UUID por sequencial ──────────
-- Substitui a versão de conflito-reserva-fix.sql
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

  -- Protocolo sequencial padronizado (AG-YYYY-000001)
  v_protocolo := public.gerar_protocolo_agenda();

  -- Verifica conflito com ILIKE bidirecional
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

REVOKE ALL ON FUNCTION public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_agendamento(TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,DATE) TO anon, authenticated;


-- ── 5. requisitar_espaco_ocupado: substituir UUID por sequencial ──────
DROP FUNCTION IF EXISTS public.requisitar_espaco_ocupado(
  TEXT,DATE,TEXT,TEXT,JSONB,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
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

  -- Protocolo sequencial padronizado (REQ-YYYY-000001)
  v_protocolo := public.gerar_protocolo_requisicao();

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


-- ── 6. Backfill agenda: renumerar todos os protocolos → 6 dígitos ─────
-- Zera a sequência do ano corrente para recomeçar do 1
DELETE FROM public.agenda_protocolo_seq WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Nulifica todos os formatos antigos (4 dígitos ou data+UUID)
UPDATE public.agenda SET protocolo = NULL
WHERE deleted_at IS NULL
  AND protocolo IS NOT NULL
  AND (
    protocolo ~ '^AG-\d{4}-\d{4}$'           -- formato antigo 4 dígitos
    OR protocolo ~ '^AG-\d{8}-[A-Z0-9]{6}$'  -- formato data+UUID
  );

-- Regera em ordem cronológica com o novo padrão de 6 dígitos
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM public.agenda
    WHERE protocolo IS NULL
      AND deleted_at IS NULL
    ORDER BY COALESCE(data, created_at::date, CURRENT_DATE) ASC, created_at ASC
  LOOP
    UPDATE public.agenda
    SET protocolo = public.gerar_protocolo_agenda()
    WHERE id = r.id;
  END LOOP;
END $$;


-- ── 7. Backfill requisições: renumerar todos os protocolos → 6 dígitos
-- Zera a sequência do ano corrente para recomeçar do 1
DELETE FROM public.requisicoes_espaco_seq WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Nulifica todos os formatos UUID existentes
UPDATE public.requisicoes_espaco SET protocolo = NULL
WHERE deleted_at IS NULL
  AND protocolo IS NOT NULL
  AND protocolo ~ '^REQ-\d{4}-[A-Z0-9]{6}$';

-- Regera em ordem cronológica com o novo padrão de 6 dígitos
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM public.requisicoes_espaco
    WHERE protocolo IS NULL
      AND deleted_at IS NULL
    ORDER BY COALESCE(data_solicitada, created_at::date, CURRENT_DATE) ASC, created_at ASC
  LOOP
    UPDATE public.requisicoes_espaco
    SET protocolo = public.gerar_protocolo_requisicao()
    WHERE id = r.id;
  END LOOP;
END $$;


-- ── 8. Verificação final ──────────────────────────────────────────────
SELECT 'agenda' AS tabela,
  COUNT(*)                                   AS total,
  COUNT(protocolo)                           AS com_protocolo,
  COUNT(*) FILTER (WHERE protocolo IS NULL)  AS sem_protocolo,
  MIN(protocolo)                             AS primeiro,
  MAX(protocolo)                             AS ultimo
FROM public.agenda
WHERE deleted_at IS NULL

UNION ALL

SELECT 'requisicoes_espaco' AS tabela,
  COUNT(*),
  COUNT(protocolo),
  COUNT(*) FILTER (WHERE protocolo IS NULL),
  MIN(protocolo),
  MAX(protocolo)
FROM public.requisicoes_espaco
WHERE deleted_at IS NULL;
