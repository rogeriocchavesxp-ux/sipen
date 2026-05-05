-- ═══════════════════════════════════════════════════════
-- SIPEN — RLS Hardening: tabelas financeiras
-- Requer que o usuário esteja AUTENTICADO para acessar dados financeiros
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- financeiro_solicitacoes: remover acesso anon
DROP POLICY IF EXISTS "allow_all_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "auth_read_fin_sol"
  ON public.financeiro_solicitacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_fin_sol"
  ON public.financeiro_solicitacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_fin_sol"
  ON public.financeiro_solicitacoes FOR UPDATE TO authenticated USING (true);

-- financeiro_anexos: remover acesso anon
DROP POLICY IF EXISTS "allow_all_fin_anexos" ON public.financeiro_anexos;
CREATE POLICY "auth_all_fin_anexos"
  ON public.financeiro_anexos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Revogar grant de anon nas tabelas financeiras
REVOKE ALL ON public.financeiro_solicitacoes FROM anon;
REVOKE ALL ON public.financeiro_anexos FROM anon;
