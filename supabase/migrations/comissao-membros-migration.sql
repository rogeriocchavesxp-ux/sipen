-- Vínculos pessoa ↔ comissão (substitui campo text comissoes.membros)
-- Execute após comissoes-migration.sql

CREATE TABLE IF NOT EXISTS comissao_membros (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comissao_id  UUID        NOT NULL REFERENCES comissoes(id) ON DELETE CASCADE,
  pessoa_id    UUID        NOT NULL REFERENCES pessoas(id)   ON DELETE CASCADE,
  funcao       TEXT        NOT NULL DEFAULT 'membro'
                           CHECK (funcao IN ('membro','relator','coordenador')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comissao_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_com_membros_comissao ON comissao_membros(comissao_id);
CREATE INDEX IF NOT EXISTS idx_com_membros_pessoa   ON comissao_membros(pessoa_id);

ALTER TABLE comissao_membros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE policyname='com_membros_select' AND tablename='comissao_membros') THEN
    CREATE POLICY "com_membros_select" ON comissao_membros
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE policyname='com_membros_all' AND tablename='comissao_membros') THEN
    CREATE POLICY "com_membros_all" ON comissao_membros
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
