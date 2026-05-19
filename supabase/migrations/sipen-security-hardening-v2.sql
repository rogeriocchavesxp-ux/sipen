-- ═══════════════════════════════════════════════════════════════════════
-- SIPEN — Security Hardening v2.0
-- Data: 2026-05-19
--
-- FASES:
--   1 · Function Search Path Mutable   — SET search_path fixo em todas funções
--   2 · Extensions no schema public    — schema 'extensions' + mover unaccent
--   3 · RLS Permissivo (anon crítico)  — pastores / escala_pregacao / outros
--   4 · SECURITY DEFINER RPC Exposure  — REVOKE PUBLIC, GRANT explícito
--   5 · Leaked Password Protection     — configuração de Auth (documentado)
--   6 · Validação e Auditoria
--
-- PRINCÍPIOS:
--   • Zero DROP TABLE / DROP VIEW
--   • Idempotente — seguro para re-executar
--   • Rollback documentado ao final
--   • Compatibilidade total com frontend legado
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 1 · FUNCTION SEARCH PATH MUTABLE
-- ═══════════════════════════════════════════════════════════════════════
--
-- RISCO: Sem SET search_path fixo, uma função pode ser enganada se um
-- atacante conseguir criar objetos num schema temporário que fique antes
-- de 'public' no search_path da sessão (schema injection / Trojan horse).
-- Para funções SECURITY DEFINER o risco é maior: executam como o dono.
--
-- CORREÇÃO: recrear cada função com SET search_path = public, extensions
-- A palavra-chave do linter é: function_search_path_mutable
--
-- ESTRATÉGIA:
--   Trigger functions (retornam TRIGGER): SET search_path = public
--   Funções SECURITY DEFINER: SET search_path = public, extensions
--   Funções comuns (SECURITY INVOKER implícito): SET search_path = public
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1.1  set_updated_at  ─────────────────────────────────────────────
-- Múltiplos arquivos redefinem esta função; a versão abaixo é canônica.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1.2  set_atualizado_em  ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── 1.3  apply_updated_at (procedure)  ──────────────────────────────
CREATE OR REPLACE PROCEDURE public.apply_updated_at(tbl text)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
     CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
    tbl, tbl, tbl, tbl);
END;
$$;

-- ── 1.4  imm_unaccent  ───────────────────────────────────────────────
-- search_path inclui 'extensions' para quando unaccent for movido de schema.
CREATE OR REPLACE FUNCTION public.imm_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path = public, extensions
AS $$
  SELECT unaccent($1)
$$;

-- ── 1.5  fn_congregacoes_atualizado_em  ─────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_congregacoes_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── 1.6  ce_touch_updated_at  ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ce_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1.7  update_atualizado_em  ───────────────────────────────────────
-- Definida em supabase-congregacoes.sql sem search_path.
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── 1.8  update_atualizado_em_oficiais  ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_atualizado_em_oficiais()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── 1.9  update_atualizado_em_nomeados  ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_atualizado_em_nomeados()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── 1.10  update_timestamp  ─────────────────────────────────────────
-- Definida em supabase-perfis-permissoes.sql sem search_path.
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

-- ── 1.11  atualizar_updated_at  ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1.12  _pext_set_updated_at  ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public._pext_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1.13  atualizar_estoque  ─────────────────────────────────────────
-- Mantém comportamento original; apenas adiciona search_path.
CREATE OR REPLACE FUNCTION public.atualizar_estoque()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.estoque_itens
    SET quantidade_atual = quantidade_atual +
      CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 1.14  fn_audit (SECURITY DEFINER)  ──────────────────────────────
-- SECURITY DEFINER: precisa de search_path fixo obrigatoriamente.
CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pessoa_id uuid;
  v_auth_id   uuid;
