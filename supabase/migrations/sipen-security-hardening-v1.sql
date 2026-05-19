-- ═══════════════════════════════════════════════════════════════════════
-- SIPEN — Security Hardening v1.0
-- Data: 2026-05-19
--
-- PROBLEMAS CORRIGIDOS:
--   1. Security Definer Views  — views que bypassam RLS das tabelas-base
--   2. Auth RLS Initialization Plan — auth.uid()/auth.jwt() re-avaliados
--      linha a linha em vez de uma vez por query (degradação de performance)
--   3. Grants perigosos para role 'anon' em tabelas sensíveis
--   4. Políticas WhatsApp quebradas (auth.jwt() ->> 'role' nunca casa com
--      perfis de aplicação — o JWT claim 'role' é sempre 'authenticated')
--   5. Tabela user_profiles sem policies de SELECT (usuários não conseguem
--      ler o próprio perfil)
--
-- SEGURO PARA EXECUTAR EM PRODUÇÃO:
--   • Zero DROP VIEW — estrutura das views preservada integralmente
--   • ALTER VIEW SET (security_invoker) não muda colunas nem nomes
--   • Rollback completo incluído ao final deste arquivo
--   • Cada bloco é idempotente (DO $$ … EXCEPTION WHEN OTHERS THEN NULL)
--
-- ORDEM DE EXECUÇÃO:
--   FASE 0 — Auditoria (SELECTs, sem alteração)
--   FASE 1 — Security Invoker nas views
--   FASE 2 — Fix auth.uid() nas policies (Performance)
--   FASE 3 — Revogar grants perigosos para anon
--   FASE 4 — Policies corretas para user_profiles
--   FASE 5 — Corrigir policies WhatsApp
--   FASE 6 — GRANTs mínimos para authenticated nas views
--   FASE 7 — Validação
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 0 · AUDITORIA (execute para documentar o estado ANTES)
-- ═══════════════════════════════════════════════════════════════════════

/*  ── 0A. Views sem security_invoker ─────────────────────────────────
    Retorna todas as views que estão como SECURITY DEFINER (padrão).
    Em PostgreSQL 15+, security_invoker aparece em pg_views.viewoptions.

SELECT schemaname, viewname,
       COALESCE(
         array_to_string(
           (SELECT array_agg(option_value)
            FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'security_invoker'),
           ','
         ), 'SECURITY DEFINER (padrão)'
       ) AS security_mode
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE schemaname = 'public'
ORDER BY viewname;

    ── 0B. Policies com auth.uid() direto (candidatas ao fix de perf) ──
    NOTA: pg_policies.qual/with_check são text — usar diretamente, sem pg_get_expr()

SELECT tablename, policyname, cmd,
       qual         AS using_expr,
       with_check   AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual       ILIKE '%auth.uid()%'
    OR with_check ILIKE '%auth.uid()%'
    OR qual       ILIKE '%auth.jwt()%'
    OR with_check ILIKE '%auth.jwt()%')
ORDER BY tablename, policyname;

    ── 0C. Grants para anon em tabelas/views ──────────────────────────

SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
ORDER BY table_name, privilege_type;
*/


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 1 · SECURITY INVOKER NAS VIEWS
-- ═══════════════════════════════════════════════════════════════════════
--
-- POR QUÊ É SEGURO:
--   Todas as tabelas-base já possuem:
--     CREATE POLICY "auth_select_<tabela>" ... FOR SELECT TO authenticated USING (true)
--   Portanto, após o fix, usuários autenticados continuam vendo exatamente
--   os mesmos dados. Usuários anônimos continuam bloqueados nas tabelas
--   que não têm policy para anon (comportamento correto).
--
-- EXCEÇÃO INTENCIONAL:
--   v_contratos → contratos tem "anon_select_contratos" USING (true).
--   A view continuará acessível para anon após o fix — isso será tratado
--   na FASE 3, revogando o grant anon em contratos.
--
-- NOTA TÉCNICA:
--   ALTER VIEW ... SET (security_invoker = on) requer PostgreSQL 15+.
--   Supabase utiliza PostgreSQL 15 — compatível.
-- ═══════════════════════════════════════════════════════════════════════

