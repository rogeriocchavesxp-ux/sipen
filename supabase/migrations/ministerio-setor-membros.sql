-- ══════════════════════════════════════════════════════════════
-- SIPEN — Membros de Setor Ministerial
-- Tabela: ministerio_setor_membros
-- Executar no Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ministerio_setor_membros (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id   UUID        NOT NULL REFERENCES public.ministerio_setores(id) ON DELETE CASCADE,
  pessoa_id  UUID        NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  criado_por UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (setor_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_msm_setor  ON public.ministerio_setor_membros(setor_id);
CREATE INDEX IF NOT EXISTS idx_msm_pessoa ON public.ministerio_setor_membros(pessoa_id);

ALTER TABLE public.ministerio_setor_membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS msm_sel ON public.ministerio_setor_membros;
CREATE POLICY msm_sel ON public.ministerio_setor_membros FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS msm_ins ON public.ministerio_setor_membros;
CREATE POLICY msm_ins ON public.ministerio_setor_membros FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS msm_del ON public.ministerio_setor_membros;
CREATE POLICY msm_del ON public.ministerio_setor_membros FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, DELETE ON public.ministerio_setor_membros TO authenticated;

NOTIFY pgrst, 'reload schema';
