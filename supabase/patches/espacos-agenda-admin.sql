-- Patch: espacos_agenda_admin
-- Retorna todos os eventos da agenda vinculados a espaços físicos,
-- no intervalo de datas solicitado. Uso exclusivo do painel admin.
-- Executa como: POST /rest/v1/rpc/espacos_agenda_admin { p_inicio, p_fim }

CREATE OR REPLACE FUNCTION public.espacos_agenda_admin(
  p_inicio DATE,
  p_fim    DATE
)
RETURNS TABLE(
  evento_id   UUID,
  titulo      TEXT,
  status      TEXT,
  tipo        TEXT,
  data        DATE,
  data_enc    DATE,
  hora_inicio TIME,
  hora_fim    TIME,
  solicitante TEXT,
  espaco_id   UUID,
  espaco_nome TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ag.id::UUID                         AS evento_id,
    COALESCE(ag.titulo, '(sem título)')::TEXT AS titulo,
    ag.status::TEXT,
    ag.tipo::TEXT,
    ag.data,
    ag.data_encerramento                AS data_enc,
    ag.hora_inicio,
    ag.hora_fim,
    COALESCE(ag.solicitante_txt, '—')::TEXT AS solicitante,
    esp.id::UUID                        AS espaco_id,
    COALESCE(esp.nome, ag.espaco)::TEXT AS espaco_nome
  FROM public.agenda ag
  LEFT JOIN public.espacos esp ON esp.id = ag.espaco_id
  WHERE ag.deleted_at IS NULL
    AND ag.status NOT IN ('cancelado', 'recusado', 'arquivado')
    AND ag.data <= p_fim
    AND COALESCE(ag.data_encerramento, ag.data) >= p_inicio
    AND (ag.espaco_id IS NOT NULL OR (ag.espaco IS NOT NULL AND ag.espaco <> ''))
  ORDER BY ag.data, ag.hora_inicio, esp.nome;
$$;

GRANT EXECUTE ON FUNCTION public.espacos_agenda_admin(date, date) TO authenticated;
