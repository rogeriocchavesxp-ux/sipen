-- Adiciona policy de DELETE em nomeados para authenticated
-- Necessário para remoção de líderes e membros de sociedades via UI

DROP POLICY IF EXISTS "nomeados_del" ON public.nomeados;

CREATE POLICY "nomeados_del" ON public.nomeados
  FOR DELETE TO authenticated
  USING (deleted_at IS NULL);
