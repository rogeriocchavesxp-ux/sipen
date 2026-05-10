-- ═══════════════════════════════════════════════════════
-- SIPEN — Fix: RLS policies completas para tabela demandas
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. Garantir que RLS está ativo
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies existentes (evita conflito de nomes)
DROP POLICY IF EXISTS "anon_select_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "anon_insert_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "anon_update_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "anon_delete_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "auth_select_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "auth_insert_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "auth_update_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "auth_delete_demandas"  ON public.demandas;
DROP POLICY IF EXISTS "allow_all_demandas"    ON public.demandas;

-- 3. Uma policy permissiva cobrindo todas as roles e operações
--    (controle de acesso é feito pelo frontend / SIPEN)
CREATE POLICY "allow_all_demandas"
  ON public.demandas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. GRANT de segurança
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO anon, authenticated;
