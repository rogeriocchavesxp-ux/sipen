-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Migração estrutural: FK de espaços em agenda e demandas
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
--
-- O quê:
--   1. Adiciona espaco_id UUID FK em public.agenda
--   2. Adiciona local_id  UUID FK em public.demandas
--   3. Backfill por correspondência de nome (case-insensitive)
--   4. Índices de performance
--   5. Atualiza RPCs de disponibilidade para usar FK (exato) com
--      fallback ILIKE para registros legados sem FK
--   6. Atualiza solicitar_agendamento para gravar espaco_id
-- ═══════════════════════════════════════════════════════════════


-- ── 1. Colunas FK (nullable — sem quebra retroativa) ─────────

ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS espaco_id UUID REFERENCES public.espacos(id) ON DELETE SET NULL;

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES public.espacos(id) ON DELETE SET NULL;


-- ── 2. Backfill por nome ──────────────────────────────────────
-- Registros cujo nome bate exato (case-insensitive) recebem o UUID.
-- Registros com nomes divergentes ficam com local_id/espaco_id NULL
-- e continuam sendo cobertos pelo ILIKE nas RPCs.

UPDATE public.agenda ag
SET espaco_id = e.id
FROM public.espacos e
WHERE LOWER(TRIM(ag.espaco)) = LOWER(TRIM(e.nome))
  AND ag.espaco    IS NOT NULL
  AND ag.espaco_id IS NULL;

UPDATE public.demandas d
SET local_id = e.id
FROM public.espacos e
WHERE LOWER(TRIM(d.local)) = LOWER(TRIM(e.nome))
  AND d.local    IS NOT NULL
  AND d.local_id IS NULL;


-- ── 3. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agenda_espaco_id   ON public.agenda(espaco_id);
CREATE INDEX IF NOT EXISTS idx_demandas_local_id  ON public.demandas(local_id);


-- ── 4. RPC: espacos_disponibilidade (portal público) ─────────
-- Registros novos: espaco_id IS NOT NULL → match exato por UUID.
-- Registros legados: espaco_id IS NULL   → ILIKE (comportamento atual).

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
  v_data_fim  DATE;
  v_hora_fim  TEXT;
  v_hora_ini  TEXT;
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
        -- FK exato para registros novos; ILIKE para legados
        AND (
          (ag.espaco_id IS NOT NULL AND ag.espaco_id = esp.id)
          OR (ag.espaco_id IS NULL  AND ag.espaco ILIKE '%' || esp.nome || '%')
        )
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


-- ── 5. RPC: espacos_disponibilidade_admin ────────────────────

DROP FUNCTION IF EXISTS public.espacos_disponibilidade_admin(DATE,TEXT,DATE,TEXT,UUID);

CREATE OR REPLACE FUNCTION public.espacos_disponibilidade_admin(
  p_data_inicio   DATE,
  p_hora_inicio   TEXT,
  p_data_fim      DATE    DEFAULT NULL,
  p_hora_fim      TEXT    DEFAULT NULL,
  p_excluir_id    UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_fim  DATE;
  v_hora_fim  TEXT;
  v_hora_ini  TEXT;
  v_resultado JSONB;
BEGIN
  v_data_fim := COALESCE(p_data_fim, p_data_inicio);
  v_hora_ini := COALESCE(NULLIF(p_hora_inicio,''), '00:00');
  v_hora_fim := COALESCE(NULLIF(p_hora_fim,''),    '23:59');

  SELECT jsonb_agg(
    jsonb_build_object(
      'nome',       esp.nome,
      'grupo',      esp.grupo,
      'disponivel', (conflito.id IS NULL),
      'conflito', CASE
        WHEN conflito.id IS NOT NULL THEN jsonb_build_object(
          'id',                conflito.id,
          'titulo',            conflito.titulo,
          'status',            conflito.status,
          'data',              conflito.data,
          'data_encerramento', conflito.data_encerramento,
          'hora_inicio',       conflito.hora_inicio,
          'hora_fim',          conflito.hora_fim,
          'organizador',       conflito.organizador,
          'solicitante',       conflito.solicitante_txt,
          'origem',            conflito.origem
        )
        ELSE NULL
      END
    )
    ORDER BY esp.ordem
  )
  INTO v_resultado
  FROM public.espacos esp
  LEFT JOIN LATERAL (
    SELECT ag.id, ag.titulo, ag.status, ag.data, ag.data_encerramento,
           ag.hora_inicio, ag.hora_fim, ag.organizador,
           ag.solicitante_txt, ag.origem
    FROM public.agenda ag
    WHERE ag.deleted_at IS NULL
      AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
      AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
      AND (
        (ag.espaco_id IS NOT NULL AND ag.espaco_id = esp.id)
        OR (ag.espaco_id IS NULL  AND ag.espaco ILIKE '%' || esp.nome || '%')
      )
      AND (p_data_inicio::TEXT || 'T' || v_hora_ini)
          < (COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T' || COALESCE(NULLIF(ag.hora_fim,''), '23:59'))
      AND (v_data_fim::TEXT || 'T' || v_hora_fim)
          > (ag.data::TEXT || 'T' || COALESCE(NULLIF(ag.hora_inicio,''), '00:00'))
    LIMIT 1
  ) conflito ON true
  WHERE esp.ativo = true;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.espacos_disponibilidade_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade_admin TO authenticated;


-- ── 6. RPC: solicitar_agendamento — grava espaco_id ──────────
-- Busca o UUID do espaço pelo nome e grava junto com espaco (TEXT).

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

  -- Resolve espaco_id pelo nome (case-insensitive)
  IF p_espaco IS NOT NULL THEN
    SELECT id INTO v_espaco_id
    FROM public.espacos
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_espaco))
      AND ativo = true
    LIMIT 1;
  END IF;

  -- Verifica conflito: FK exato (novo) ou ILIKE bidirecional (legado)
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

  RETURN jsonb_build_object(
    'ok',        true,
    'protocolo', v_protocolo,
    'agenda_id', v_agenda_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_agendamento FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_agendamento TO anon, authenticated;