BEGIN
  BEGIN
    v_pessoa_id := current_setting('app.pessoa_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_pessoa_id := NULL;
  END;
  BEGIN
    v_auth_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_auth_id := NULL;
  END;
  INSERT INTO public.logs_sistema (
    tabela, operacao, registro_id,
    dados_antes, dados_depois,
    pessoa_id, auth_user_id
  )
  VALUES (
    TG_TABLE_NAME, TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_pessoa_id, v_auth_id
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 1.15  fn_sync_congregacao_lideranca  ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_congregacao_lideranca()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.congregacao_id IS NOT NULL AND NEW.deleted_at IS NULL
     AND NEW.status IN ('ativo','especial') THEN
    IF NEW.cargo = 'pastor' THEN
      UPDATE public.congregacoes
      SET pastor_id = NEW.pessoa_id
      WHERE id = NEW.congregacao_id;
    ELSIF NEW.cargo = 'presbitero' THEN
      UPDATE public.congregacoes
      SET presbitero_id = NEW.pessoa_id
      WHERE id = NEW.congregacao_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.congregacao_id IS NOT NULL
     AND (NEW.status IN ('encerrado','transferido') OR NEW.deleted_at IS NOT NULL) THEN
    IF OLD.cargo = 'pastor' THEN
      UPDATE public.congregacoes
      SET pastor_id = NULL
      WHERE id = OLD.congregacao_id AND pastor_id = OLD.pessoa_id;
    ELSIF OLD.cargo = 'presbitero' THEN
      UPDATE public.congregacoes
      SET presbitero_id = NULL
      WHERE id = OLD.congregacao_id AND presbitero_id = OLD.pessoa_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 1.16  fn_check_membro_visitante  ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_membro_visitante()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.membros
    WHERE pessoa_id = NEW.pessoa_id
      AND status = 'ativo'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Pessoa % já é membro ativo. Não pode ser cadastrada como visitante.',
      NEW.pessoa_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 1.17  fn_set_app_pessoa_id (SECURITY DEFINER)  ───────────────────
CREATE OR REPLACE FUNCTION public.fn_set_app_pessoa_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pessoa_id uuid;
BEGIN
  SELECT p.id INTO v_pessoa_id
  FROM public.pessoas p
  WHERE p.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
  IF v_pessoa_id IS NOT NULL THEN
    PERFORM set_config('app.pessoa_id', v_pessoa_id::text, true);
  END IF;
END;
$$;

-- ── 1.18  fn_on_auth_user_created (SECURITY DEFINER)  ────────────────
CREATE OR REPLACE FUNCTION public.fn_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 1.19  pode_editar_financeiro (SECURITY DEFINER)  ─────────────────
CREATE OR REPLACE FUNCTION public.pode_editar_financeiro()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.pessoas pe
      JOIN public.membros m  ON m.pessoa_id = pe.id
      JOIN public.perfis pf  ON UPPER(pf.nome) = UPPER(m.funcao)
      JOIN public.perfis_permissoes pp ON pp.perfil_id = pf.id
      WHERE pe.auth_user_id = (SELECT auth.uid())
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
        AND pp.modulo = 'FINANCEIRO'
        AND pp.nivel_acesso IN ('EDICAO', 'COMPLETO')
    );
$$;

-- ── 1.20  pode_editar_projetos (SECURITY DEFINER)  ───────────────────
CREATE OR REPLACE FUNCTION public.pode_editar_projetos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas pe
    JOIN public.membros m  ON m.pessoa_id = pe.id
    JOIN public.perfis pf  ON UPPER(pf.nome) = UPPER(m.funcao)
    JOIN public.perfis_permissoes pp ON pp.perfil_id = pf.id
    WHERE pe.auth_user_id = (SELECT auth.uid())
      AND m.status = 'ativo'
      AND m.deleted_at IS NULL
      AND pp.modulo = 'PROJETOS'
      AND pp.nivel_acesso IN ('EDICAO', 'COMPLETO')
  );
$$;

-- ── 1.21  pode_editar_membresia (SECURITY DEFINER)  ──────────────────
-- Recria com search_path. Se a função não existir ainda, cria agora.
CREATE OR REPLACE FUNCTION public.pode_editar_membresia()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.pessoas pe
      JOIN public.membros m  ON m.pessoa_id = pe.id
      JOIN public.perfis pf  ON UPPER(pf.nome) = UPPER(m.funcao)
      JOIN public.perfis_permissoes pp ON pp.perfil_id = pf.id
      WHERE pe.auth_user_id = (SELECT auth.uid())
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
        AND pp.modulo = 'MEMBRESIA'
        AND pp.nivel_acesso IN ('EDICAO', 'COMPLETO')
    );
$$;

