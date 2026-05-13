-- Tabela de Comissões Institucionais
-- Módulo: Departamentos → Comissões

CREATE TABLE IF NOT EXISTS comissoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  relator     TEXT,
  membros     TEXT,
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','encerrada')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='comissoes_select' AND tablename='comissoes') THEN
    CREATE POLICY "comissoes_select" ON comissoes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='comissoes_all' AND tablename='comissoes') THEN
    CREATE POLICY "comissoes_all" ON comissoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
