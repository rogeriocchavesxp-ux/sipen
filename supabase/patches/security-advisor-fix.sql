-- ════════════════════════════════════════════════════════════════════════
-- SIPEN — Security Advisor Fix
-- Gerado em: 2026-05-14
-- Executar no SQL Editor do Supabase (uma vez)
--
-- Problemas endereçados:
--   1. importacao_oficiais_log: sem RLS → qualquer role lê/grava livremente
--   2. v_pessoas_ativas, vw_pessoas_ativas, v_pessoas_completo: SECURITY
--      DEFINER implícito nas views → bypassa RLS das tabelas base
--   3. oficiais, seminaristas, contratados: sem ENABLE ROW LEVEL SECURITY
--   4. Funções SECURITY DEFINER sem search_path fixo → vulnerável a
--      hijacking via schema injection
--   5. anon SELECT em logs_sistema: logs de auditoria visíveis publicamente
--
-- ── IMPACTO ESPERADO ────────────────────────────────────────────────────
--   • Frontend anon: sem alteração visível (reads continuam funcionando)
--   • v_pessoas_ativas: anon continua lendo; campo perfil_sistema = NULL
--   • oficiais/seminaristas/contratados: anon SELECT mantido; INSERT/UPDATE
--     DELETE para anon removido (era inseguro, não era usado pelo frontend)
--   • logs_sistema: anon não lê mais — não há tela de logs no frontend
--
-- ── O QUE PODE QUEBRAR ──────────────────────────────────────────────────
--   • Se algum módulo frontend lê logs_sistema via anon key → vai retornar
--     [] ou 403 após este patch. Verificar console após aplicar.
--   • Se alguma query usa v_pessoas_ativas esperando perfil_sistema não-NULL
--     para anon → vai retornar NULL. Esperado e correto.
--   • Funções SECURITY DEFINER: adição de search_path é transparente,
--     não altera comportamento funcional.
--
-- ── PLANO DE ROLLBACK ───────────────────────────────────────────────────
--   Bloco 1:  ALTER TABLE public.importacao_oficiais_log DISABLE ROW LEVEL SECURITY;
--   Bloco 2:  REVOKE SELECT ON public.user_profiles FROM anon;
--             DROP POLICY IF EXISTS "anon_select_user_profiles" ON public.user_profiles;
--   Bloco 3:  ALTER VIEW public.v_pessoas_ativas  RESET (security_invoker);
--             ALTER VIEW public.v_pessoas_completo RESET (security_invoker);
--             ALTER VIEW public.vw_pessoas_ativas  RESET (security_invoker); -- se existir
--   Bloco 4:  ALTER TABLE public.oficiais     DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.seminaristas DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.contratados  DISABLE ROW LEVEL SECURITY;
--   Bloco 5:  ALTER FUNCTION public.is_admin()                RESET search_path;
--             ALTER FUNCTION public.has_role(text)            RESET search_path;
--             ALTER FUNCTION public.has_any_role(text[])      RESET search_path;
--             ALTER FUNCTION public.fn_audit()                RESET search_path;
--             ALTER FUNCTION public.fn_on_auth_user_created() RESET search_path;
--             ALTER FUNCTION public.pode_editar_membresia()   RESET search_path;
--             ALTER FUNCTION public.fn_set_app_pessoa_id()    RESET search_path;
--   Bloco 6:  CREATE POLICY "anon_select_logs_sistema" ON public.logs_sistema
--               FOR SELECT TO anon USING (true);
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 1: importacao_oficiais_log — RLS obrigatório
-- Risco: tabela exposta sem RLS — qualquer role com GRANT lê/grava tudo.
-- Fix:  habilitar RLS + permitir apenas admin (authenticated) e service_role.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.importacao_oficiais_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "log_imp_admin_select"
    ON public.importacao_oficiais_log FOR SELECT TO authenticated
    USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "log_imp_admin_insert"
    ON public.importacao_oficiais_log FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "log_imp_admin_update"
    ON public.importacao_oficiais_log FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "log_imp_admin_delete"
    ON public.importacao_oficiais_log FOR DELETE TO authenticated
    USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "log_imp_service_all"
    ON public.importacao_oficiais_log FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 2: user_profiles — GRANT anon com policy de negação total
-- Necessário para que views com security_invoker = true não falhem quando
-- chamadas por anon (LEFT JOIN em user_profiles retornará NULL em vez de erro).
-- ════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.user_profiles TO anon;

DO $$ BEGIN
  CREATE POLICY "anon_select_user_profiles"
    ON public.user_profiles FOR SELECT TO anon
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 3: Views — aplicar security_invoker = true
-- Sem este atributo, PostgreSQL executa a view no contexto do dono (owner),
-- ignorando o RLS das tabelas base para o role que chamou a query.
-- Com security_invoker = true, a view respeita o RLS do role chamador.
--
-- Requer PostgreSQL 15+ (disponível no Supabase desde 2023-11).
-- ════════════════════════════════════════════════════════════════════════

ALTER VIEW public.v_pessoas_ativas   SET (security_invoker = true);
ALTER VIEW public.v_pessoas_completo SET (security_invoker = true);

-- vw_pessoas_ativas pode não existir em todas as instâncias (criada via Dashboard)
DO $$ BEGIN
  ALTER VIEW public.vw_pessoas_ativas SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table  THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- v_pessoas_sem_vinculo (definida em v3-incremental) também pode vazar dados
