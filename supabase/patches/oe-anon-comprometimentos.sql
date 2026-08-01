-- Permite que usuários anônimos registrem comprometimentos em campanhas públicas
-- Usado pelo campanha.html quando membro escolhe contribuição recorrente

GRANT INSERT ON public.oe_comprometimentos TO anon;

DROP POLICY IF EXISTS "anon_insert_comprometimentos_publicos" ON public.oe_comprometimentos;
CREATE POLICY "anon_insert_comprometimentos_publicos"
  ON public.oe_comprometimentos
  FOR INSERT
  TO anon
  WITH CHECK (
    tipo = 'recorrente'
    AND status = 'ativo'
    AND EXISTS (
      SELECT 1 FROM public.ofertas_especiais oe
      WHERE oe.id = campanha_id AND oe.publica = true
    )
  );
