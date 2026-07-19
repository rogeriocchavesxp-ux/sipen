-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios Fase 3: programações + escalas de serviço
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Programações ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ministerio_programacoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  data           date        NOT NULL,
  hora           time,
  local          text,
  tipo           text        NOT NULL DEFAULT 'evento'
                             CHECK (tipo IN ('culto','ensaio','evento','atividade','outro')),
  descricao      text,
  status         text        NOT NULL DEFAULT 'agendado'
                             CHECK (status IN ('agendado','realizado','cancelado')),
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prog_ministerio ON public.ministerio_programacoes(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_prog_data       ON public.ministerio_programacoes(data DESC);

ALTER TABLE public.ministerio_programacoes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_prog" ON public.ministerio_programacoes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON public.ministerio_programacoes TO authenticated;

-- ── 2. Escalas de serviço ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ministerio_escalas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id  uuid        NOT NULL REFERENCES public.ministerios(id) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  data           date        NOT NULL,
  hora           time,
  observacoes    text,
  criado_por     uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ministerio_escala_pessoas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id  uuid NOT NULL REFERENCES public.ministerio_escalas(id) ON DELETE CASCADE,
  pessoa_id  uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  funcao     text,
  criado_por uuid,
  UNIQUE(escala_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_escal_ministerio ON public.ministerio_escalas(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_escal_data       ON public.ministerio_escalas(data DESC);
CREATE INDEX IF NOT EXISTS idx_escal_p_escala   ON public.ministerio_escala_pessoas(escala_id);

ALTER TABLE public.ministerio_escalas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministerio_escala_pessoas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all_escalas"
    ON public.ministerio_escalas FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_escala_pessoas"
    ON public.ministerio_escala_pessoas FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON public.ministerio_escalas        TO authenticated;
GRANT ALL ON public.ministerio_escala_pessoas TO authenticated;
