-- Permite leitura pública (anon) de campanhas com publica=true
-- Necessário para campanha.html funcionar sem login

CREATE POLICY IF NOT EXISTS "anon_read_campanhas_publicas"
  ON public.ofertas_especiais
  FOR SELECT
  TO anon
  USING (publica = true);

-- Leitura anon de contribuições confirmadas de campanhas públicas
CREATE POLICY IF NOT EXISTS "anon_read_contribuicoes_publicas"
  ON public.oe_contribuicoes
  FOR SELECT
  TO anon
  USING (
    status_conciliacao = 'confirmada'
    AND EXISTS (
      SELECT 1 FROM public.ofertas_especiais oe
      WHERE oe.id = campanha_id AND oe.publica = true
    )
  );
