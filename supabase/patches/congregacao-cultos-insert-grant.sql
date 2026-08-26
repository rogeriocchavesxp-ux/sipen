-- ================================================================
-- SIPEN — Patch: garante INSERT/SELECT para authenticated em congregacao_cultos
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Habilitar RLS (idempotente)
ALTER TABLE public.congregacao_cultos ENABLE ROW LEVEL SECURITY;

-- 2. SELECT para qualquer autenticado
DROP POLICY IF EXISTS "cultos_select_auth" ON public.congregacao_cultos;
CREATE POLICY "cultos_select_auth"
  ON public.congregacao_cultos FOR SELECT
  TO authenticated
  USING (true);

-- 3. INSERT para qualquer autenticado
DROP POLICY IF EXISTS "cultos_insert_auth" ON public.congregacao_cultos;
CREATE POLICY "cultos_insert_auth"
  ON public.congregacao_cultos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. UPDATE para qualquer autenticado
DROP POLICY IF EXISTS "cultos_update_auth" ON public.congregacao_cultos;
CREATE POLICY "cultos_update_auth"
  ON public.congregacao_cultos FOR UPDATE
  TO authenticated
  USING (true);

-- 5. GRANT explícito (necessário se a tabela foi recriada)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregacao_cultos TO authenticated;

-- 6. Verificar estado atual
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'congregacao_cultos'
ORDER BY cmd, policyname;