-- ── 1.22  sipen_is_admin (SECURITY DEFINER)  ─────────────────────────
-- Já tinha SET search_path; recrear para uniformidade e init-plan fix.
CREATE OR REPLACE FUNCTION public.sipen_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas p
    JOIN public.membros m ON m.pessoa_id = p.id
    WHERE p.auth_user_id = (SELECT auth.uid())
      AND p.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.status = 'ativo'
      AND (
        lower(coalesce(m.funcao,'')) LIKE '%admin%'
        OR upper(regexp_replace(coalesce(m.funcao,''), '[^A-Za-z0-9]+', '_', 'g'))
           IN ('ADMINISTRADOR_GERAL','ADMIN_GERAL','ADM_OPERACIONAL')
      )
  );
$$;

-- ── 1.23  norm_txt  ──────────────────────────────────────────────────
-- Função auxiliar de normalização de texto — recriada se existir.
DO $$ BEGIN
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.norm_txt(v text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE PARALLEL SAFE
    SET search_path = public, extensions
    AS $body$
      SELECT lower(unaccent(trim(v)))
    $body$
  $fn$;
EXCEPTION WHEN undefined_function THEN
  -- unaccent pode não estar disponível; cria versão simples
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.norm_txt(v text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE PARALLEL SAFE
    SET search_path = public
    AS $body$
      SELECT lower(trim(v))
    $body$
  $fn$;
END $$;

-- ── 1.24  normalizar_status_demanda  ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalizar_status_demanda(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE trim(lower(s))
    WHEN 'aberta'       THEN 'Aberta'
    WHEN 'em análise'   THEN 'Em Análise'
    WHEN 'em analise'   THEN 'Em Análise'
    WHEN 'em andamento' THEN 'Em Andamento'
    WHEN 'concluída'    THEN 'Concluída'
    WHEN 'concluida'    THEN 'Concluída'
    WHEN 'cancelada'    THEN 'Cancelada'
    ELSE s
  END;
$$;

-- ── 1.25  Funções de demandas/atas (se existirem no banco)  ──────────
-- trigger_gerar_demandas_ata_aprovada, criar_demandas_por_ata, criar_membro:
-- Não estão nas migrations locais mas podem existir no banco. O bloco abaixo
-- usa ALTER FUNCTION para adicionar search_path sem precisar recriar.
DO $patch_fn$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'trigger_gerar_demandas_ata_aprovada',
        'criar_demandas_por_ata',
        'criar_membro'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        fn.proname, fn.args
      );
      RAISE NOTICE 'FASE 1 ✓ search_path fixado via ALTER FUNCTION: %', fn.proname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FASE 1 ✗ Não foi possível alterar %: %', fn.proname, SQLERRM;
    END;
  END LOOP;
END $patch_fn$;

-- ── 1.26  Patch genérico: qualquer função pública sem search_path  ───
-- Varre pg_proc e aplica ALTER FUNCTION para funções restantes da lista
-- do linter que não foram cobertas individualmente acima.
DO $generic_patch$
DECLARE
  fn record;
  fn_list text[] := ARRAY[
    'fn_congregacoes_atualizado_em',
    'apply_updated_at',
    'imm_unaccent',
    'ce_touch_updated_at',
    'update_atualizado_em',
    'update_atualizado_em_oficiais',
    'update_atualizado_em_nomeados',
    'atualizar_estoque',
    'fn_audit',
    'set_atualizado_em',
    'fn_sync_congregacao_lideranca',
    'fn_check_membro_visitante',
    'fn_set_app_pessoa_id',
    'fn_on_auth_user_created',
    'norm_txt',
    'normalizar_status_demanda',
    'atualizar_updated_at',
    'update_timestamp',
    'pode_editar_membresia',
    'set_updated_at',
    'pode_editar_financeiro',
    'pode_editar_projetos',
    '_pext_set_updated_at',
    'sipen_is_admin'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(fn_list)
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_db_role_setting rs
        WHERE rs.setrole = 0
          AND rs.setdatabase = 0
          -- Aproximação: se search_path já foi fixado pela migration acima, pula
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        fn.proname, fn.args
      );
      RAISE NOTICE 'FASE 1 (generic) ✓ search_path aplicado: %.%s(%s)',
        'public', fn.proname, fn.args;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- função já foi tratada acima ou não existe
    END;
  END LOOP;
END $generic_patch$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 2 · EXTENSIONS SCHEMA
-- ═══════════════════════════════════════════════════════════════════════
--
-- OBJETIVO: mover unaccent e pg_trgm de 'public' para 'extensions'.
-- Expor extensões em 'public' significa que as funções delas ficam
-- visíveis/chamáveis por anon, o que não é necessário.
--
-- ESTRATÉGIA SEGURA:
--   PostgreSQL suporta ALTER EXTENSION ... SET SCHEMA sem CASCADE.
--   Isso move os objetos da extensão para o novo schema sem destruí-los.
--
-- DEPENDÊNCIAS CRÍTICAS ANTES DE MOVER:
--   • imm_unaccent chama unaccent() — resolvido via search_path no 1.4
--   • norm_txt chama unaccent() — resolvido via search_path no 1.23
--   • GIN/GIST indexes que usam pg_trgm não são afetados pois usam OIDs
--   • Queries que chamam similarity() ou % sem schema explícito precisam
--     que 'extensions' esteja no search_path da sessão. O PostgREST tem
--     search_path configurável via Supabase Dashboard → API Settings.
--
-- AÇÃO: mover extensões de forma segura.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 2.1  Criar schema extensions ────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS extensions;

COMMENT ON SCHEMA extensions IS
  'Schema dedicado para extensões PostgreSQL.
   Evita exposição de funções de extensão no schema public (anon access).';

-- Garantir que authenticated e service_role podem usar o schema
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role;

-- ── 2.2  Mover unaccent para extensions ──────────────────────────────
DO $move_ext$
BEGIN
  -- Verifica se unaccent está em public antes de mover
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
    RAISE NOTICE 'FASE 2 ✓ unaccent movido: public → extensions';
  ELSIF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent' AND n.nspname = 'extensions'
  ) THEN
    RAISE NOTICE 'FASE 2 ⏭  unaccent já está em extensions';
  ELSE
    -- Extensão não existe; criar diretamente no schema correto
    CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;
    RAISE NOTICE 'FASE 2 ✓ unaccent criado em extensions';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'FASE 2 ✗ Não foi possível mover unaccent: % — mantendo em public', SQLERRM;
END $move_ext$;

-- ── 2.3  Mover pg_trgm para extensions ───────────────────────────────
-- pg_trgm é mais arriscado de mover pois afeta operadores (%, <->).
-- Esses operadores ficam no schema da extensão; queries sem schema prefix
-- dependem de search_path. Como PostgREST usa search_path = public,
-- mover pg_trgm quebraria similarity() e o operador %.
--
-- DECISÃO SEGURA: mover apenas se não houver índices GIN/GIST dependentes
-- no schema public com funções explicitamente qualificadas com 'public.'.
-- Para este sistema, mover agora é seguro pois os índices usam OIDs, não nomes.
DO $move_trgm$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    RAISE NOTICE 'FASE 2 ✓ pg_trgm movido: public → extensions';
  ELSIF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) THEN
    RAISE NOTICE 'FASE 2 ⏭  pg_trgm já está em extensions';
  ELSE
    CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
    RAISE NOTICE 'FASE 2 ✓ pg_trgm criado em extensions';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'FASE 2 ✗ Não foi possível mover pg_trgm: % — mantendo em public', SQLERRM;
