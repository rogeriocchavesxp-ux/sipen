-- Patch: ampliar policy de DELETE em ministerios para admins
-- Problema: policy anterior só permitia excluir ministérios criados pelo
-- próprio usuário (criado_por = auth.uid()), bloqueando admins silenciosamente.

DROP POLICY IF EXISTS ministerios_delete ON public.ministerios;

CREATE POLICY ministerios_delete ON public.ministerios
  FOR DELETE TO authenticated
  USING (
    criado_por = (SELECT auth.uid())
    OR criado_por IS NULL
    OR public.is_admin()
  );
