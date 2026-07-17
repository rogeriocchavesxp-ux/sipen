-- ═══════════════════════════════════════════════════════════
-- SIPEN — Patch de Segurança C-01 (v2 — revisado 2026-07-17)
-- Remove acesso de escrita anônimo das tabelas sensíveis.
--
-- Por que a v1 falhou:
--   A verificação usava information_schema.role_table_grants, que mostra
--   GRANTs de tabela — existem mesmo depois de DROP POLICY. O v1 não
--   fazia REVOKE, só dropava políticas. O banco ficou protegido pelas
--   políticas RLS mas o GRANT anon continuava aparecendo na query.
--
-- Esta versão:
--   1. Cria políticas authenticated primeiro (nunca deixa o acesso cair)
--   2. Remove as políticas anon (pelos nomes exatos das migrations)
--   3. Faz REVOKE do GRANT de tabela para anon
--
-- TABELAS CORRIGIDAS:
--   pastores           — anon_insert/update/delete criados em supabase-escala-pregacao.sql
--   escala_pregacao    — idem
--   financeiro_solicitacoes — allow_all_fin_sol (anon + authenticated) em supabase-financeiro-solicitacoes.sql
--
-- TABELAS JÁ PROTEGIDAS (sem alteração necessária):
--   congregacao_agenda      — policies usam WITH CHECK (auth.role()='authenticated')
--   congregacao_lancamentos — idem
--
-- TABELAS INTENCIONALMENTE ABERTAS (acesso público correto):
--   evento_inscricoes   — inscrições públicas
--   eleicao_indicacoes  — indicações públicas
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → Cole e execute.
--   Roda em transação: em caso de erro, nada é alterado.
--
-- Verificação pós-execução (use AMBAS as queries):
--   Ver instruções no bloco final deste arquivo.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════
-- 1. PASTORES
-- ════════════════════════════════════════════════════════════

-- 1a. Garante que authenticated tem write antes de remover anon
CREATE POLICY IF NOT EXISTS "auth_insert_pastores"
  ON public.pastores FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_update_pastores"
  ON public.pastores FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_delete_pastores"
  ON public.pastores FOR DELETE TO authenticated
  USING (true);

-- 1b. Remove políticas anon de escrita (nomes exatos da migration)
DROP POLICY IF EXISTS "anon_insert_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_update_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_delete_pastores" ON public.pastores;

-- 1c. Remove GRANT de escrita para anon
REVOKE INSERT, UPDATE, DELETE ON public.pastores FROM anon;


-- ════════════════════════════════════════════════════════════
-- 2. ESCALA_PREGACAO
-- ════════════════════════════════════════════════════════════

-- 2a. Garante que authenticated tem write
CREATE POLICY IF NOT EXISTS "auth_insert_escala_pregacao"
  ON public.escala_pregacao FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_update_escala_pregacao"
  ON public.escala_pregacao FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_delete_escala_pregacao"
  ON public.escala_pregacao FOR DELETE TO authenticated
  USING (true);

-- 2b. Remove políticas anon de escrita
DROP POLICY IF EXISTS "anon_insert_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_update_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_delete_escala_pregacao" ON public.escala_pregacao;

-- 2c. Remove GRANT de escrita para anon
REVOKE INSERT, UPDATE, DELETE ON public.escala_pregacao FROM anon;


-- ════════════════════════════════════════════════════════════
-- 3. FINANCEIRO_SOLICITACOES
-- Atenção: a policy original "allow_all_fin_sol" cobre AMBOS
-- anon e authenticated. A substituta authenticated vem ANTES
-- do DROP para evitar qualquer janela sem acesso.
-- ════════════════════════════════════════════════════════════

-- 3a. Cria política authenticated-only (antes de dropar a combinada)
CREATE POLICY IF NOT EXISTS "auth_all_fin_sol"
  ON public.financeiro_solicitacoes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3b. Remove a política combinada anon+authenticated
DROP POLICY IF EXISTS "allow_all_fin_sol" ON public.financeiro_solicitacoes;

-- 3c. Remove GRANTs de escrita para anon
REVOKE INSERT, UPDATE, DELETE ON public.financeiro_solicitacoes FROM anon;


-- ════════════════════════════════════════════════════════════
-- 4. CONGREGACAO_AGENDA e CONGREGACAO_LANCAMENTOS
-- Já protegidas por WITH CHECK (auth.role()='authenticated').
-- REVOKE aqui é belt-and-suspenders.
-- ════════════════════════════════════════════════════════════

REVOKE INSERT, UPDATE, DELETE ON public.congregacao_agenda FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.congregacao_lancamentos FROM anon;


COMMIT;


-- ════════════════════════════════════════════════════════════
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- Execute APÓS o COMMIT. Resultados esperados:
--
-- Query A — GRANTs (deve retornar 0 linhas):
--
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'anon' AND table_schema = 'public'
--   AND privilege_type IN ('INSERT','UPDATE','DELETE')
--   AND table_name IN (
--     'pastores','financeiro_solicitacoes','escala_pregacao',
--     'congregacao_agenda','congregacao_lancamentos'
--   );
--
-- Query B — Políticas (não deve aparecer 'anon' em roles):
--
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'pastores','financeiro_solicitacoes','escala_pregacao',
--     'congregacao_agenda','congregacao_lancamentos'
--   )
--   AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
-- ORDER BY tablename, cmd;
--
-- ════════════════════════════════════════════════════════════
