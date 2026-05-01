-- ministerio_membros — tabela de vínculos pessoa ↔ ministério
-- Execute no Supabase SQL Editor antes de usar o módulo.

CREATE TABLE IF NOT EXISTS ministerio_membros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id UUID NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  pessoa_id     UUID NOT NULL REFERENCES pessoas(id)     ON DELETE CASCADE,
  funcao        TEXT NOT NULL DEFAULT 'Membro',
  status        TEXT NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ministerio_id, pessoa_id)
);

-- Índices para filtros frequentes
CREATE INDEX IF NOT EXISTS idx_minmem_ministerio ON ministerio_membros(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_minmem_pessoa     ON ministerio_membros(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_minmem_status     ON ministerio_membros(status);

-- RLS: habilitar e liberar para anon (ajuste conforme política de segurança do projeto)
ALTER TABLE ministerio_membros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ministerio_membros' AND policyname = 'Leitura pública ministerio_membros'
  ) THEN
    CREATE POLICY "Leitura pública ministerio_membros"
      ON ministerio_membros FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ministerio_membros' AND policyname = 'Escrita autenticada ministerio_membros'
  ) THEN
    CREATE POLICY "Escrita autenticada ministerio_membros"
      ON ministerio_membros FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
