-- Cria tabela de verbas aprovadas por órgão por ano
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.verbas_aprovadas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orgao_tipo    TEXT NOT NULL, -- 'ministerio', 'departamento', 'sociedade'
  orgao         TEXT NOT NULL, -- nome do órgão (coincide com ministerios.nome)
  ano           INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  valor         NUMERIC(12,2) NOT NULL DEFAULT 0,
  aprovado_em   DATE,
  aprovado_por  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (orgao_tipo, orgao, ano)
);

ALTER TABLE public.verbas_aprovadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verbas_sel" ON public.verbas_aprovadas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "verbas_ins" ON public.verbas_aprovadas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "verbas_upd" ON public.verbas_aprovadas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
