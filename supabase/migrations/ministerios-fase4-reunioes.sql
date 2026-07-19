-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios Fase 4: tabela ministerio_reunioes
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ministerio_reunioes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  data           date        NOT NULL,
  hora           time,
  pauta          text,
  decisoes       text,
  observacoes    text,
  status         text        NOT NULL DEFAULT 'agendada'
                             CHECK (status IN ('agendada','realizada','cancelada')),
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reu_ministerio ON public.ministerio_reunioes(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_reu_data       ON public.ministerio_reunioes(data DESC);

-- RLS
ALTER TABLE public.ministerio_reunioes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all_reunioes"
    ON public.ministerio_reunioes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON public.ministerio_reunioes TO authenticated;
