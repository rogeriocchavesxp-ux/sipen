-- ═══════════════════════════════════════════════════════════════════
-- SIPEN — Congregações: acesso multi-tenant e lançamentos financeiros
-- Pré-requisito: supabase-congregacoes.sql já executado
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Vincula membros a congregações ────────────────────────────
ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS congregacao_id uuid
    REFERENCES public.congregacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_membros_congregacao_id
  ON public.membros(congregacao_id);

-- ── 2. Lançamentos financeiros por congregação ───────────────────
CREATE TABLE IF NOT EXISTS public.congregacao_lancamentos (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  congregacao_id  uuid          NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
  data            date          NOT NULL,
  tipo            text          NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria       text,
  descricao       text          NOT NULL DEFAULT '',
  valor           numeric(12,2) NOT NULL CHECK (valor >= 0),
  obs             text,
  criado_por      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cong_lanc_cong_id ON public.congregacao_lancamentos(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_cong_lanc_data    ON public.congregacao_lancamentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_cong_lanc_tipo    ON public.congregacao_lancamentos(tipo);

ALTER TABLE public.congregacao_lancamentos ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado (RLS de congregação controlada no app)
DROP POLICY IF EXISTS "cong_lanc_select" ON public.congregacao_lancamentos;
CREATE POLICY "cong_lanc_select"
  ON public.congregacao_lancamentos FOR SELECT
  USING (deleted_at IS NULL);

-- Escrita: apenas autenticados
DROP POLICY IF EXISTS "cong_lanc_insert" ON public.congregacao_lancamentos;
CREATE POLICY "cong_lanc_insert"
  ON public.congregacao_lancamentos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cong_lanc_update" ON public.congregacao_lancamentos;
CREATE POLICY "cong_lanc_update"
  ON public.congregacao_lancamentos FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ── 3. Novos perfis ──────────────────────────────────────────────
INSERT INTO public.perfis (nome, descricao)
VALUES ('LIDER_CONGREGACAO', 'Líder de congregação vinculada à IPPenha — acesso operacional local')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.perfis (nome, descricao)
VALUES ('MEMBRO_CONGREGACAO', 'Membro de congregação vinculada — acesso de leitura local')
ON CONFLICT (nome) DO NOTHING;

-- ── 4. Permissões dos novos perfis ───────────────────────────────
-- Apenas CONGREGACOES com acesso; tudo mais fica SEM_ACESSO (ausente da tabela)
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, 'CONGREGACOES', 'COMPLETO'
FROM   public.perfis p
WHERE  p.nome = 'LIDER_CONGREGACAO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, 'AREA_MEMBRO', 'LEITURA'
FROM   public.perfis p
WHERE  p.nome = 'LIDER_CONGREGACAO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, 'CONGREGACOES', 'LEITURA'
FROM   public.perfis p
WHERE  p.nome = 'MEMBRO_CONGREGACAO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, 'AREA_MEMBRO', 'LEITURA'
FROM   public.perfis p
WHERE  p.nome = 'MEMBRO_CONGREGACAO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- ── 5. Grant ao role anon/authenticated ─────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.congregacao_lancamentos TO anon, authenticated;
