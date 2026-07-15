-- Migração: espacos_disponibilidade v3 — clamp de datas de ocupação
-- Problema: após consolidação de eventos recorrentes, a subquery de ocupacoes
-- retornava ag.data (início da série) e ag.data_encerramento (fim da série),
-- exibindo "de 10/01 às 13:00 até 27/12 às 17:30" mesmo quando o usuário
-- solicitava apenas 18/07.
-- Solução: clamp das datas ao intervalo consultado (GREATEST/LEAST).

DROP FUNCTION IF EXISTS public.espacos_disponibilidade(date, time, date, time, uuid);

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
        AND ag.data                                    <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data)   >= p_data_inicio
        AND (
          p_hora_fim IS NULL OR ag.hora_fim IS NULL
          OR (ag.hora_inicio < p_hora_fim AND ag.hora_fim > p_hora_inicio)
        )
    ) AS disponivel,

    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'hora_inicio', ag.hora_inicio,
            'hora_fim',    ag.hora_fim,
            -- Clamp: exibe apenas o intervalo dentro do período consultado,
            -- não a série completa do evento recorrente.
            'data',        GREATEST(ag.data, p_data_inicio),
            'data_enc',    LEAST(COALESCE(ag.data_encerramento, ag.data), v_data_fim)
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
        AND ag.data                                    <= v_data_fim
        AND COALESCE(ag.data_encerramento, ag.data)   >= p_data_inicio
    ) AS ocupacoes

  FROM public.espacos esp
  WHERE esp.disponivel_publico = true
    AND esp.ativo              = true
  ORDER BY esp.ordem;
END;
$$;

GRANT EXECUTE ON FUNCTION public.espacos_disponibilidade(date, time, date, time, uuid)
  TO anon, authenticated;
