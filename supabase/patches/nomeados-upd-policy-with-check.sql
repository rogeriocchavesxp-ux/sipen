-- Corrige policy de UPDATE em nomeados para permitir soft-delete (setar deleted_at)
-- O problema: USING (deleted_at IS NULL) sem WITH CHECK explícito faz o PostgreSQL
-- aplicar a mesma condição ao novo estado da linha — bloqueando qualquer UPDATE
-- que mude deleted_at para um valor não-nulo.

DROP POLICY IF EXISTS "nomeados_upd" ON public.nomeados;

CREATE POLICY "nomeados_upd" ON public.nomeados
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);