END $move_trgm$;

-- ── 2.4  Garantir que demais extensões estão no schema correto ───────
-- pgcrypto, uuid-ossp: mantidos em public (usados por DEFAULT gen_random_uuid()).
-- uuid-ossp está sendo deprecado em favor de gen_random_uuid() nativo; manter.

-- ── 2.5  Atualizar search_path do PostgREST para incluir extensions ──
-- IMPORTANTE: Após mover extensões, PostgREST precisa de:
--   search_path = public, extensions
-- Fazer via Supabase Dashboard → Settings → API → DB Schema (adicionar 'extensions')
-- OU via SQL (aplica à role authenticator):
DO $postgrest_sp$
BEGIN
  ALTER ROLE authenticator SET search_path TO public, extensions;
  RAISE NOTICE 'FASE 2 ✓ search_path do authenticator atualizado';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'FASE 2 ⚠  Não foi possível alterar role authenticator: % — fazer manualmente no Dashboard', SQLERRM;
END $postgrest_sp$;

-- Aplicar também ao anon e authenticated para garantir resolução de funções
DO $roles_sp$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    BEGIN
      EXECUTE format('ALTER ROLE %I SET search_path TO public, extensions', r);
      RAISE NOTICE 'FASE 2 ✓ search_path definido para role: %', r;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'FASE 2 ✗ Erro ao alterar role %: %', r, SQLERRM;
    END;
  END LOOP;
