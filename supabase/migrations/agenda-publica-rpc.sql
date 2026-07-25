-- ══════════════════════════════════════════════════════════════
-- SIPEN — RPC pública para agenda (bypassa RLS completamente)
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- Também corrige policies antigas que bloqueavam anon
DROP POLICY IF EXISTS "agenda_anon_select"   ON public.agenda;
DROP POLICY IF EXISTS "agenda_public_select" ON public.agenda;

-- Função SECURITY DEFINER: executa como owner, ignora RLS
CREATE OR REPLACE FUNCTION public.agenda_publica()
RETURNS TABLE (
  id           UUID,
  titulo       TEXT,
  tipo         TEXT,
  data         DATE,
  hora_inicio  TEXT,
  hora_fim     TEXT,
  espaco       TEXT,
  organizador  TEXT,
  descricao    TEXT,
  recorrencia  TEXT
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
    hora_inicio,
    hora_fim,
    espaco,
    organizador,
    descricao,
    recorrencia
  FROM public.agenda
  WHERE status = 'confirmado'
    AND visibilidade = 'publica'
    AND deleted_at IS NULL
  ORDER BY data ASC, hora_inicio ASC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.agenda_publica() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agenda_publica() TO anon, authenticated;

-- Verificação: quantos eventos a função retorna
SELECT COUNT(*) AS eventos_publicos FROM public.agenda_publica();
