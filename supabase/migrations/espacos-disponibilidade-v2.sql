-- Migração: espacos_disponibilidade — retornar intervalos de ocupação
-- Executar no Supabase SQL Editor
--
-- Mudança: adiciona coluna "ocupacoes JSONB" ao retorno da função pública.
-- Isso permite que o portal exiba os horários ocupados de cada espaço,
-- mantendo privacidade (sem título, responsável ou dados internos).
--
-- ATENÇÃO: mudança de assinatura de retorno exige DROP + CREATE.

-- 1. Remover versão anterior
DROP FUNCTION IF EXISTS public.espacos_disponibilidade(date, time, date, time, uuid);

-- 2. Recriar com campo ocupacoes
CREATE OR REPLACE FUNCTION public.espacos_disponibilidade(
  p_data_inicio DATE,
  p_hora_inicio TIME  DEFAULT '00:00',
  p_data_fim    DATE  DEFAULT NULL,
  p_hora_fim    TIME  DEFAULT NULL,
  p_excluir_id  UUID  DEFAULT NULL
)
RETURNS TABLE(nome TEXT, grupo TEXT, disponivel BOOLEAN, ocupacoes JSONB)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_fim DATE;
BEGIN
  v_data_fim := COALESCE(p_data_fim, p_data_inicio);

  RETURN QUERY
  SELECT
    esp.nome::TEXT,
    COALESCE(esp.grupo, '')::TEXT AS grupo,

    -- disponivel: sem conflito no horário exato solicitado
    NOT EXISTS (
      SELECT 1
      FROM public.agenda ag
      WHERE ag.deleted_at IS NULL
        AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
        AND (p_excluir_id IS NULL OR ag.id != p_excluir_id)
        AND (
          (ag.espaco_id IS NOT NULL AND ag.espaco_id = esp.id)
          OR (ag.espaco_id IS NULL  AND ag.espaco ILIKE '%' || esp.nome || '%')
        )
        AND ag.data                             <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data_inicio
        AND (
          p_hora_fim IS NULL OR ag.hora_fim IS NULL
          OR (ag.hora_inicio < p_hora_fim AND ag.hora_fim > p_hora_inicio)
        )
    ) AS disponivel,

    -- ocupacoes: TODOS os intervalos no intervalo de datas consultado
    -- Sem campos internos (título, responsável, etc.) — privacidade pública
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'hora_inicio', ag.hora_inicio,
            'hora_fim',    ag.hora_fim,
            'data',        ag.data,
            'data_enc',    ag.data_encerramento
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
        AND ag.data                             <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data) >= p_data_inicio
    ) AS ocupacoes

  FROM public.espacos esp
  WHERE esp.disponivel_publico = true
    AND esp.ativo              = true
  ORDER BY esp.ordem;
END;
$$;

-- 3. Permissões (anon = portal público, authenticated = gestores)
GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade(date, time, date, time, uuid)
  TO anon, authenticated;
