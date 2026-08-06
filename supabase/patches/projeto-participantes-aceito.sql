-- Adiciona coluna aceito à projeto_participantes e policy de UPDATE
-- Executar no Supabase SQL Editor

ALTER TABLE public.projeto_participantes
  ADD COLUMN IF NOT EXISTS aceito BOOLEAN DEFAULT NULL;

-- Participante pode aceitar/recusar seu próprio convite
CREATE POLICY "pp_update_self" ON public.projeto_participantes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pessoas pe
      WHERE pe.id = pessoa_id AND pe.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- Verificar:
SELECT id, nivel, aceito FROM projeto_participantes LIMIT 10;
