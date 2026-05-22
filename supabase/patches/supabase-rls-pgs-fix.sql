-- ════════════════════════════════════════════════════════════════════════
-- SIPEN — Fix RLS Recursion Infinita na tabela pgs
-- Data: 2026-05-21
--
-- PROBLEMA (code 42P17):
--   "infinite recursion detected in policy for relation pgs"
--
--   O PostgreSQL lança este erro quando uma policy na tabela `pgs` avalia
--   uma condição USING/WITH CHECK que, direta ou indiretamente, consulta
--   a própria tabela `pgs` novamente. Cada avaliação dispara nova avaliação
--   da policy, criando loop infinito.
--
--   Padrões que causam recursão:
--     • USING (lider_id IN (SELECT ... FROM pgs WHERE ...))
--     • USING (EXISTS (SELECT 1 FROM pg_participantes p
--                      JOIN pgs g ON g.id = p.pg_id WHERE ...))
--     • USING (public.fn_que_consulta_pgs())
--     • policy em pg_participantes que faz JOIN em pgs (referência circular)
--
-- SOLUÇÃO:
--   1. DROP de TODAS as policies existentes em pgs e pg_participantes
--      (incluindo qualquer policy criada via Dashboard que não está nas migrations)
--   2. Recriação limpa com USING (true) — sem auto-referência
--   3. Separação por role: anon, authenticated, service_role
--
-- SEGURANÇA:
--   O SIPEN usa anon key para todas as operações do frontend.
--   A autenticação é feita via sipenToken (usuário/senha da tabela user_profiles),
--   não via Supabase Auth. Por isso, policies com auth.uid() ou is_admin()
--   NÃO devem ser usadas em pgs — elas sempre retornariam false para anon.
--   O controle de acesso real é feito na camada de aplicação (api.js + perfis).
--
-- ROLLBACK (se necessário):
--   Reexecutar supabase-anon-policies.sql — ela recria as policies básicas.
--
-- EXECUÇÃO:
--   SQL Editor do Supabase Dashboard → executar todo o bloco
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 1: Inspecionar policies atuais (para diagnóstico)
-- ════════════════════════════════════════════════════════════════════════

-- Execute este SELECT separado ANTES para ver o que existe:
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('pgs', 'pg_participantes')
-- ORDER BY tablename, policyname;


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 2: Remover TODAS as policies de pgs (drop seguro com IF EXISTS)
-- ════════════════════════════════════════════════════════════════════════

-- Políticas criadas pelas migrations (v2-schema, v3-incremental, patches)
DROP POLICY IF EXISTS "auth_select_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "auth_insert_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "auth_update_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "auth_delete_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "service_all_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "anon_select_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "anon_insert_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "anon_update_pgs"          ON public.pgs;
DROP POLICY IF EXISTS "anon_delete_pgs"          ON public.pgs;

-- Políticas com nomes comuns gerados por IA / Dashboard
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.pgs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.pgs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.pgs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.pgs;
DROP POLICY IF EXISTS "lider_can_select"                          ON public.pgs;
DROP POLICY IF EXISTS "lider_can_update"                          ON public.pgs;
DROP POLICY IF EXISTS "member_can_view"                           ON public.pgs;
DROP POLICY IF EXISTS "participante_can_view"                     ON public.pgs;
DROP POLICY IF EXISTS "select_own_pgs"                            ON public.pgs;
DROP POLICY IF EXISTS "pgs_select_policy"                         ON public.pgs;
DROP POLICY IF EXISTS "pgs_insert_policy"                         ON public.pgs;
DROP POLICY IF EXISTS "pgs_update_policy"                         ON public.pgs;
DROP POLICY IF EXISTS "pgs_delete_policy"                         ON public.pgs;

-- Remover qualquer outra policy via DO block (limpa tudo que restou)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'pgs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pgs', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 3: Remover TODAS as policies de pg_participantes
-- (pode haver referência circular pgs ↔ pg_participantes)
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_select_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "auth_insert_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "auth_update_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "auth_delete_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "service_all_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "anon_select_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "anon_insert_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "anon_update_pg_participantes"    ON public.pg_participantes;
DROP POLICY IF EXISTS "anon_delete_pg_participantes"    ON public.pg_participantes;

-- Limpar qualquer outra policy via DO block
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'pg_participantes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pg_participantes', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 4: Recriar policies limpas para pgs
--
-- Estratégia: USING (true) sem auto-referência
-- Roles: anon (frontend usa anon key), authenticated, service_role
-- ════════════════════════════════════════════════════════════════════════

-- anon: leitura e escrita (frontend SIPEN usa anon key)
CREATE POLICY "anon_select_pgs"
  ON public.pgs FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_insert_pgs"
  ON public.pgs FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_pgs"
  ON public.pgs FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_pgs"
  ON public.pgs FOR DELETE TO anon
  USING (true);

-- authenticated: acesso completo
CREATE POLICY "auth_select_pgs"
  ON public.pgs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_insert_pgs"
  ON public.pgs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_pgs"
  ON public.pgs FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_pgs"
  ON public.pgs FOR DELETE TO authenticated
  USING (true);

-- service_role: acesso total (usado por Edge Functions e migrations)
CREATE POLICY "service_all_pgs"
  ON public.pgs FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 5: Recriar policies limpas para pg_participantes
-- ════════════════════════════════════════════════════════════════════════

CREATE POLICY "anon_select_pg_participantes"
  ON public.pg_participantes FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_insert_pg_participantes"
  ON public.pg_participantes FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_pg_participantes"
  ON public.pg_participantes FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_pg_participantes"
  ON public.pg_participantes FOR DELETE TO anon
  USING (true);

CREATE POLICY "auth_select_pg_participantes"
  ON public.pg_participantes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_insert_pg_participantes"
  ON public.pg_participantes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_pg_participantes"
  ON public.pg_participantes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_pg_participantes"
  ON public.pg_participantes FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "service_all_pg_participantes"
  ON public.pg_participantes FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 6: Garantir que RLS está ativo nas duas tabelas
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pgs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_participantes  ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 7: Forçar PostgREST a recarregar schema
-- ════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- PASSO 8: Validação — executar após o script para confirmar
-- ════════════════════════════════════════════════════════════════════════

-- Verificar policies recriadas:
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE tablename IN ('pgs', 'pg_participantes')
  AND schemaname = 'public'
ORDER BY tablename, cmd, roles;

-- ════════════════════════════════════════════════════════════════════════
-- FIM
-- ════════════════════════════════════════════════════════════════════════
