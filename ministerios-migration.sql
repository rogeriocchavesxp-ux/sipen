-- ==========================================================
-- SIPEN — Migração: Módulo Ministerial
-- Execute no Supabase SQL Editor
-- ==========================================================

-- 1. Tabela principal de ministérios
CREATE TABLE IF NOT EXISTS ministerios (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  tipo          TEXT,                          -- MUSICA, JOVENS, INFANTIL, etc.
  supervisor    UUID        REFERENCES pessoas(id) ON DELETE SET NULL,
  conselheiro   UUID        REFERENCES pessoas(id) ON DELETE SET NULL,
  coordenador   UUID        REFERENCES pessoas(id) ON DELETE SET NULL,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para manter updated_at atualizado
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ministerios_updated_at ON ministerios;
CREATE TRIGGER trg_ministerios_updated_at
  BEFORE UPDATE ON ministerios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS ministerios
ALTER TABLE ministerios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministerios' AND policyname='Leitura pública ministerios') THEN
    CREATE POLICY "Leitura pública ministerios" ON ministerios FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministerios' AND policyname='Escrita autenticada ministerios') THEN
    CREATE POLICY "Escrita autenticada ministerios" ON ministerios FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ==========================================================

-- 2. Tabela de vínculos pessoa ↔ ministério
CREATE TABLE IF NOT EXISTS ministerio_membros (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id UUID        NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  pessoa_id     UUID        NOT NULL REFERENCES pessoas(id)     ON DELETE CASCADE,
  funcao        TEXT        NOT NULL DEFAULT 'Membro',
  status        TEXT        NOT NULL DEFAULT 'ativo'
                              CHECK (status IN ('ativo','inativo')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ministerio_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_minmem_ministerio ON ministerio_membros(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_minmem_pessoa     ON ministerio_membros(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_minmem_status     ON ministerio_membros(status);

-- RLS ministerio_membros
ALTER TABLE ministerio_membros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministerio_membros' AND policyname='Leitura pública ministerio_membros') THEN
    CREATE POLICY "Leitura pública ministerio_membros" ON ministerio_membros FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministerio_membros' AND policyname='Escrita autenticada ministerio_membros') THEN
    CREATE POLICY "Escrita autenticada ministerio_membros" ON ministerio_membros FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
