-- Corrige policy de UPDATE em demandas para aceitar qualquer valor
-- (sem WITH CHECK, PostgreSQL usa o USING como filtro pós-update,
--  silenciando atualizações que retornam 0 linhas sem erro)

-- Ver policies atuais antes de aplicar:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'demandas' AND cmd = 'UPDATE';

-- Recriar com WITH CHECK explícito:
DROP POLICY IF EXISTS "demandas_upd" ON public.demandas;

CREATE POLICY "demandas_upd" ON public.demandas
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Verificar:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'demandas' AND cmd = 'UPDATE';