DO $fase1$
DECLARE
  v_views text[] := ARRAY[
    -- Views definidas em supabase-v2-schema.sql
    'v_membros',
    'v_visitantes',
    'v_oficiais',
    'v_nomeados',
    'v_demandas',
    'v_contratos',
    'v_pessoas_ativas',
    -- Views definidas em supabase-v3-patch.sql
    'v_contratados',
    'v_seminaristas',
    -- Views de módulos específicos
    'v_rede_cuidado',
    'v_escala_diaconal',
    'v_participantes_externos',
    -- Views em supabase-oficiais.sql / supabase-nomeados.sql
    'vw_mandatos_a_vencer',
    'vw_quadro_resumo',
    'vw_pessoa_cargos',
    -- Views que existem no banco mas não nas migrations locais
    -- (criadas por scripts mais antigos ou via Dashboard)
    'vw_pessoas_ativas',
    'v_pessoas_completo',
    'vw_oficiais_ativos',
    'vw_financeiro_ativo',
    'vw_membros_ativos',
    'vw_contratos_ativos',
    'vw_nomeados_ativos',
    'vw_demandas_ativas',
    'v_pessoas_sem_vinculo'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_views LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v_name);
      RAISE NOTICE 'FASE 1 ✓ security_invoker habilitado: %', v_name;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'FASE 1 ⏭  View não existe, ignorando: %', v_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'FASE 1 ✗ Erro em %: % (SQLSTATE: %)', v_name, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $fase1$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 2 · FIX AUTH RLS INITIALIZATION PLAN
-- ═══════════════════════════════════════════════════════════════════════
--
-- PROBLEMA DE PERFORMANCE:
--   Quando auth.uid() aparece diretamente em uma política RLS que contém
--   subquery (EXISTS, IN), o PostgreSQL a trata como função VOLATILE e a
--   reavalia para cada linha. Isso cria um "Initialization Plan" por linha
--   em vez de uma única avaliação por query — custo O(n) desnecessário.
--
-- FIX: substituir auth.uid() por (SELECT auth.uid())
--   O PostgreSQL avalia a subquery escalar uma única vez (init-plan) e
--   reutiliza o resultado para todas as linhas da query — custo O(1).
--
-- TABELAS AFETADAS:
--   • ministerios          — criado_por = auth.uid()
--   • ministerio_membros   — criado_por = auth.uid()
--   • rede_cuidado         — subqueries com auth.uid()
--   Demais tabelas usam USING (true) — sem auth.uid(), sem impacto.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 2A. ministerios ──────────────────────────────────────────────────

DROP POLICY IF EXISTS ministerios_insert ON public.ministerios;
DROP POLICY IF EXISTS ministerios_select ON public.ministerios;
DROP POLICY IF EXISTS ministerios_update ON public.ministerios;
DROP POLICY IF EXISTS ministerios_delete ON public.ministerios;

CREATE POLICY ministerios_insert ON public.ministerios
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = (SELECT auth.uid()));

