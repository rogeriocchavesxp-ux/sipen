-- ═══════════════════════════════════════════════════════════════════
-- SIPEN — Departamentos Administrativos
-- Tabelas: dept_administrativos, dept_membros
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Departamentos administrativos (catálogo fixo)
CREATE TABLE IF NOT EXISTS dept_administrativos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vínculos pessoa ↔ departamento
CREATE TABLE IF NOT EXISTS dept_membros (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id  UUID        NOT NULL REFERENCES dept_administrativos(id) ON DELETE CASCADE,
  pessoa_id        UUID        NOT NULL REFERENCES pessoas(id)              ON DELETE CASCADE,
  funcao           TEXT        NOT NULL CHECK (funcao IN ('supervisor','coordenador','lider_setorial','membro')),
  status           TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  data_inicio      DATE        DEFAULT CURRENT_DATE,
  data_fim         DATE,
  observacoes      TEXT,
  criado_por       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(departamento_id, pessoa_id, funcao)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dept_membros_dept ON dept_membros(departamento_id);
CREATE INDEX IF NOT EXISTS idx_dept_membros_pessoa ON dept_membros(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_dept_membros_funcao ON dept_membros(funcao);

-- 3. Seed: 5 departamentos fixos
INSERT INTO dept_administrativos (slug, nome, descricao) VALUES
  ('secretaria',     'Secretaria',     'Documentação, atas e registros administrativos'),
  ('tesouraria',     'Tesouraria',     'Finanças, pagamentos e prestação de contas'),
  ('patrimonio',     'Patrimônio',     'Gestão de bens, imóveis e equipamentos da Igreja'),
  ('comunicacao',    'Comunicação',    'Mídias, redes sociais e comunicados oficiais'),
  ('infraestrutura', 'Infraestrutura', 'Manutenção, conservação e espaços físicos')
ON CONFLICT (slug) DO NOTHING;

-- 4. RLS
ALTER TABLE dept_administrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dept_membros         ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dept_adm_select' AND tablename='dept_administrativos') THEN
    CREATE POLICY "dept_adm_select" ON dept_administrativos FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dept_mem_select' AND tablename='dept_membros') THEN
    CREATE POLICY "dept_mem_select" ON dept_membros FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dept_adm_all' AND tablename='dept_administrativos') THEN
    CREATE POLICY "dept_adm_all" ON dept_administrativos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dept_mem_all' AND tablename='dept_membros') THEN
    CREATE POLICY "dept_mem_all" ON dept_membros FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
