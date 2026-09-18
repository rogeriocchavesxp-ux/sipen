-- Migration: cong_reunioes
-- Tabela para armazenar reunioes de congregações

CREATE TABLE IF NOT EXISTS public.cong_reunioes (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  congregacao_id  UUID        NOT NULL,
  tipo            TEXT        NOT NULL CHECK (tipo IN ('Mesa Administrativa', 'Planejamento')),
  data            DATE        NOT NULL,
  pauta           TEXT,
  participantes   TEXT,
  encaminhamentos JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ata             TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cong_reunioes_cong_data_idx
  ON public.cong_reunioes(congregacao_id, data DESC);

ALTER TABLE public.cong_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_cong_reunioes"
  ON public.cong_reunioes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.cong_reunioes IS 'Reunioes de congregacoes (Diretoria e Planejamento)';