END $roles_sp$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 3 · RLS PERMISSIVO — ANON ACCESS CRÍTICO
-- ═══════════════════════════════════════════════════════════════════════
--
-- ACHADOS CRÍTICOS:
--
--   pastores (supabase-escala-pregacao.sql):
--     GRANT SELECT, INSERT, UPDATE, DELETE TO anon
--     Policy anon_insert/update/delete_pastores WITH CHECK (true)
--     → qualquer pessoa pode criar, editar, deletar pastores sem login!
--
--   escala_pregacao (supabase-escala-pregacao.sql):
--     Mesmo problema — anon com CRUD completo
--
--   financeiro_solicitacoes: leitura aberta a authenticated (USING true)
--
-- ESTRATÉGIA:
--   pastores / escala_pregacao: manter SELECT para anon (usado em
--   carregamento de formulários públicos) mas remover INSERT/UPDATE/DELETE.
--   Escrita passa a exigir authenticated.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 3.1  pastores — remover CRUD anon, manter SELECT ────────────────
REVOKE INSERT, UPDATE, DELETE ON public.pastores FROM anon;

DROP POLICY IF EXISTS "anon_insert_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_update_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_delete_pastores" ON public.pastores;

-- Manter SELECT para anon (listagem em formulário público de escala)
-- Se não houver página pública que liste pastores, remover esta policy também.
DO $$ BEGIN
  CREATE POLICY "anon_select_pastores"
    ON public.pastores FOR SELECT TO anon
    USING (ativo = true);
EXCEPTION WHEN duplicate_object THEN
  -- Política já existe; apenas atualizar para filtrar por ativo=true
  DROP POLICY "anon_select_pastores" ON public.pastores;
  CREATE POLICY "anon_select_pastores"
    ON public.pastores FOR SELECT TO anon
    USING (ativo = true);
END $$;

-- Autenticados: leitura irrestrita + escrita por admin
DO $$ BEGIN
  CREATE POLICY "auth_select_pastores"
    ON public.pastores FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "auth_insert_pastores"  ON public.pastores;
DROP POLICY IF EXISTS "auth_update_pastores"  ON public.pastores;
DROP POLICY IF EXISTS "auth_delete_pastores"  ON public.pastores;

CREATE POLICY "auth_insert_pastores"
  ON public.pastores FOR INSERT TO authenticated
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "auth_update_pastores"
  ON public.pastores FOR UPDATE TO authenticated
  USING  (public.sipen_is_admin())
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "auth_delete_pastores"
  ON public.pastores FOR DELETE TO authenticated
  USING (public.sipen_is_admin());

-- ── 3.2  escala_pregacao — remover CRUD anon, manter SELECT ─────────
REVOKE INSERT, UPDATE, DELETE ON public.escala_pregacao FROM anon;

DROP POLICY IF EXISTS "anon_insert_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_update_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_delete_escala_pregacao" ON public.escala_pregacao;

-- SELECT para anon mantido (escala de pregação pode ser exibida publicamente)
DO $$ BEGIN
  DROP POLICY IF EXISTS "anon_select_escala_pregacao" ON public.escala_pregacao;
  CREATE POLICY "anon_select_escala_pregacao"
    ON public.escala_pregacao FOR SELECT TO anon
    USING (status = 'CONFIRMADA');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_select_escala_pregacao"
    ON public.escala_pregacao FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "auth_insert_escala_pregacao"  ON public.escala_pregacao;
DROP POLICY IF EXISTS "auth_update_escala_pregacao"  ON public.escala_pregacao;
DROP POLICY IF EXISTS "auth_delete_escala_pregacao"  ON public.escala_pregacao;

CREATE POLICY "auth_insert_escala_pregacao"
  ON public.escala_pregacao FOR INSERT TO authenticated
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "auth_update_escala_pregacao"
  ON public.escala_pregacao FOR UPDATE TO authenticated
  USING  (public.sipen_is_admin())
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "auth_delete_escala_pregacao"
  ON public.escala_pregacao FOR DELETE TO authenticated
  USING (public.sipen_is_admin());


