-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios Fase 8: módulos específicos por tipo
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Repertório (MUSICA) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ministerio_repertorio (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  artista        text,
  tom            text,
  bpm            int,
  link_youtube   text,
  link_cifra     text,
  tags           text,
  ativo          boolean     NOT NULL DEFAULT true,
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_ministerio ON public.ministerio_repertorio(ministerio_id);
ALTER TABLE public.ministerio_repertorio ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_rep" ON public.ministerio_repertorio
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.ministerio_repertorio TO authenticated;

-- ── 2. Projetos (JOVENS / EVANGELISMO / COMUNICACAO / ACOLHIMENTO) ──
CREATE TABLE IF NOT EXISTS public.ministerio_projetos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  descricao      text,
  data_inicio    date,
  data_fim       date,
  responsavel_id uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'planejado'
                             CHECK (status IN ('planejado','em_andamento','concluido','cancelado')),
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proj_ministerio ON public.ministerio_projetos(ministerio_id);
ALTER TABLE public.ministerio_projetos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_proj" ON public.ministerio_projetos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.ministerio_projetos TO authenticated;

-- ── 3. Turmas (INFANTIL) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ministerio_turmas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  faixa_etaria   text,
  professor_id   uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  sala           text,
  ativo          boolean     NOT NULL DEFAULT true,
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turma_ministerio ON public.ministerio_turmas(ministerio_id);
ALTER TABLE public.ministerio_turmas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_turmas" ON public.ministerio_turmas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.ministerio_turmas TO authenticated;
