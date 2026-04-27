-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Escala de Pregação
-- Criação das tabelas: pastores, escala_pregacao
-- Execute no SQL Editor do Supabase Dashboard (uma vez).
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabela pastores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pastores (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo  TEXT        NOT NULL,
  nome_exibicao  TEXT,
  funcao         TEXT,
  unidade        TEXT,
  ativo          BOOLEAN     NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: anon pode ler e escrever (padrão SIPEN)
ALTER TABLE public.pastores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_select_pastores" ON public.pastores FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_insert_pastores" ON public.pastores FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_update_pastores" ON public.pastores FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_delete_pastores" ON public.pastores FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed: 6 pastores oficiais da IPPenha
INSERT INTO public.pastores (nome_completo, nome_exibicao, funcao, ativo) VALUES
  ('Rev. Amauri Oliveira',  'Rev. Amauri',     'Pastor Presidente', true),
  ('Rev. Carlos Henrique',  'Rev. C. Henrique', 'Pastor',            true),
  ('Rev. Carlos Lima',       'Rev. C. Lima',    'Pastor',            true),
  ('Rev. Cornélio Castro',   'Rev. Cornélio',   'Pastor',            true),
  ('Rev. Fábio Carvalho',   'Rev. Fábio',      'Pastor',            true),
  ('Rev. Flávio Ramos',      'Rev. Flávio',     'Pastor',            true)
ON CONFLICT DO NOTHING;


-- ── 2. Tabela escala_pregacao ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escala_pregacao (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data          DATE        NOT NULL,
  culto_tipo    TEXT        NOT NULL,   -- domingo_manha | domingo_noite | conexao_com_deus | tarde_da_esperanca
  culto_nome    TEXT,                   -- nome exibição opcional
  pastor_id     UUID        REFERENCES public.pastores(id) ON DELETE SET NULL,
  local         TEXT        NOT NULL DEFAULT 'Templo Principal',
  observacoes   TEXT,
  status        TEXT        NOT NULL DEFAULT 'PENDENTE',  -- PENDENTE | PREENCHIDA | CONFIRMADA
  origem        TEXT        NOT NULL DEFAULT 'manual',    -- manual | automatico
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT escala_pregacao_data_tipo_unique UNIQUE (data, culto_tipo)
);

-- RLS: anon pode ler e escrever
ALTER TABLE public.escala_pregacao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_select_escala_pregacao" ON public.escala_pregacao FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_insert_escala_pregacao" ON public.escala_pregacao FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_update_escala_pregacao" ON public.escala_pregacao FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_delete_escala_pregacao" ON public.escala_pregacao FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
