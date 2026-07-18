-- Políticas de leitura pública para a página /escalas
-- Executar no Supabase SQL Editor

-- Pregação
CREATE POLICY "public_read_escala_pregacao"
  ON public.escala_pregacao FOR SELECT
  USING (true);

-- Pastores (apenas leitura de nome — necessário para join no front)
CREATE POLICY "public_read_pastores"
  ON public.pastores FOR SELECT
  USING (true);

-- Diaconal
CREATE POLICY "public_read_escala_diaconal"
  ON public.escala_diaconal FOR SELECT
  USING (true);

-- Música
CREATE POLICY "public_read_escala_musica"
  ON public.escala_musica FOR SELECT
  USING (true);
