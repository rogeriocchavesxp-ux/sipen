-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Escala do Ministério de Música  v1.0
-- Execute no SQL Editor do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela musicos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.musicos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT        NOT NULL,
  funcao       TEXT,                          -- Dirigente, Pianista, Organista, Regente, etc.
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.musicos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "musicos_select" ON public.musicos FOR SELECT TO authenticated USING (true);              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "musicos_insert" ON public.musicos FOR INSERT TO authenticated WITH CHECK (true);        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "musicos_update" ON public.musicos FOR UPDATE TO authenticated USING (true);             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "musicos_delete" ON public.musicos FOR DELETE TO authenticated USING (true);             EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.musicos TO authenticated;

-- ── 2. Tabela escala_musica ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escala_musica (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data            DATE        NOT NULL,
  culto_tipo      TEXT        NOT NULL,   -- domingo_manha | domingo_noite | conexao_com_deus | tarde_da_esperanca
  dirigente_nome  TEXT,
  dirigente_id    UUID        REFERENCES public.musicos(id) ON DELETE SET NULL,
  equipe          TEXT,                   -- "Equipe A", "Coral", "Banda", etc.
  obs             TEXT,
  status          TEXT        NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | PREENCHIDA | CONFIRMADA
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT escala_musica_data_tipo_unique UNIQUE (data, culto_tipo)
);

ALTER TABLE public.escala_musica ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "escala_musica_select" ON public.escala_musica FOR SELECT TO authenticated USING (true);     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "escala_musica_insert" ON public.escala_musica FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "escala_musica_update" ON public.escala_musica FOR UPDATE TO authenticated USING (true);      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "escala_musica_delete" ON public.escala_musica FOR DELETE TO authenticated USING (true);      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_musica TO authenticated;

-- ── 3. Trigger updated_at ────────────────────────────────────────
DO $$ BEGIN
  CALL public.apply_updated_at('musicos');
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  CALL public.apply_updated_at('escala_musica');
EXCEPTION WHEN undefined_function THEN NULL; END $$;
