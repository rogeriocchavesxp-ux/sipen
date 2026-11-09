-- Tabela de disponibilidade de pregação (separada da escala)
-- Pastores marcam disponibilidade aqui.
-- Admin consulta esta tabela e atribui o pregador em escala_pregacao.

CREATE TABLE IF NOT EXISTS public.disp_pregacao (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_pregacao_id  UUID        NOT NULL REFERENCES public.escala_pregacao(id) ON DELETE CASCADE,
  oficial_id          UUID        REFERENCES public.oficiais(id) ON DELETE CASCADE,
  pastor_id           UUID        REFERENCES public.pastores(id) ON DELETE CASCADE,
  observacao          TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT disp_tem_responsavel CHECK (oficial_id IS NOT NULL OR pastor_id IS NOT NULL)
);

-- Impede dupla marcação pelo mesmo pastor no mesmo slot
CREATE UNIQUE INDEX IF NOT EXISTS uniq_disp_oficial
  ON public.disp_pregacao (escala_pregacao_id, oficial_id)
  WHERE oficial_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_disp_pastor
  ON public.disp_pregacao (escala_pregacao_id, pastor_id)
  WHERE pastor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disp_pregacao_slot ON public.disp_pregacao (escala_pregacao_id);

-- RLS
ALTER TABLE public.disp_pregacao ENABLE ROW LEVEL SECURITY;

-- Leitura pública (anon e authenticated)
DO $$ BEGIN
  CREATE POLICY "disp_select_all" ON public.disp_pregacao
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT: apenas próprio oficial_id/pastor_id via auth
DO $$ BEGIN
  CREATE POLICY "disp_insert_proprio" ON public.disp_pregacao
    FOR INSERT TO authenticated WITH CHECK (
      oficial_id IN (
        SELECT o.id FROM public.oficiais o
        JOIN public.pessoas p ON p.id = o.pessoa_id
        WHERE p.auth_user_id = auth.uid()
      )
      OR
      pastor_id IN (
        SELECT pa.id FROM public.pastores pa
        JOIN public.pessoas p ON lower(unaccent(p.nome)) = lower(unaccent(pa.nome_completo))
        WHERE p.auth_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DELETE: apenas o próprio
DO $$ BEGIN
  CREATE POLICY "disp_delete_proprio" ON public.disp_pregacao
    FOR DELETE TO authenticated USING (
      oficial_id IN (
        SELECT o.id FROM public.oficiais o
        JOIN public.pessoas p ON p.id = o.pessoa_id
        WHERE p.auth_user_id = auth.uid()
      )
      OR
      pastor_id IN (
        SELECT pa.id FROM public.pastores pa
        JOIN public.pessoas p ON lower(unaccent(p.nome)) = lower(unaccent(pa.nome_completo))
        WHERE p.auth_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, DELETE ON public.disp_pregacao TO authenticated;
GRANT SELECT ON public.disp_pregacao TO anon;
