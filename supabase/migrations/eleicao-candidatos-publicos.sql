-- ═══════════════════════════════════════════════════════════════
-- SIPEN — RPC pública: candidatos da eleição para apresentação
-- Permite acesso anon para a página de apresentação pública.
-- Execute no Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.eleicao_candidatos_publicos(p_slug TEXT)
RETURNS TABLE(
  id            UUID,
  nome          TEXT,
  tipo          TEXT,
  congregacao   TEXT,
  foto_url      TEXT,
  vida_familiar      TEXT,
  vida_eclesiastica  TEXT,
  vida_profissional  TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.nome, c.tipo, c.congregacao,
    c.foto_url, c.vida_familiar, c.vida_eclesiastica, c.vida_profissional
  FROM eleicao_candidatos c
  JOIN eleicao_processos p ON p.id = c.processo_id
  WHERE p.slug = p_slug
    AND c.ativo = true
  ORDER BY c.tipo DESC, c.nome ASC;
$$;

GRANT EXECUTE ON FUNCTION public.eleicao_candidatos_publicos(TEXT) TO anon, authenticated;
