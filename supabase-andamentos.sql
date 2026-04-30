-- ══════════════════════════════════════════════════════════
-- SIPEN — Tabela demanda_andamentos
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.demanda_andamentos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id     uuid        NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  usuario_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome   text        NOT NULL DEFAULT '',
  texto          text        NOT NULL,
  status_demanda text,
  automatico     boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_and_demanda ON public.demanda_andamentos(demanda_id);
CREATE INDEX IF NOT EXISTS idx_and_created ON public.demanda_andamentos(created_at DESC);

-- RLS
ALTER TABLE public.demanda_andamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "andamentos_select" ON public.demanda_andamentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "andamentos_insert" ON public.demanda_andamentos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "service_all_andamentos" ON public.demanda_andamentos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