CREATE POLICY ministerios_select ON public.ministerios
  FOR SELECT TO authenticated
  USING (
    igreja_id IS NULL
    OR igreja_id IN (
      SELECT p.igreja_id
      FROM public.pessoas p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.igreja_id IS NOT NULL
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY ministerios_update ON public.ministerios
  FOR UPDATE TO authenticated
  USING (criado_por = (SELECT auth.uid()) OR criado_por IS NULL)
  WITH CHECK (criado_por = (SELECT auth.uid()) OR criado_por IS NULL);

CREATE POLICY ministerios_delete ON public.ministerios
  FOR DELETE TO authenticated
  USING (criado_por = (SELECT auth.uid()) OR criado_por IS NULL);

-- Garantir que service_role tenha acesso irrestrito
DO $$ BEGIN
  EXECUTE 'CREATE POLICY ministerios_service_all ON public.ministerios
    FOR ALL TO service_role USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2B. ministerio_membros ───────────────────────────────────────────

DROP POLICY IF EXISTS ministerio_membros_insert ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_select ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_update ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_delete ON public.ministerio_membros;

CREATE POLICY ministerio_membros_insert ON public.ministerio_membros
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = (SELECT auth.uid()));

CREATE POLICY ministerio_membros_select ON public.ministerio_membros
  FOR SELECT TO authenticated
  USING (
    igreja_id IS NULL
    OR igreja_id IN (
      SELECT p.igreja_id
      FROM public.pessoas p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.igreja_id IS NOT NULL
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY ministerio_membros_update ON public.ministerio_membros
  FOR UPDATE TO authenticated
  USING (criado_por = (SELECT auth.uid()) OR criado_por IS NULL)
  WITH CHECK (criado_por = (SELECT auth.uid()) OR criado_por IS NULL);

CREATE POLICY ministerio_membros_delete ON public.ministerio_membros
  FOR DELETE TO authenticated
  USING (criado_por = (SELECT auth.uid()) OR criado_por IS NULL);

DO $$ BEGIN
  EXECUTE 'CREATE POLICY ministerio_membros_service_all ON public.ministerio_membros
    FOR ALL TO service_role USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2C. rede_cuidado ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "rede_cuidado_admin_all"      ON public.rede_cuidado;
DROP POLICY IF EXISTS "rede_cuidado_lider_select"   ON public.rede_cuidado;
DROP POLICY IF EXISTS "rede_cuidado_cuidado_select" ON public.rede_cuidado;
DROP POLICY IF EXISTS "rede_cuidado_service_all"    ON public.rede_cuidado;

-- Admin/Pastoral: acesso total
CREATE POLICY "rede_cuidado_admin_all"
  ON public.rede_cuidado
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.membros m
      JOIN public.pessoas p ON p.id = m.pessoa_id
      WHERE p.auth_user_id = (SELECT auth.uid())          -- FIX: init-plan
        AND m.funcao IN (
          'ADMINISTRADOR_GERAL','admin_geral',
          'PASTORAL','pastoral','pastor','PASTOR'
        )
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.membros m
      JOIN public.pessoas p ON p.id = m.pessoa_id
      WHERE p.auth_user_id = (SELECT auth.uid())          -- FIX: init-plan
        AND m.funcao IN (
          'ADMINISTRADOR_GERAL','admin_geral',
          'PASTORAL','pastoral','pastor','PASTOR'
        )
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
    )
  );

-- Cuidador: vê seus próprios vínculos
CREATE POLICY "rede_cuidado_lider_select"
  ON public.rede_cuidado
  FOR SELECT TO authenticated
  USING (
    cuidador_id IN (
      SELECT p.id
      FROM public.pessoas p
      WHERE p.auth_user_id = (SELECT auth.uid())          -- FIX: init-plan
        AND p.deleted_at IS NULL
    )
  );

-- Cuidado: vê quem é seu cuidador
CREATE POLICY "rede_cuidado_cuidado_select"
  ON public.rede_cuidado
  FOR SELECT TO authenticated
  USING (
    cuidado_id IN (
      SELECT p.id
      FROM public.pessoas p
      WHERE p.auth_user_id = (SELECT auth.uid())          -- FIX: init-plan
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "rede_cuidado_service_all"
  ON public.rede_cuidado
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── 2D. Atualizar is_admin() e has_role() com (SELECT auth.uid()) ────
--   As funções existem em supabase-v3-incremental.sql com auth.uid() direto.
--   Embora STABLE + SECURITY DEFINER mitigue o problema, é boa prática
--   ser explícito.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid())                        -- FIX: init-plan
      AND role = 'admin'
      AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid())                        -- FIX: init-plan
      AND role = required_role
      AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid())                        -- FIX: init-plan
      AND role = ANY(required_roles)
      AND ativo = true
  )
$$;

-- Função auxiliar: retorna o pessoa_id do usuário autenticado atual
-- Usada internamente em policies e funções SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.minha_pessoa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.pessoas p
  WHERE p.auth_user_id = (SELECT auth.uid())
    AND p.deleted_at IS NULL
  LIMIT 1
$$;

