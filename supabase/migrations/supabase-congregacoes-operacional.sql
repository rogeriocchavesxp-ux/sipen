-- ═══════════════════════════════════════════════════════════════════
-- SIPEN — Congregações: agenda local + departamentos
-- Pré-requisito: supabase-congregacoes-acesso.sql já executado
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Agenda da congregação ─────────────────────────────────────
DROP TABLE IF EXISTS public.congregacao_agenda CASCADE;
CREATE TABLE public.congregacao_agenda (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  congregacao_id  uuid          NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
  titulo          text          NOT NULL,
  data            date          NOT NULL,
  hora            time,
  tipo            text          DEFAULT 'Evento',
  descricao       text,
  obs             text,
  criado_por      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cong_agenda_cong_id ON public.congregacao_agenda(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_cong_agenda_data    ON public.congregacao_agenda(data ASC);

ALTER TABLE public.congregacao_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cong_agenda_select" ON public.congregacao_agenda;
CREATE POLICY "cong_agenda_select"
  ON public.congregacao_agenda FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "cong_agenda_insert" ON public.congregacao_agenda;
CREATE POLICY "cong_agenda_insert"
  ON public.congregacao_agenda FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cong_agenda_update" ON public.congregacao_agenda;
CREATE POLICY "cong_agenda_update"
  ON public.congregacao_agenda FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cong_agenda_delete" ON public.congregacao_agenda;
CREATE POLICY "cong_agenda_delete"
  ON public.congregacao_agenda FOR DELETE
  USING (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregacao_agenda TO anon, authenticated;

-- ── 2. Departamentos locais em congregacoes (JSONB) ──────────────
ALTER TABLE public.congregacoes
  ADD COLUMN IF NOT EXISTS departamentos jsonb DEFAULT '[]';

-- ── 3. RLS básico em membros (se ainda não habilitado) ───────────
DO $$
BEGIN
  ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "membros_select_auth" ON public.membros;
CREATE POLICY "membros_select_auth"
  ON public.membros FOR SELECT
  USING (auth.role() = 'authenticated');
