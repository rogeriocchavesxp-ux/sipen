-- SIPEN — Setores internos de ministérios
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ministerio_setores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id    UUID        NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  nome             TEXT        NOT NULL,
  lider_setorial   UUID        REFERENCES pessoas(id) ON DELETE SET NULL,
  observacoes      TEXT,
  ativo            BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  igreja_id        UUID
);

CREATE INDEX IF NOT EXISTS idx_msetores_ministerio ON ministerio_setores(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_msetores_lider      ON ministerio_setores(lider_setorial);

-- Reusa o trigger set_updated_at() criado em ministerios-migration.sql
DROP TRIGGER IF EXISTS trg_msetores_updated_at ON ministerio_setores;
CREATE TRIGGER trg_msetores_updated_at
  BEFORE UPDATE ON ministerio_setores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ministerio_setores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='ministerio_setores' AND policyname='Leitura autenticada ministerio_setores'
  ) THEN
    CREATE POLICY "Leitura autenticada ministerio_setores"
      ON ministerio_setores FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='ministerio_setores' AND policyname='Escrita autenticada ministerio_setores'
  ) THEN
    CREATE POLICY "Escrita autenticada ministerio_setores"
      ON ministerio_setores FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ministerio_setores TO authenticated;
