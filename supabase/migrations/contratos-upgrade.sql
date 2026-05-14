-- ═══════════════════════════════════════════════════════
-- SIPEN — Contratos: Upgrade v2.0
-- Execução: SQL Editor do Supabase Dashboard
-- Dependência: supabase-contratos.sql (tabela contratos já existe)
-- ═══════════════════════════════════════════════════════

-- 1. Custos detalhados (array JSONB de itens)
-- Estrutura de cada item: { descricao, valor, periodicidade }
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS custos JSONB DEFAULT '[]'::jsonb;

-- 2. Tabela de anexos (links externos — Google Drive, OneDrive, etc.)
CREATE TABLE IF NOT EXISTS contrato_anexos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id   uuid        NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  url           text        NOT NULL,
  tipo_arquivo  text,
  enviado_por   text,
  criado_em     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_con_anexos_contrato ON contrato_anexos(contrato_id);

ALTER TABLE contrato_anexos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrato_anexos' AND policyname = 'con_anexos_all'
  ) THEN
    CREATE POLICY "con_anexos_all" ON contrato_anexos
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
