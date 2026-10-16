-- Permite leitura anônima de eleicao_votacao_config
-- Necessário para votacao.html (página pública, sem autenticação)
DROP POLICY IF EXISTS "anon_select_votacao_config" ON public.eleicao_votacao_config;
CREATE POLICY "anon_select_votacao_config"
  ON public.eleicao_votacao_config
  FOR SELECT
  TO anon
  USING (true);