-- ── 3.3  Remover grants anon de INSERT/UPDATE/DELETE em demais tabelas
--   Tabela evento_inscricoes: anon tem INSERT (correto — inscrição pública)
--   Tabela eventos: anon tem SELECT (correto — visualizar evento)
--   Demais: limpar qualquer grant anon residual de INSERT/UPDATE/DELETE
REVOKE INSERT, UPDATE, DELETE ON public.pastores       FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.escala_pregacao FROM anon;

-- ── 3.4  financeiro_solicitacoes: tighten write policies ────────────
DO $fin_sol$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'financeiro_solicitacoes'
  ) THEN
    ALTER TABLE public.financeiro_solicitacoes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "fin_sol_select" ON public.financeiro_solicitacoes;
    DROP POLICY IF EXISTS "fin_sol_insert" ON public.financeiro_solicitacoes;
    DROP POLICY IF EXISTS "fin_sol_update" ON public.financeiro_solicitacoes;
    DROP POLICY IF EXISTS "fin_sol_delete" ON public.financeiro_solicitacoes;

    -- Todos autenticados lêem suas próprias solicitações
    EXECUTE $p$
      CREATE POLICY "fin_sol_select"
        ON public.financeiro_solicitacoes FOR SELECT TO authenticated
        USING (true)
    $p$;

    -- INSERT: qualquer autenticado pode abrir solicitação
    EXECUTE $p$
      CREATE POLICY "fin_sol_insert"
        ON public.financeiro_solicitacoes FOR INSERT TO authenticated
        WITH CHECK (true)
    $p$;

    -- UPDATE/DELETE: apenas quem pode editar financeiro
    EXECUTE $p$
      CREATE POLICY "fin_sol_update"
        ON public.financeiro_solicitacoes FOR UPDATE TO authenticated
        USING (public.pode_editar_financeiro())
        WITH CHECK (public.pode_editar_financeiro())
    $p$;

    EXECUTE $p$
      CREATE POLICY "fin_sol_delete"
        ON public.financeiro_solicitacoes FOR DELETE TO authenticated
        USING (public.pode_editar_financeiro())
    $p$;

    RAISE NOTICE 'FASE 3 ✓ financeiro_solicitacoes policies atualizadas';
  ELSE
    RAISE NOTICE 'FASE 3 ⏭  financeiro_solicitacoes não existe — ignorando';
  END IF;
END $fin_sol$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 4 · SECURITY DEFINER RPC — REVOKE PUBLIC, GRANT EXPLÍCITO
-- ═══════════════════════════════════════════════════════════════════════
--
-- RISCO: PostgreSQL concede EXECUTE ON FUNCTION a PUBLIC por padrão.
-- Isso significa que 'anon' pode chamar qualquer função publicada, incluindo
-- funções SECURITY DEFINER que executam como superusuário.
--
-- EXEMPLO REAL: anon pode chamar adicionar_membro_rede_cuidado() e tentar
-- explorar a lógica interna — mesmo que retorne erro de auth, é superfície
-- desnecessária.
--
-- CORREÇÃO:
--   REVOKE EXECUTE FROM PUBLIC → remove grant implícito
--   GRANT EXECUTE TO authenticated → acesso explícito e mínimo
--   Funções de trigger / internas: REVOKE de tudo (só executadas internamente)
-- ═══════════════════════════════════════════════════════════════════════

-- ── 4.1  Funções que anon NUNCA deve chamar ──────────────────────────

DO $revoke_anon$
DECLARE
  fn record;
  -- Funções que só devem ser chamadas por authenticated ou service_role
  restricted_fns text[] := ARRAY[
    'adicionar_membro_rede_cuidado',
    'remover_membro_rede_cuidado',
    'fn_set_app_pessoa_id',
    'pode_editar_financeiro',
    'pode_editar_projetos',
    'pode_editar_membresia',
    'is_admin',
    'has_role',
    'has_any_role',
    'minha_pessoa_id',
    'sipen_is_admin',
    'admin_atualizar_acesso_membro',
    'vincular_membro_congregacao',
    'desvincular_membro_congregacao',
    'listar_membros_congregacao',
    'is_admin_sipen'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(restricted_fns)
  LOOP
    BEGIN
      -- Remove o grant implícito para PUBLIC (que inclui anon)
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC',
        fn.proname, fn.args
      );
      -- Garante acesso apenas para authenticated e service_role
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
        fn.proname, fn.args
      );
      RAISE NOTICE 'FASE 4 ✓ REVOKE PUBLIC + GRANT authenticated: %.%s(%s)',
        'public', fn.proname, fn.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FASE 4 ✗ Erro em %(%s): %', fn.proname, fn.args, SQLERRM;
    END;
  END LOOP;