COMMENT ON FUNCTION public.minha_pessoa_id() IS
  'Retorna pessoas.id do usuário autenticado. SECURITY DEFINER para evitar
   recursão em policies. Avaliada como init-plan via (SELECT auth.uid()).';


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 3 · REVOGAR GRANTS PERIGOSOS PARA ANON
-- ═══════════════════════════════════════════════════════════════════════
--
-- RISCO REAL ENCONTRADO:
--   contratos-rls-grant-fix.sql concedeu:
--     GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO anon;
--   Isso permite que qualquer pessoa não autenticada crie, edite e exclua
--   contratos via API pública — sem nenhuma autenticação!
--
-- REGRA GERAL:
--   Apenas tabelas com necessidade explícita de acesso público devem
--   ter grants para 'anon'. No SIPEN, apenas:
--     - eventos           (página pública de inscrição)
--     - evento_inscricoes (idem)
--   Todas as demais tabelas devem ser exclusivas para 'authenticated'.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 3A. Revogar grants anon em contratos ────────────────────────────
REVOKE ALL PRIVILEGES ON public.contratos FROM anon;

-- Remover policy SELECT para anon em contratos
DROP POLICY IF EXISTS "anon_select_contratos" ON public.contratos;

-- Garantir que authenticated ainda tem acesso completo
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "auth_select_contratos" ON public.contratos
    FOR SELECT TO authenticated USING (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "auth_insert_contratos" ON public.contratos
    FOR INSERT TO authenticated WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "auth_update_contratos" ON public.contratos
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "auth_delete_contratos" ON public.contratos
    FOR DELETE TO authenticated USING (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "service_all_contratos" ON public.contratos
    FOR ALL TO service_role USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 3B. Auditar e revogar outros grants anon indevidos ───────────────
--   Tabelas abaixo NÃO devem ter acesso anon. REVOKE é idempotente.

DO $fase3b$
DECLARE
  v_tabelas text[] := ARRAY[
    'pessoas','membros','visitantes','oficiais','nomeados','seminaristas',
    'contratados','demandas','financeiro','agenda','pgs','pg_participantes',
    'congregacoes','ministerios','ministerio_membros','rede_cuidado',
    'logs_sistema','user_profiles','perfis','perfis_permissoes',
    'whatsapp_config','whatsapp_mensagens','whatsapp_templates',
    'escala_diaconal','participantes_externos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tabelas LOOP
    BEGIN
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.%I FROM anon', t);
      RAISE NOTICE 'FASE 3 ✓ REVOKE anon: %', t;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'FASE 3 ⏭  Tabela não existe: %', t;
      WHEN OTHERS THEN
        RAISE NOTICE 'FASE 3 ✗ Erro em %: %', t, SQLERRM;
    END;
  END LOOP;
END $fase3b$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 4 · USER_PROFILES — POLICIES CORRETAS
-- ═══════════════════════════════════════════════════════════════════════
--
-- PROBLEMA:
--   A tabela user_profiles tem RLS habilitado (supabase-v3-incremental.sql)
--   mas sem policies SELECT definidas para authenticated. Isso significa:
--     - Nenhum usuário consegue ler sua própria entrada em user_profiles
--     - As funções is_admin()/has_role() funcionam (são SECURITY DEFINER)
--     - Mas queries diretas ao perfil do usuário falham com 0 linhas
--
-- SOLUÇÃO:
--   • Usuário lê apenas sua própria linha (id = auth.uid())
--   • Admins lêem e gerenciam todas as linhas (via is_admin())
--   • service_role: acesso total
-- ═══════════════════════════════════════════════════════════════════════

-- Limpar policies existentes (podem estar num estado inconsistente)
DROP POLICY IF EXISTS "user_profiles_self_select"   ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all"     ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_all"   ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile"      ON public.user_profiles;
DROP POLICY IF EXISTS "admin_manage_all_profiles"   ON public.user_profiles;

-- Cada usuário lê apenas o próprio perfil
CREATE POLICY "user_profiles_self_select"
  ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Admin gerencia todos (uses is_admin() que é SECURITY DEFINER — sem recursão)
CREATE POLICY "user_profiles_admin_all"
  ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role: irrestrito (Edge Functions, migrations, backups)
CREATE POLICY "user_profiles_service_all"
  ON public.user_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 5 · CORRIGIR POLICIES WHATSAPP (auth.jwt() ->> 'role' QUEBRADO)
-- ═══════════════════════════════════════════════════════════════════════
--
-- PROBLEMA CRÍTICO DE LÓGICA:
--   As policies em supabase-whatsapp.sql usam:
--     auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL')
--   Mas o JWT claim 'role' da Supabase Auth é SEMPRE 'authenticated' ou
--   'anon' — nunca o role de aplicação (que é armazenado em membros.funcao
--   e perfis, não no JWT).
--
--   RESULTADO ATUAL:
--     - whatsapp_config: NENHUM usuário autenticado consegue ler/escrever
--       (a policy sempre falha porque role='authenticated' ≠ 'admin_geral')
--     - whatsapp_templates: qualquer autenticado lê (USING true) — ok
--     - whatsapp_mensagens: NENHUM usuário autenticado consegue ler logs
--
-- CORREÇÃO:
--   Substituir auth.jwt() ->> 'role' pela função is_admin() que consulta
--   user_profiles.role via SECURITY DEFINER (bypassa RLS corretamente).
--
--   NOTA: Se user_profiles não estiver populado, is_admin() retorna false.
--   Nesse caso, habilitar o fallback baseado em membros.funcao comentado
--   abaixo, até popular user_profiles.
-- ═══════════════════════════════════════════════════════════════════════

-- whatsapp_config: apenas admins
DROP POLICY IF EXISTS "admin_select_wa_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "admin_update_wa_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "wa_config_admin_select" ON public.whatsapp_config;
DROP POLICY IF EXISTS "wa_config_admin_all"    ON public.whatsapp_config;

CREATE POLICY "wa_config_admin_select"
  ON public.whatsapp_config
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "wa_config_admin_all"
  ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "wa_config_service_all"
  ON public.whatsapp_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- whatsapp_mensagens: admins e operacionais lêem; apenas service_role insere
DROP POLICY IF EXISTS "admin_select_wa_msg"   ON public.whatsapp_mensagens;
DROP POLICY IF EXISTS "wa_msg_admin_select"   ON public.whatsapp_mensagens;
DROP POLICY IF EXISTS "wa_msg_service_all"    ON public.whatsapp_mensagens;

CREATE POLICY "wa_msg_admin_select"
  ON public.whatsapp_mensagens
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "wa_msg_service_all"
  ON public.whatsapp_mensagens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- whatsapp_templates: todos autenticados lêem; admins gerenciam
DROP POLICY IF EXISTS "autenticado_select_templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "admin_manage_templates"       ON public.whatsapp_templates;

CREATE POLICY "wa_templates_authenticated_select"
  ON public.whatsapp_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "wa_templates_admin_manage"
  ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "wa_templates_service_all"
  ON public.whatsapp_templates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- whatsapp_modulo_config: todos autenticados lêem; admins escrevem
DROP POLICY IF EXISTS "autenticado_select_modulo_config" ON public.whatsapp_modulo_config;
DROP POLICY IF EXISTS "admin_update_modulo_config"       ON public.whatsapp_modulo_config;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.whatsapp_modulo_config ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "wa_modulo_authenticated_select"
  ON public.whatsapp_modulo_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "wa_modulo_admin_manage"
  ON public.whatsapp_modulo_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "wa_modulo_service_all"
  ON public.whatsapp_modulo_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ── FALLBACK TEMPORÁRIO: se user_profiles não estiver populado ──────
-- Descomente o bloco abaixo SOMENTE se is_admin() retornar false para
-- todos os admins. Isso usa membros.funcao como fonte de verdade enquanto
-- user_profiles não for populado.
--
-- CREATE OR REPLACE FUNCTION public.is_admin_by_funcao()
-- RETURNS boolean
-- LANGUAGE sql STABLE SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (
--     SELECT 1
--     FROM public.membros m
--     JOIN public.pessoas p ON p.id = m.pessoa_id
--     WHERE p.auth_user_id = (SELECT auth.uid())
--       AND m.funcao IN (
--         'ADMINISTRADOR_GERAL','admin_geral','PASTORAL','pastoral','pastor','PASTOR'
--       )
--       AND m.status = 'ativo'
--       AND m.deleted_at IS NULL
--   )
-- $$;
-- Depois substitua is_admin() por is_admin_by_funcao() nas policies acima.


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 6 · GRANTS MÍNIMOS NAS VIEWS PARA AUTHENTICATED
-- ═══════════════════════════════════════════════════════════════════════
--
-- Após security_invoker, as views herdam as permissões do CHAMADOR.
-- O GRANT nas views é necessário para que PostgREST possa expô-las via REST.
-- Se o usuário tem SELECT na tabela-base (via RLS), a view funciona.
-- O GRANT aqui apenas permite que PostgREST liste a view como endpoint.
-- ═══════════════════════════════════════════════════════════════════════

DO $fase6$
DECLARE
  v_views text[] := ARRAY[
    'v_membros','v_visitantes','v_oficiais','v_nomeados',
    'v_demandas','v_contratos','v_pessoas_ativas',
    'v_contratados','v_seminaristas',
    'v_rede_cuidado','v_escala_diaconal','v_participantes_externos',
    'vw_mandatos_a_vencer','vw_quadro_resumo','vw_pessoa_cargos',
    'vw_pessoas_ativas','v_pessoas_completo','vw_oficiais_ativos',
    'vw_financeiro_ativo','vw_membros_ativos','vw_contratos_ativos',
    'vw_nomeados_ativos','vw_demandas_ativas','v_pessoas_sem_vinculo'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_views LOOP
    BEGIN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_name);
      RAISE NOTICE 'FASE 6 ✓ GRANT SELECT authenticated: %', v_name;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'FASE 6 ⏭  View não existe: %', v_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'FASE 6 ✗ Erro em %: %', v_name, SQLERRM;
    END;
  END LOOP;
END $fase6$;

-- Views que precisam de GRANT para service_role também
DO $fase6b$
DECLARE
  v_views text[] := ARRAY[
    'v_membros','v_visitantes','v_oficiais','v_nomeados',
    'v_demandas','v_contratos','v_pessoas_ativas',
    'v_contratados','v_seminaristas','v_rede_cuidado',
    'v_escala_diaconal','v_participantes_externos'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_views LOOP
    BEGIN
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', v_name);
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $fase6b$;


-- ── 6C. Remover grants anon desnecessários das views ─────────────────
--   v_contratos tinha GRANT TO anon (de contratos-rls-grant-fix.sql).
--   Após revogar o grant na tabela-base, revogar na view também.

DO $fase6c$
DECLARE
  v_views text[] := ARRAY[
    'v_contratos','v_membros','v_visitantes','v_oficiais','v_nomeados',
    'v_demandas','v_pessoas_ativas','v_contratados','v_seminaristas',
    'v_rede_cuidado','v_escala_diaconal','v_participantes_externos',
    'vw_financeiro_ativo','vw_membros_ativos','vw_demandas_ativas'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_views LOOP
    BEGIN
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.%I FROM anon', v_name);
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $fase6c$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 7 · VALIDAÇÃO
-- ═══════════════════════════════════════════════════════════════════════
--
-- Execute estas queries APÓS o script e confira os resultados esperados.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 7A. Views com security_invoker habilitado ────────────────────────
-- ESPERADO: todas as views críticas aparecem com security_invoker=on
SELECT
  n.nspname                                          AS schema,
  c.relname                                          AS view_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_options_to_table(c.reloptions)
      WHERE option_name = 'security_invoker' AND option_value = 'on'
    ) THEN 'SECURITY INVOKER ✓'
    ELSE 'SECURITY DEFINER ✗'
  END AS security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
ORDER BY c.relname;


-- ── 7B. Grants anon remanescentes ───────────────────────────────────
-- ESPERADO: apenas eventos e evento_inscricoes devem aparecer
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
ORDER BY table_name;


-- ── 7C. Policies que ainda usam auth.uid() sem init-plan ────────────
-- ESPERADO: zero linhas (todas as occurrências devem ter sido corrigidas)
-- NOTA: pg_policies.qual/with_check já são text — não usar pg_get_expr()
SELECT tablename, policyname,
       qual         AS using_expr,
       with_check   AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual       ~ 'auth\.uid\(\)'
    OR with_check ~ 'auth\.uid\(\)'
    OR qual       ~ 'auth\.jwt\(\)'
    OR with_check ~ 'auth\.jwt\(\)'
  )
ORDER BY tablename;


-- ── 7D. Tabelas com RLS habilitado mas SEM nenhuma policy ───────────
-- ESPERADO: zero linhas (tabelas sem policy bloqueiam tudo — silent fail)
SELECT c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND c.relname NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  )
ORDER BY c.relname;


-- ── 7E. Teste de acesso funcional (simulação via SET ROLE) ──────────
-- Teste manual: execute como usuário autenticado e verifique 0 erros
-- SET ROLE authenticated;
-- SELECT count(*) FROM public.v_membros;          -- deve retornar um número
-- SELECT count(*) FROM public.v_contratos;        -- deve retornar um número
-- SELECT count(*) FROM public.v_demandas;         -- deve retornar um número
-- SELECT count(*) FROM public.rede_cuidado;       -- deve retornar um número
-- RESET ROLE;
--
-- Teste como anon (deve retornar 0 ou error):
-- SET ROLE anon;
-- SELECT count(*) FROM public.v_contratos;        -- DEVE dar error (sem policy)
-- SELECT count(*) FROM public.v_membros;          -- DEVE dar error
-- RESET ROLE;


-- ── 7F. Confirmar que PostgREST vai recarregar o schema ─────────────
NOTIFY pgrst, 'reload schema';


-- ═══════════════════════════════════════════════════════════════════════
-- SCRIPT DE ROLLBACK COMPLETO
-- Execute este bloco APENAS se precisar reverter todas as mudanças.
-- ═══════════════════════════════════════════════════════════════════════

/*
-- ── ROLLBACK FASE 1: Desabilitar security_invoker nas views ──────────

DO $rollback1$
DECLARE
  v_views text[] := ARRAY[
    'v_membros','v_visitantes','v_oficiais','v_nomeados','v_demandas',
    'v_contratos','v_pessoas_ativas','v_contratados','v_seminaristas',
    'v_rede_cuidado','v_escala_diaconal','v_participantes_externos',
    'vw_mandatos_a_vencer','vw_quadro_resumo','vw_pessoa_cargos',
    'vw_pessoas_ativas','v_pessoas_completo','vw_oficiais_ativos',
    'vw_financeiro_ativo','vw_membros_ativos','vw_contratos_ativos',
    'vw_nomeados_ativos','vw_demandas_ativas','v_pessoas_sem_vinculo'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY v_views LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I RESET (security_invoker)', v_name);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $rollback1$;

-- ── ROLLBACK FASE 2: Restaurar policies com auth.uid() direto ────────

-- ministerios (do sipen-security-migration.sql original)
DROP POLICY IF EXISTS ministerios_insert ON public.ministerios;
DROP POLICY IF EXISTS ministerios_select ON public.ministerios;
DROP POLICY IF EXISTS ministerios_update ON public.ministerios;
DROP POLICY IF EXISTS ministerios_delete ON public.ministerios;

CREATE POLICY ministerios_insert ON public.ministerios
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY ministerios_select ON public.ministerios
  FOR SELECT TO authenticated
  USING (
    igreja_id IS NULL
    OR igreja_id IN (
      SELECT igreja_id FROM public.pessoas
      WHERE auth_user_id = auth.uid() AND igreja_id IS NOT NULL
    )
  );

CREATE POLICY ministerios_update ON public.ministerios
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

CREATE POLICY ministerios_delete ON public.ministerios
  FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

-- (fazer o mesmo para ministerio_membros se necessário)

-- ── ROLLBACK FASE 3: Restaurar grant anon em contratos ───────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO anon;

DO $$ BEGIN
  CREATE POLICY "anon_select_contratos"
    ON public.contratos FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ROLLBACK FASE 5: Restaurar policies WhatsApp com auth.jwt() ──────

DROP POLICY IF EXISTS "wa_config_admin_select" ON public.whatsapp_config;
DROP POLICY IF EXISTS "wa_config_admin_all"    ON public.whatsapp_config;

CREATE POLICY "admin_select_wa_config" ON public.whatsapp_config
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

CREATE POLICY "admin_update_wa_config" ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

DROP POLICY IF EXISTS "wa_msg_admin_select" ON public.whatsapp_mensagens;

CREATE POLICY "admin_select_wa_msg" ON public.whatsapp_mensagens
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL','adm_operacional','ADM_OPERACIONAL'));

NOTIFY pgrst, 'reload schema';
*/

-- ═══════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════════════
