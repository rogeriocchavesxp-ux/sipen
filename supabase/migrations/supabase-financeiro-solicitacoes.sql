-- ═══════════════════════════════════════════════════════
-- SIPEN — financeiro_solicitacoes: estrutura + RLS
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. Criar tabela se ainda não existe (caso venha do zero)
CREATE TABLE IF NOT EXISTS public.financeiro_solicitacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor      text NOT NULL,
  valor           numeric(12,2) NOT NULL,
  forma_pagamento text,
  codigo_pagamento text,
  solicitante     text,
  finalidade      text,
  categoria       text,
  vencimento      date,
  status          text NOT NULL DEFAULT 'pendente',
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- 2. Adicionar colunas faltantes (caso a tabela foi criada pelo GPT sem todas as colunas)
ALTER TABLE public.financeiro_solicitacoes ADD COLUMN IF NOT EXISTS id              uuid DEFAULT gen_random_uuid();
ALTER TABLE public.financeiro_solicitacoes ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();
ALTER TABLE public.financeiro_solicitacoes ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;

-- 3. Preencher id onde estiver nulo (linhas inseridas sem id)
UPDATE public.financeiro_solicitacoes SET id = gen_random_uuid() WHERE id IS NULL;

-- 4. Tentar adicionar PK se ainda não existe (ignora erro se já tiver)
DO $$ BEGIN
  ALTER TABLE public.financeiro_solicitacoes ADD PRIMARY KEY (id);
EXCEPTION WHEN others THEN NULL; END $$;

-- 5. RLS
ALTER TABLE public.financeiro_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "allow_all_fin_sol"
  ON public.financeiro_solicitacoes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_solicitacoes TO anon, authenticated;
