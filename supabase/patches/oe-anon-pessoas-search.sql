-- Permite que usuários anônimos busquem membros pelo nome na página pública de campanha
-- Acesso limitado a id e nome — sem dados sensíveis

GRANT SELECT (id, nome) ON public.pessoas TO anon;

DROP POLICY IF EXISTS "anon_search_pessoas_ativas" ON public.pessoas;
CREATE POLICY "anon_search_pessoas_ativas"
  ON public.pessoas
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);
