-- Corrige policy de UPDATE em demandas
-- Problema: role 'administrador_geral' não estava na lista de roles permitidas,
-- causando falha silenciosa (0 linhas atualizadas, HTTP 200 sem erro)

DROP POLICY IF EXISTS "demandas_update_roles_or_responsavel" ON public.demandas;

CREATE POLICY "demandas_update_roles_or_responsavel" ON public.demandas
  FOR UPDATE TO authenticated
  USING (
    has_any_role(ARRAY['administrador_geral','admin','secretaria','pastor','tesoureiro','lider_pg'])
    OR EXISTS (
      SELECT 1 FROM pessoas p
      WHERE p.auth_user_id = auth.uid() AND p.id = demandas.responsavel_id
    )
  )
  WITH CHECK (
    has_any_role(ARRAY['administrador_geral','admin','secretaria','pastor','tesoureiro','lider_pg'])
    OR EXISTS (
      SELECT 1 FROM pessoas p
      WHERE p.auth_user_id = auth.uid() AND p.id = demandas.responsavel_id
    )
  );

-- Verificar resultado:
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'demandas' AND cmd = 'UPDATE';
