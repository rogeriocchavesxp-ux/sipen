-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Disponibilidade de espaços em tempo real
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Novas colunas na tabela espacos ───────────────────────
ALTER TABLE public.espacos
  ADD COLUMN IF NOT EXISTS margem_minutos        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permite_reserva_simul BOOLEAN NOT NULL DEFAULT false;

-- ── 2. RPC: verificar disponibilidade de todos os espaços ────
-- Retorna apenas {nome, grupo, disponivel} — sem expor dados internos
-- ao anon. Usa SECURITY DEFINER para ler a agenda sem expor RLS.
DROP FUNCTION IF EXISTS public.espacos_disponibilidade(DATE,TEXT,DATE,TEXT,UUID);

CREATE OR REPLACE FUNCTION public.espacos_disponibilidade(
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
  v_data_fim   DATE;
  v_hora_fim   TEXT;
  v_hora_ini   TEXT;
  v_resultado  JSONB;
BEGIN
  v_data_fim := COALESCE(p_data_fim, p_data_inicio);
  v_hora_ini := COALESCE(NULLIF(p_hora_inicio,''), '00:00');
  v_hora_fim := COALESCE(NULLIF(p_hora_fim,''),    '23:59');

  -- Para cada espaço público ativo, verifica se há conflito na agenda
  SELECT jsonb_agg(
    jsonb_build_object(
      'nome',       esp.nome,
      'grupo',      esp.grupo,
      'disponivel', NOT EXISTS (
        SELECT 1
        FROM public.agenda ag
        WHERE
          -- Ignora registros deletados e status que liberam o espaço
          ag.deleted_at IS NULL
          AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
          -- Exclui o próprio registro ao editar
          AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
          -- O campo espaco pode conter múltiplos separados por ", "
          -- Usa ILIKE para capturar matches parciais em listas
          AND ag.espaco ILIKE '%' || esp.nome || '%'
          -- Sobreposição de período:
          --   novo_inicio < existente_fim  E  novo_fim > existente_inicio
          AND (
            p_data_inicio::TEXT || 'T' || v_hora_ini
          ) < (
            COALESCE(ag.data_encerramento, ag.data)::TEXT || 'T' ||
            COALESCE(NULLIF(ag.hora_fim,''), '23:59')
          )
          AND (
            v_data_fim::TEXT || 'T' || v_hora_fim
          ) > (
            ag.data::TEXT || 'T' ||
            COALESCE(NULLIF(ag.hora_inicio,''), '00:00')
          )
      )
    )
    ORDER BY esp.ordem
  )
  INTO v_resultado
  FROM public.espacos esp
  WHERE esp.disponivel_publico = true
    AND esp.ativo              = true;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.espacos_disponibilidade FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade TO anon, authenticated;


-- ── 3. RPC admin: detalhes do conflito (somente autenticados) ─
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
  v_data_fim   DATE;
  v_hora_fim   TEXT;
  v_hora_ini   TEXT;
  v_resultado  JSONB;
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
          'id',              conflito.id,
          'titulo',          conflito.titulo,
          'status',          conflito.status,
          'data',            conflito.data,
          'data_encerramento', conflito.data_encerramento,
          'hora_inicio',     conflito.hora_inicio,
          'hora_fim',        conflito.hora_fim,
          'organizador',     conflito.organizador,
          'solicitante',     conflito.solicitante_txt,
          'origem',          conflito.origem
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
      AND ag.espaco ILIKE '%' || esp.nome || '%'
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
