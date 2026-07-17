-- ═══════════════════════════════════════════════════════════
-- SIPEN — Patch de Segurança C-01
-- Remove acesso de escrita anônimo (INSERT/UPDATE/DELETE) das
-- tabelas sensíveis identificadas na auditoria de 2026-07-16.
--
-- TABELAS CORRIGIDAS:
--   pastores, financeiro_solicitacoes, escala_pregacao,
--   congregacao_agenda, congregacao_lancamentos
--
-- TABELAS INTENCIONALMENTE PRESERVADAS (acesso público):
--   evento_inscricoes   — inscrições públicas em eventos
--   eleicao_indicacoes  — indicações públicas de eleição
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → Cole e execute.
--   Roda em transação: em caso de erro, nada é alterado.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Remove políticas anon de escrita ──────────────────

DO $$
DECLARE
  pol RECORD;
  tabelas TEXT[] := ARRAY[
    'pastores',
    'financeiro_solicitacoes',
    'escala_pregacao',
    'congregacao_agenda',
    'congregacao_lancamentos'
  ];
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'anon' = ANY(roles)
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND tablename = ANY(tabelas)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Removida política: % em %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- ── 2. Garante que authenticated ainda pode escrever ─────
-- Cria apenas se já não existir política equivalente.

DO $$
BEGIN

  -- pastores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pastores' AND cmd IN ('INSERT','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_insert_pastores" ON public.pastores FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_insert_pastores';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pastores' AND cmd IN ('UPDATE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_update_pastores" ON public.pastores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_update_pastores';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pastores' AND cmd IN ('DELETE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_delete_pastores" ON public.pastores FOR DELETE TO authenticated USING (true);
    RAISE NOTICE 'Criada: patch_auth_delete_pastores';
  END IF;

  -- financeiro_solicitacoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='financeiro_solicitacoes' AND cmd IN ('INSERT','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_insert_fin_sol" ON public.financeiro_solicitacoes FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_insert_fin_sol';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='financeiro_solicitacoes' AND cmd IN ('UPDATE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_update_fin_sol" ON public.financeiro_solicitacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_update_fin_sol';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='financeiro_solicitacoes' AND cmd IN ('DELETE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_delete_fin_sol" ON public.financeiro_solicitacoes FOR DELETE TO authenticated USING (true);
    RAISE NOTICE 'Criada: patch_auth_delete_fin_sol';
  END IF;

  -- escala_pregacao
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='escala_pregacao' AND cmd IN ('INSERT','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_insert_escala" ON public.escala_pregacao FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_insert_escala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='escala_pregacao' AND cmd IN ('UPDATE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_update_escala" ON public.escala_pregacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_update_escala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='escala_pregacao' AND cmd IN ('DELETE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_delete_escala" ON public.escala_pregacao FOR DELETE TO authenticated USING (true);
    RAISE NOTICE 'Criada: patch_auth_delete_escala';
  END IF;

  -- congregacao_agenda
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_agenda' AND cmd IN ('INSERT','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_insert_cong_ag" ON public.congregacao_agenda FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_insert_cong_ag';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_agenda' AND cmd IN ('UPDATE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_update_cong_ag" ON public.congregacao_agenda FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_update_cong_ag';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_agenda' AND cmd IN ('DELETE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_delete_cong_ag" ON public.congregacao_agenda FOR DELETE TO authenticated USING (true);
    RAISE NOTICE 'Criada: patch_auth_delete_cong_ag';
  END IF;

  -- congregacao_lancamentos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_lancamentos' AND cmd IN ('INSERT','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_insert_cong_lanc" ON public.congregacao_lancamentos FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_insert_cong_lanc';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_lancamentos' AND cmd IN ('UPDATE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_update_cong_lanc" ON public.congregacao_lancamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Criada: patch_auth_update_cong_lanc';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='congregacao_lancamentos' AND cmd IN ('DELETE','ALL') AND 'authenticated'=ANY(roles)) THEN
    CREATE POLICY "patch_auth_delete_cong_lanc" ON public.congregacao_lancamentos FOR DELETE TO authenticated USING (true);
    RAISE NOTICE 'Criada: patch_auth_delete_cong_lanc';
  END IF;

END $$;

-- ── 3. Verificação final ──────────────────────────────────
-- Após o COMMIT, rode esta query para confirmar que não sobrou
-- nenhuma política anon de escrita nas tabelas corrigidas:
--
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'anon' AND table_schema = 'public'
--   AND privilege_type IN ('INSERT','UPDATE','DELETE')
--   AND table_name IN ('pastores','financeiro_solicitacoes',
--     'escala_pregacao','congregacao_agenda','congregacao_lancamentos')
-- ORDER BY table_name;
--
-- Resultado esperado: 0 linhas.

COMMIT;
