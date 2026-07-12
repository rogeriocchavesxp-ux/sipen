-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Função: excluir_processo_eleitoral
-- Soft-delete em eleicao_processos (seta deleted_at).
-- SECURITY DEFINER para bypass de RLS via rpc().
-- Execute no Supabase SQL Editor do projeto SIPEN.
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.excluir_processo_eleitoral(UUID);

CREATE OR REPLACE FUNCTION public.excluir_processo_eleitoral(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.eleicao_processos
  SET deleted_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_processo_eleitoral(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.excluir_processo_eleitoral(UUID) TO authenticated;
