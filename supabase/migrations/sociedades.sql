-- ═══════════════════════════════════════════════════════════
-- SIPEN — Tabela de Sociedades Internas
-- Criada em 2026-07-20
--
-- Substitui a lista hardcoded _SOC_LIST no módulo Departamentos.
-- Permite gerenciar sociedades dinamicamente via banco de dados.
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → Cole e execute.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sociedades (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla      text        NOT NULL UNIQUE,
  nome       text        NOT NULL,
  orgao      text        NOT NULL,
  ic         text        NOT NULL DEFAULT '🏛',
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sociedades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soc_select" ON public.sociedades;
CREATE POLICY "soc_select"
  ON public.sociedades FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "soc_write" ON public.sociedades;
CREATE POLICY "soc_write"
  ON public.sociedades FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Grants
GRANT SELECT ON public.sociedades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sociedades TO authenticated;

-- Seed: 5 sociedades da IPPenha
INSERT INTO public.sociedades (sigla, nome, orgao, ic) VALUES
  ('SAF', 'Sociedade Auxiliadora Feminina',      'SAF – Sociedade Auxiliadora Feminina',      '👩'),
  ('UCP', 'União das Crianças Presbiterianas',   'UCP – União das Crianças Presbiterianas',   '👶'),
  ('UMP', 'União da Mocidade Presbiteriana',     'UMP – União da Mocidade Presbiteriana',     '🔥'),
  ('UPA', 'União Presbiteriana de Adolescentes', 'UPA – União Presbiteriana de Adolescentes', '🌟'),
  ('UPH', 'União Presbiteriana de Homens',       'UPH – União Presbiteriana de Homens',       '👨')
ON CONFLICT (sigla) DO NOTHING;
