-- As políticas existentes nas tabelas de escala usam TO anon,
-- mas usuários autenticados (mobile com JWT) precisam de políticas próprias.
-- RLS ignora GRANTs — sem política, authenticated vê zero linhas.

DO $$ BEGIN
  CREATE POLICY "auth_select_escala_pregacao"
    ON public.escala_pregacao FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_insert_escala_pregacao"
    ON public.escala_pregacao FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_escala_pregacao"
    ON public.escala_pregacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_pastores"
    ON public.pastores FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_escala_musica"
    ON public.escala_musica FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_escala_diaconal"
    ON public.escala_diaconal FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