DO $$ BEGIN
  ALTER VIEW public.v_pessoas_sem_vinculo SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table  THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 4: oficiais, seminaristas, contratados — Enable RLS + políticas
-- Estas tabelas foram criadas em supabase-oficiais.sql sem ENABLE RLS.
-- Sem RLS ativo, as políticas existentes são ignoradas — todos lêem tudo.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.oficiais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seminaristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratados  ENABLE ROW LEVEL SECURITY;

-- ── oficiais ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "anon_select_oficiais"
    ON public.oficiais FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_oficiais"
    ON public.oficiais FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_insert_oficiais"
    ON public.oficiais FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_oficiais"
    ON public.oficiais FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_delete_oficiais"
    ON public.oficiais FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_all_oficiais"
    ON public.oficiais FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── seminaristas ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "anon_select_seminaristas"
    ON public.seminaristas FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_seminaristas"
    ON public.seminaristas FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_insert_seminaristas"
    ON public.seminaristas FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_seminaristas"
    ON public.seminaristas FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_delete_seminaristas"
    ON public.seminaristas FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_all_seminaristas"
    ON public.seminaristas FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── contratados ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "anon_select_contratados"
    ON public.contratados FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_contratados"
    ON public.contratados FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_insert_contratados"
    ON public.contratados FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_contratados"
    ON public.contratados FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_delete_contratados"
    ON public.contratados FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_all_contratados"
    ON public.contratados FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 5: Funções SECURITY DEFINER — fixar search_path
-- Sem search_path fixo, um atacante pode criar um schema com funções
-- homônimas (ex: public.now()) que são chamadas no lugar das originais.
-- Supabase Advisor classifica isto como HIGH RISK.
-- ════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.is_admin()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.has_role(text)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.has_any_role(text[])
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.fn_audit()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.fn_on_auth_user_created()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.pode_editar_membresia()
  SET search_path = public, pg_catalog;

-- fn_set_app_pessoa_id não tem parâmetros
ALTER FUNCTION public.fn_set_app_pessoa_id()
  SET search_path = public, pg_catalog;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 6: logs_sistema — remover acesso anon SELECT
-- Logs de auditoria contêm dados de operações internas (quem fez o quê,
-- quando, qual registro). Não devem ser lidos publicamente.
-- O frontend não possui tela de logs para anon — esta política não quebra nada.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_logs_sistema" ON public.logs_sistema;

-- Garantir que service_role ainda tem acesso irrestrito (fn_audit depende disso)
DO $$ BEGIN
  CREATE POLICY "service_all_logs_sistema"
    ON public.logs_sistema FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 7: Forçar PostgREST a recarregar o schema
-- ════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- RELATÓRIO DE SEGURANÇA — Estado após este patch
-- ════════════════════════════════════════════════════════════════════════
--
-- ┌─────────────────────────────────────────────────┬──────────┬────────┐
-- │ Item                                            │ Antes    │ Depois │
-- ├─────────────────────────────────────────────────┼──────────┼────────┤
-- │ importacao_oficiais_log — RLS                   │ OFF      │ ON     │
-- │ importacao_oficiais_log — acesso anon           │ irrestrito│ negado│
-- │ v_pessoas_ativas — security_invoker             │ OFF      │ ON     │
-- │ v_pessoas_completo — security_invoker           │ OFF      │ ON     │
-- │ vw_pessoas_ativas — security_invoker            │ OFF      │ ON     │
-- │ oficiais — RLS                                  │ OFF      │ ON     │
-- │ seminaristas — RLS                              │ OFF      │ ON     │
-- │ contratados — RLS                               │ OFF      │ ON     │
-- │ SECURITY DEFINER sem search_path (7 funções)    │ SIM      │ NÃO    │
-- │ logs_sistema — leitura anon                     │ SIM      │ NÃO    │
-- ├─────────────────────────────────────────────────┼──────────┼────────┤
-- │ RISCOS RESIDUAIS (requerem decisão arquitetural)│          │        │
-- ├─────────────────────────────────────────────────┼──────────┼────────┤
-- │ anon INSERT/UPDATE/DELETE em pessoas, membros,  │          │        │
-- │ financeiro, demandas, agenda, pgs, estoque      │ ABERTO   │ ABERTO │
-- │ → Motivo: frontend usa anon key (sem Auth).     │          │        │
-- │ → Mitigação real: migrar para JWT autenticado.  │          │        │
-- │                                                 │          │        │
-- │ anon SELECT em financeiro, membros, pessoas     │          │        │
-- │ → Dados sensíveis (valores, CPF indireto)       │ ABERTO   │ ABERTO │
-- │ → Mitigação real: mesma — migrar para Auth.     │          │        │
-- └─────────────────────────────────────────────────┴──────────┴────────┘
--
-- RECOMENDAÇÃO ARQUITETURAL:
-- O risco residual principal é o uso da anon key para todas as operações.
-- A solução correta é implementar Supabase Auth + JWT:
--   1. Criar usuário no Supabase Auth para cada operador
--   2. No frontend: substituir sipenToken() para usar a sessão Auth
--   3. Remover todas as políticas "anon_insert/update/delete_*"
--   4. Manter apenas "anon_select_*" para consultas públicas (se houver)
-- O arquivo supabase/migrations/sipen-security-migration.sql (Fase 2)
-- já contém o roadmap para esta migração.
-- ════════════════════════════════════════════════════════════════════════
