-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Auditoria C-04 + C-02: Segurança financeiro_solicitacoes
-- audit-01-rls-financeiro.sql
-- Idempotente. Executar no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════
-- ANTES: policy "allow_all_fin_sol" concedia SELECT/INSERT/UPDATE/DELETE
--        para anon e authenticated sem restrição — brecha de segurança ativa.
-- DEPOIS: apenas authenticated pode ler/escrever. anon não tem acesso.
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Validação (ver estado antes) ────────────────────────

-- Verifique com este SELECT antes de continuar:
-- SELECT policyname, roles, cmd FROM pg_policies
-- WHERE tablename = 'financeiro_solicitacoes' ORDER BY policyname;

-- ── PASSO 2: Remover policies abertas ────────────────────────────

DROP POLICY IF EXISTS "allow_all_fin_sol" ON public.financeiro_solicitacoes;

-- Remove qualquer outra policy anon residual
DROP POLICY IF EXISTS "anon_fin_sol"            ON public.financeiro_solicitacoes;
DROP POLICY IF EXISTS "fin_sol_anon_read"        ON public.financeiro_solicitacoes;
DROP POLICY IF EXISTS "financeiro_sol_all"       ON public.financeiro_solicitacoes;
DROP POLICY IF EXISTS "public_fin_sol"           ON public.financeiro_solicitacoes;

-- Revoga grants para anon
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON public.financeiro_solicitacoes FROM anon;

-- ── PASSO 3: Criar políticas corretas (authenticated only) ────────

ALTER TABLE public.financeiro_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado pode ler (tesoureiro filtra no frontend)
DROP POLICY IF EXISTS "auth_select_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "auth_select_fin_sol"
  ON public.financeiro_solicitacoes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Inserção: qualquer autenticado (solicitante registra seu próprio)
DROP POLICY IF EXISTS "auth_insert_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "auth_insert_fin_sol"
  ON public.financeiro_solicitacoes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Edição: qualquer autenticado (RLS mais fino pode ser adicionado depois)
DROP POLICY IF EXISTS "auth_update_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "auth_update_fin_sol"
  ON public.financeiro_solicitacoes
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Soft delete: autenticado pode marcar deleted_at
DROP POLICY IF EXISTS "auth_delete_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "auth_delete_fin_sol"
  ON public.financeiro_solicitacoes
  FOR DELETE TO authenticated
  USING (true);

-- service_role sempre tem acesso total
DROP POLICY IF EXISTS "service_all_fin_sol" ON public.financeiro_solicitacoes;
CREATE POLICY "service_all_fin_sol"
  ON public.financeiro_solicitacoes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants corretos
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.financeiro_solicitacoes TO authenticated;

-- ── PASSO 4: Adicionar pessoa_id (C-02) ──────────────────────────
-- Adiciona coluna de vínculo com Pessoa (nullable: dados antigos não têm FK)

ALTER TABLE public.financeiro_solicitacoes
  ADD COLUMN IF NOT EXISTS pessoa_id UUID
  REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_sol_pessoa_id
  ON public.financeiro_solicitacoes(pessoa_id)
  WHERE pessoa_id IS NOT NULL;

-- ── PASSO 5: Backfill best-effort ────────────────────────────────
-- Tenta preencher pessoa_id a partir do campo solicitante (texto)
-- cruzando com pessoas.nome. Não sobrescreve dados existentes.
-- Pode não encontrar todos — depende da exatidão do nome digitado.

UPDATE public.financeiro_solicitacoes fs
SET pessoa_id = (
  SELECT p.id FROM public.pessoas p
  WHERE deleted_at IS NULL
    AND public.imm_unaccent(lower(trim(p.nome)))
        = public.imm_unaccent(lower(trim(fs.solicitante)))
  LIMIT 1
)
WHERE fs.pessoa_id IS NULL
  AND fs.solicitante IS NOT NULL
  AND fs.solicitante <> '';

-- ── PASSO 6: Validação pós-execução ──────────────────────────────

-- Execute estes dois SELECTs para confirmar:
--
-- 1. Policies corretas (não deve ter anon):
-- SELECT policyname, roles, cmd FROM pg_policies
-- WHERE tablename = 'financeiro_solicitacoes' ORDER BY policyname;
--
-- 2. Quantos registros vinculados:
-- SELECT
--   COUNT(*) FILTER (WHERE pessoa_id IS NOT NULL) AS vinculados,
--   COUNT(*) FILTER (WHERE pessoa_id IS NULL)     AS sem_vinculo,
--   COUNT(*)                                       AS total
-- FROM public.financeiro_solicitacoes WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
