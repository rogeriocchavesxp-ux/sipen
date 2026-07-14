-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Fix: permissão de DELETE em eleicao_indicacoes
-- Problema: GRANT só tinha SELECT, INSERT → DELETE silenciosamente ignorado
-- Execute no Supabase SQL Editor do projeto SIPEN (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- Policy de DELETE para usuários autenticados
DROP POLICY IF EXISTS "ei_delete" ON public.eleicao_indicacoes;
CREATE POLICY "ei_delete" ON public.eleicao_indicacoes
  FOR DELETE TO authenticated USING (true);

-- Concede permissão de DELETE no nível do PostgreSQL
GRANT DELETE ON public.eleicao_indicacoes TO authenticated;