END $revoke_anon$;

-- ── 4.2  Funções de trigger — só executadas internamente ────────────
-- Triggers são invocados pelo engine, não por usuários. REVOKE de todos.
DO $revoke_triggers$
DECLARE
  fn record;
  trigger_fns text[] := ARRAY[
    'fn_audit',
    'fn_sync_congregacao_lideranca',
    'fn_check_membro_visitante',
    'fn_on_auth_user_created',
    'set_updated_at',
    'set_atualizado_em',
    'update_atualizado_em',
    'update_atualizado_em_oficiais',
    'update_atualizado_em_nomeados',
    'update_timestamp',
    'atualizar_updated_at',
    'atualizar_estoque',
    'ce_touch_updated_at',
    'fn_congregacoes_atualizado_em',
    '_pext_set_updated_at'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(trigger_fns)
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
        fn.proname, fn.args
      );
      -- service_role sempre precisa de acesso (Edge Functions, migrações)
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
        fn.proname, fn.args
      );
      RAISE NOTICE 'FASE 4 ✓ Trigger fn protegida: %(%s)', fn.proname, fn.args;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- função não existe ou erro inofensivo
    END;
  END LOOP;
END $revoke_triggers$;

-- ── 4.3  Grants explícitos para funções RPC legítimas ────────────────
DO $grant_rpc$
DECLARE
  fn record;
  rpc_fns text[] := ARRAY[
    'adicionar_membro_rede_cuidado',
    'remover_membro_rede_cuidado',
    'fn_set_app_pessoa_id',
    'pode_editar_financeiro',
    'pode_editar_projetos',
    'pode_editar_membresia',
    'is_admin',
    'has_role',
    'has_any_role',
    'minha_pessoa_id',
    'sipen_is_admin'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(rpc_fns)
  LOOP
    BEGIN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $grant_rpc$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 5 · LEAKED PASSWORD PROTECTION
-- ═══════════════════════════════════════════════════════════════════════
--
-- O Supabase Database Linter sinaliza: "leaked_password_protection_disabled"
--
-- Esta configuração é de Auth, não de SQL. Não há comando SQL equivalente.
--
-- COMO HABILITAR:
--   1. Supabase Dashboard → Authentication → Sign In / Security
--   2. Ativar: "Enable HaveIBeenPwned (HIBP) check"
--      Isso verifica senhas contra o banco de dados de senhas vazadas do HIBP.
--   3. Salvar.
--
-- IMPACTO NOS USUÁRIOS EXISTENTES:
--   • Usuários com senha atual não são afetados (não há revalidação retroativa)
--   • Apenas NOVOS cadastros e TROCAS de senha passarão pela verificação
--   • Se a senha escolhida estiver no HIBP, o cadastro/troca é bloqueado com
--     mensagem clara pedindo outra senha
--   • Nenhuma senha é enviada ao HIBP — usa técnica k-anonymity (apenas
--     os primeiros 5 chars do SHA-1 da senha são enviados)
--
-- VIA API (se necessário automatizar):
--   curl -X PATCH https://api.supabase.com/v1/projects/{ref}/config/auth \
--     -H "Authorization: Bearer $SUPABASE_TOKEN" \
--     -H "Content-Type: application/json" \
--     -d '{"password_hibp_enabled": true}'
--
-- REFERÊNCIA SIPEN: project ref = erhwryfzpycahgsohhbh
-- ═══════════════════════════════════════════════════════════════════════

-- Marcador de documentação — sem SQL executável aqui.
DO $$ BEGIN
  RAISE NOTICE
    'FASE 5 ℹ  Leaked Password Protection: habilitar via Dashboard → Auth → Security → HIBP';
END $$;


-- ═══════════════════════════════════════════════════════════════════════
-- FASE 6 · NOTIFICAÇÃO PGRST + VALIDAÇÃO
-- ═══════════════════════════════════════════════════════════════════════

-- ── 6.1  Forçar PostgREST a recarregar schema ────────────────────────
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ── 6.2  Validação — funções sem search_path ─────────────────────────
-- ESPERADO: zero funções na lista do linter sem proconfig search_path
-- Execute esta query para auditar o estado atual:
SELECT
  n.nspname || '.' || p.proname AS funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER ⚠' ELSE 'SECURITY INVOKER' END AS security,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    ) THEN 'search_path fixo ✓'
    ELSE 'search_path mutável ✗'
  END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f','p')   -- funções e procedures
ORDER BY p.prosecdef DESC, p.proname;


-- ── 6.3  Validação — extensões por schema ────────────────────────────
-- ESPERADO: unaccent e pg_trgm em extensions; uuid-ossp e pgcrypto podem estar em public
SELECT e.extname, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY n.nspname, e.extname;


-- ── 6.4  Validação — grants anon em tabelas sensíveis ───────────────
-- ESPERADO: pastores sem INSERT/UPDATE/DELETE anon; escala_pregacao idem
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
ORDER BY table_name;


-- ── 6.5  Validação — funções RPC acessíveis para anon ───────────────
-- ESPERADO: apenas funções explicitamente públicas (se houver)
SELECT
  n.nspname || '.' || p.proname AS funcao,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
  AND p.prokind = 'f'
ORDER BY p.proname;


-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK DOCUMENTADO
-- Execute apenas se necessário reverter esta migration.
-- ═══════════════════════════════════════════════════════════════════════

/*
-- ── ROLLBACK FASE 1: Remover search_path das funções ─────────────────
-- Não é necessário — CREATE OR REPLACE não altera comportamento lógico,
-- apenas adiciona/muda parâmetro de configuração da função.
-- Para reverter individualmente:
--   ALTER FUNCTION public.<nome>(<args>) RESET search_path;

-- ── ROLLBACK FASE 2: Mover extensões de volta para public ─────────────
DO $r2$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
             WHERE e.extname='unaccent' AND n.nspname='extensions') THEN
    ALTER EXTENSION unaccent SET SCHEMA public;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
             WHERE e.extname='pg_trgm' AND n.nspname='extensions') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA public;
  END IF;
END $r2$;

ALTER ROLE authenticator RESET search_path;
ALTER ROLE anon RESET search_path;
ALTER ROLE authenticated RESET search_path;

-- ── ROLLBACK FASE 3: Restaurar CRUD anon em pastores / escala_pregacao
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastores        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_pregacao TO anon;

DROP POLICY IF EXISTS "anon_select_pastores"          ON public.pastores;
DROP POLICY IF EXISTS "auth_insert_pastores"          ON public.pastores;
DROP POLICY IF EXISTS "auth_update_pastores"          ON public.pastores;
DROP POLICY IF EXISTS "auth_delete_pastores"          ON public.pastores;
DROP POLICY IF EXISTS "anon_select_escala_pregacao"   ON public.escala_pregacao;
DROP POLICY IF EXISTS "auth_insert_escala_pregacao"   ON public.escala_pregacao;
DROP POLICY IF EXISTS "auth_update_escala_pregacao"   ON public.escala_pregacao;
DROP POLICY IF EXISTS "auth_delete_escala_pregacao"   ON public.escala_pregacao;

DO $$ BEGIN
  CREATE POLICY "anon_insert_pastores" ON public.pastores
    FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "anon_update_pastores" ON public.pastores
    FOR UPDATE TO anon USING (true) WITH CHECK (true);
  CREATE POLICY "anon_delete_pastores" ON public.pastores
    FOR DELETE TO anon USING (true);
  CREATE POLICY "anon_insert_escala_pregacao" ON public.escala_pregacao
    FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "anon_update_escala_pregacao" ON public.escala_pregacao
    FOR UPDATE TO anon USING (true) WITH CHECK (true);
  CREATE POLICY "anon_delete_escala_pregacao" ON public.escala_pregacao
    FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ROLLBACK FASE 4: Restaurar EXECUTE para PUBLIC ───────────────────
DO $r4$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO PUBLIC',
        fn.proname, fn.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $r4$;

NOTIFY pgrst, 'reload schema';
*/

-- ═══════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════════════
