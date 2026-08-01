-- Permite que usuários anônimos registrem contribuições em campanhas públicas
-- Origem sempre 'publico', status sempre 'aguardando' — admin concilia depois

GRANT INSERT ON public.oe_contribuicoes TO anon;

DROP POLICY IF EXISTS "anon_insert_contribuicoes_publicas" ON public.oe_contribuicoes;
CREATE POLICY "anon_insert_contribuicoes_publicas"
  ON public.oe_contribuicoes
  FOR INSERT
  TO anon
  WITH CHECK (
    origem = 'publico'
    AND status_conciliacao = 'aguardando'
    AND EXISTS (
      SELECT 1 FROM public.ofertas_especiais oe
      WHERE oe.id = campanha_id AND oe.publica = true
    )
  );
