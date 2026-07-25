-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix agenda pública: atualiza RPC agenda_publica()
--
-- Problema: a versão anterior filtrava por visibilidade = 'publica'
--           mas eventos criados internamente não têm esse valor.
--           Além disso, faltavam colunas usadas pela página pública.
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.agenda_publica();

CREATE OR REPLACE FUNCTION public.agenda_publica()
RETURNS TABLE (
  id                UUID,
  titulo            TEXT,
  tipo              TEXT,
  data              DATE,
  data_encerramento DATE,
  hora_inicio       TEXT,
  hora_fim          TEXT,
  dia_semana        TEXT,
  mes               TEXT,
  espaco            TEXT,
  organizador       TEXT,
  responsavel       TEXT,
  descricao         TEXT,
  observacao        TEXT,
  recorrencia       TEXT,
  status            TEXT,
  dias              JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    id,
    titulo,
    tipo,
    data,
    data_encerramento,
    hora_inicio,
    hora_fim,
    dia_semana,
    mes,
    espaco,
    organizador,
    responsavel,
    descricao,
    observacao,
    recorrencia,
    status,
    dias
  FROM public.agenda
  WHERE status = 'confirmado'
    AND deleted_at IS NULL
  ORDER BY data ASC, hora_inicio ASC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.agenda_publica() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agenda_publica() TO anon, authenticated;

-- Verificação
SELECT COUNT(*) AS eventos_publicos FROM public.agenda_publica();
