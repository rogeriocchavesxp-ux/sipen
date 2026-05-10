-- ══════════════════════════════════════════════════════════════════════
-- SIPEN V3 — Ajustes Incrementais e Correções Arquiteturais
-- Estratégia: ALTER TABLE incremental, sem destruição de dados
-- Gerado em: 2026-04-21
-- Executar no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 1: TABELA DE PERFIS (base para RLS diferenciado)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa_id  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  role       text NOT NULL DEFAULT 'viewer'
             CHECK (role IN ('admin','secretaria','pastor','tesoureiro','lider_pg','viewer')),
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CALL public.apply_updated_at('user_profiles');

CREATE INDEX IF NOT EXISTS idx_user_profiles_pessoa ON public.user_profiles(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_role   ON public.user_profiles(role);


-- Funções auxiliares de permissão (SECURITY DEFINER = executa como dono, sem expor a tabela)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = required_role AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = ANY(required_roles) AND ativo = true
  )
$$;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 2: ENABLE ROW LEVEL SECURITY nas tabelas que estavam faltando
-- (políticas existiam mas eram inativas sem ENABLE)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.congregacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pgs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_participantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congregacao_cultos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudos_pgs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_itens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;


-- Políticas básicas para as tabelas sem policies (pg_participantes, estoque_movimentacoes)
DO $pol$ BEGIN
  -- pg_participantes
  EXECUTE 'CREATE POLICY "auth_select_pg_participantes" ON public.pg_participantes FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY "auth_insert_pg_participantes" ON public.pg_participantes FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "auth_update_pg_participantes" ON public.pg_participantes FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "auth_delete_pg_participantes" ON public.pg_participantes FOR DELETE TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY "service_all_pg_participantes" ON public.pg_participantes FOR ALL TO service_role USING (true) WITH CHECK (true)';
  -- estoque_movimentacoes
  EXECUTE 'CREATE POLICY "auth_select_estoque_movimentacoes" ON public.estoque_movimentacoes FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY "auth_insert_estoque_movimentacoes" ON public.estoque_movimentacoes FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "service_all_estoque_movimentacoes" ON public.estoque_movimentacoes FOR ALL TO service_role USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL;
END $pol$;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 3: CAMPOS DE AUDITORIA FALTANTES
-- ══════════════════════════════════════════════════════════════════════

-- pessoas: adicionar updated_by
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- membros: sem created_by/updated_by
ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- oficiais: sem created_by/updated_by
ALTER TABLE public.oficiais
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- visitantes: sem created_by/updated_by
ALTER TABLE public.visitantes
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- nomeados: sem deleted_at, sem created_by/updated_by
ALTER TABLE public.nomeados
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_deleted     ON public.nomeados(deleted_at) WHERE deleted_at IS NULL;

-- financeiro: sem deleted_at, sem responsavel_id
ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS deleted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovado_por   uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by     uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financeiro_responsavel ON public.financeiro(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_deleted     ON public.financeiro(deleted_at) WHERE deleted_at IS NULL;

-- contratados: sem created_by/updated_by
ALTER TABLE public.contratados
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- pgs: sem created_by/updated_by
ALTER TABLE public.pgs
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- estudos_pgs: sem deleted_at
ALTER TABLE public.estudos_pgs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_estudos_deleted ON public.estudos_pgs(deleted_at) WHERE deleted_at IS NULL;

-- congregacao_cultos: sem deleted_at
ALTER TABLE public.congregacao_cultos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cultos_deleted ON public.congregacao_cultos(deleted_at) WHERE deleted_at IS NULL;

-- pg_participantes: sem updated_at
ALTER TABLE public.pg_participantes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CALL public.apply_updated_at('pg_participantes');


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 4: OFICIAIS — vínculo com congregação (FK formal)
-- ══════════════════════════════════════════════════════════════════════

-- Um oficial (pastor/presbítero/diácono) deve ter congregação de atuação
ALTER TABLE public.oficiais
  ADD COLUMN IF NOT EXISTS congregacao_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oficiais_congregacao ON public.oficiais(congregacao_id) WHERE congregacao_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 5: NOMEADOS — vínculo com congregação
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.nomeados
  ADD COLUMN IF NOT EXISTS congregacao_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_congregacao ON public.nomeados(congregacao_id) WHERE congregacao_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 6: CONTRATADOS — corrigir arquitetura CTI
-- A coluna nome duplica dados já em pessoas. Estratégia: manter por
-- compatibilidade, mas forçar pessoa_id para novos registros.
-- ══════════════════════════════════════════════════════════════════════

-- Verificar antes de executar o step final:
-- SELECT id, nome, pessoa_id FROM public.contratados WHERE pessoa_id IS NULL;

-- Para contratados sem pessoa_id, criar pessoas automaticamente e vincular
DO $$
DECLARE r RECORD;
        new_pessoa_id uuid;
BEGIN
  FOR r IN SELECT id, nome FROM public.contratados WHERE pessoa_id IS NULL LOOP
    INSERT INTO public.pessoas (nome, created_at, updated_at)
    VALUES (r.nome, now(), now())
    RETURNING id INTO new_pessoa_id;

    UPDATE public.contratados SET pessoa_id = new_pessoa_id WHERE id = r.id;
  END LOOP;
END $$;

-- Depois de confirmar que todos têm pessoa_id, adicionar NOT NULL constraint
-- (deixado como passo manual para validação)
-- ALTER TABLE public.contratados ALTER COLUMN pessoa_id SET NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 7: ESTOQUE_ITENS — padronizar status (ativo boolean → status text)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.estoque_itens
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('ativo','inativo','descontinuado'));

-- Migrar valor de ativo para status
UPDATE public.estoque_itens
SET status = CASE WHEN ativo = true THEN 'ativo' ELSE 'inativo' END
WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_estoque_status ON public.estoque_itens(status);

-- OBS: coluna 'ativo' pode ser removida em versão futura após validação frontend:
-- ALTER TABLE public.estoque_itens DROP COLUMN ativo;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 8: ENUM FINANCEIRO — adicionar 'estornado' padronizado
-- O CHECK constraint original já tem 'estornado', OK.
-- Adicionar campo 'aprovado' ao ciclo de vida
-- ══════════════════════════════════════════════════════════════════════

-- Nada a alterar no financeiro — CHECK IN já correto


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 9: AUDIT TRIGGERS para tabelas sem cobertura
-- ══════════════════════════════════════════════════════════════════════

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_oficiais
    AFTER INSERT OR UPDATE OR DELETE ON public.oficiais
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_visitantes
    AFTER INSERT OR UPDATE OR DELETE ON public.visitantes
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_nomeados
    AFTER INSERT OR UPDATE OR DELETE ON public.nomeados
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_agenda
    AFTER INSERT OR UPDATE OR DELETE ON public.agenda
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_congregacoes
    AFTER INSERT OR UPDATE OR DELETE ON public.congregacoes
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_audit_pgs
    AFTER INSERT OR UPDATE OR DELETE ON public.pgs
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit()';
EXCEPTION WHEN duplicate_object THEN NULL; END $trg$;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 10: TRIGGER auto-criação de user_profile ao registrar auth.users
-- (requer execução via Supabase Dashboard → Database → Triggers)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Executar manualmente no Dashboard ou via migration:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.fn_on_auth_user_created();


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 11: RLS DIFERENCIADO — substituir políticas genéricas
-- ══════════════════════════════════════════════════════════════════════

-- ── FINANCEIRO: apenas admin e tesoureiro gerenciam, todos autenticados lêem
DROP POLICY IF EXISTS "auth_insert_financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "auth_update_financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "auth_delete_financeiro" ON public.financeiro;

-- ── FINANCEIRO: permissivo (endurecer após popular user_profiles com admin)
DROP POLICY IF EXISTS "fin_select" ON public.financeiro;
DROP POLICY IF EXISTS "fin_insert" ON public.financeiro;
DROP POLICY IF EXISTS "fin_update" ON public.financeiro;
DROP POLICY IF EXISTS "fin_delete" ON public.financeiro;
CREATE POLICY "fin_select" ON public.financeiro FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_insert" ON public.financeiro FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fin_update" ON public.financeiro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fin_delete" ON public.financeiro FOR DELETE TO authenticated USING (true);


-- ── CONTRATOS: admin e secretaria gerenciam
DROP POLICY IF EXISTS "auth_insert_contratos" ON public.contratos;
DROP POLICY IF EXISTS "auth_update_contratos" ON public.contratos;
DROP POLICY IF EXISTS "auth_delete_contratos" ON public.contratos;

-- ── CONTRATOS: permissivo (endurecer após popular user_profiles com admin)
DROP POLICY IF EXISTS "con_select" ON public.contratos;
DROP POLICY IF EXISTS "con_insert" ON public.contratos;
DROP POLICY IF EXISTS "con_update" ON public.contratos;
DROP POLICY IF EXISTS "con_delete" ON public.contratos;
CREATE POLICY "con_select" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "con_insert" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "con_update" ON public.contratos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "con_delete" ON public.contratos FOR DELETE TO authenticated USING (true);


-- ── LOGS: somente admin pode ver
DROP POLICY IF EXISTS "auth_select_logs_sistema" ON public.logs_sistema;
DROP POLICY IF EXISTS "auth_insert_logs_sistema" ON public.logs_sistema;
DROP POLICY IF EXISTS "auth_update_logs_sistema" ON public.logs_sistema;
DROP POLICY IF EXISTS "auth_delete_logs_sistema" ON public.logs_sistema;

DROP POLICY IF EXISTS "logs_select_admin" ON public.logs_sistema;
CREATE POLICY "logs_select_admin" ON public.logs_sistema FOR SELECT TO authenticated
  USING (public.is_admin());
-- INSERT é feito por fn_audit() com SECURITY DEFINER — não precisa de policy para authenticated


-- ── USER_PROFILES: usuário vê e edita apenas o próprio; admin gerencia todos
DROP POLICY IF EXISTS "up_select"       ON public.user_profiles;
DROP POLICY IF EXISTS "up_insert_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "up_update"       ON public.user_profiles;
DROP POLICY IF EXISTS "up_delete_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "up_service"      ON public.user_profiles;
CREATE POLICY "up_select"       ON public.user_profiles FOR SELECT    TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "up_insert_admin" ON public.user_profiles FOR INSERT    TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "up_update"       ON public.user_profiles FOR UPDATE    TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "up_delete_admin" ON public.user_profiles FOR DELETE    TO authenticated
  USING (public.is_admin());
CREATE POLICY "up_service"      ON public.user_profiles FOR ALL       TO service_role
  USING (true) WITH CHECK (true);


-- ── PESSOAS: permissivo (endurecer após popular user_profiles com admin)
DROP POLICY IF EXISTS "auth_insert_pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "auth_update_pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "auth_delete_pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "pess_select" ON public.pessoas;
DROP POLICY IF EXISTS "pess_insert" ON public.pessoas;
DROP POLICY IF EXISTS "pess_update" ON public.pessoas;
DROP POLICY IF EXISTS "pess_delete" ON public.pessoas;
CREATE POLICY "pess_select" ON public.pessoas FOR SELECT TO authenticated USING (true);
CREATE POLICY "pess_insert" ON public.pessoas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pess_update" ON public.pessoas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pess_delete" ON public.pessoas FOR DELETE TO authenticated USING (true);


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 12: ÍNDICES ADICIONAIS ÚTEIS
-- ══════════════════════════════════════════════════════════════════════

-- Busca financeira por período (query mais comum em relatórios)
CREATE INDEX IF NOT EXISTS idx_financeiro_competencia ON public.financeiro(data_competencia) WHERE data_competencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_categoria   ON public.financeiro(categoria) WHERE categoria IS NOT NULL;

-- Contratos próximos do vencimento (alerta de vencimento)
CREATE INDEX IF NOT EXISTS idx_contratos_venc_status ON public.contratos(data_vencimento, status) WHERE deleted_at IS NULL;

-- Demandas por prazo (dashboard de alertas)
CREATE INDEX IF NOT EXISTS idx_demandas_prazo ON public.demandas(prazo_previsto) WHERE prazo_previsto IS NOT NULL AND status NOT IN ('Concluída','Cancelada');

-- Membros por data de ingresso (relatório de crescimento)
CREATE INDEX IF NOT EXISTS idx_membros_ingresso ON public.membros(data_ingresso) WHERE data_ingresso IS NOT NULL;

-- Pessoas por auth_user_id (lookup frequente no login)
CREATE INDEX IF NOT EXISTS idx_pessoas_auth ON public.pessoas(auth_user_id) WHERE auth_user_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 13: VIEWS ATUALIZADAS — v_oficiais com congregação
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_oficiais AS
SELECT
  o.id, o.pessoa_id, p.nome,
  o.cargo::text AS cargo,
  o.status::text AS status,
  o.posse, o.fim_mandato, o.ata, o.mandato_numero, o.emerencia_votos,
  o.area, o.obs,
  o.created_at AS criado_em,
  o.congregacao_id,
  c.nome AS congregacao
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = o.congregacao_id
WHERE o.deleted_at IS NULL AND p.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_nomeados AS
SELECT
  n.id, n.pessoa_id, p.nome,
  n.orgao_tipo, n.orgao, n.suborgao, n.cargo,
  n.data_inicio, n.data_fim, n.status,
  n.created_at AS criado_em,
  n.congregacao_id,
  c.nome AS congregacao
FROM public.nomeados n
JOIN public.pessoas p ON p.id = n.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = n.congregacao_id
WHERE n.deleted_at IS NULL;


-- v_pessoas_ativas: inclui perfil de sistema
CREATE OR REPLACE VIEW public.v_pessoas_ativas AS
SELECT
  p.id, p.nome, p.telefone, p.celular, p.email, p.foto_url,
  CASE
    WHEN o.id  IS NOT NULL THEN o.cargo::text
    WHEN m.id  IS NOT NULL THEN 'membro'
    WHEN s.id  IS NOT NULL THEN 'seminarista'
    WHEN ct.id IS NOT NULL THEN 'contratado'
    WHEN v.id  IS NOT NULL THEN 'visitante'
    ELSE 'pessoa'
  END AS vinculo_principal,
  up.role AS perfil_sistema
FROM public.pessoas p
LEFT JOIN public.oficiais     o  ON o.pessoa_id  = p.id AND o.status  IN ('ativo','especial') AND o.deleted_at  IS NULL
LEFT JOIN public.membros      m  ON m.pessoa_id  = p.id AND m.status  = 'ativo'               AND m.deleted_at  IS NULL
LEFT JOIN public.seminaristas s  ON s.pessoa_id  = p.id AND s.status  = 'ativo'               AND s.deleted_at  IS NULL
LEFT JOIN public.contratados  ct ON ct.pessoa_id = p.id AND ct.status = 'ativo'               AND ct.deleted_at IS NULL
LEFT JOIN public.visitantes   v  ON v.pessoa_id  = p.id                                        AND v.deleted_at  IS NULL
LEFT JOIN public.user_profiles up ON up.id = p.auth_user_id
WHERE p.deleted_at IS NULL
ORDER BY p.nome;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 14: FUNÇÃO DE RELATÓRIO — pessoas sem vínculo
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_pessoas_sem_vinculo AS
SELECT p.id, p.nome, p.email, p.telefone, p.created_at
FROM public.pessoas p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.membros      m  WHERE m.pessoa_id = p.id AND m.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.oficiais      o  WHERE o.pessoa_id = p.id AND o.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.visitantes    v  WHERE v.pessoa_id = p.id AND v.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.seminaristas  s  WHERE s.pessoa_id = p.id AND s.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.contratados   c  WHERE c.pessoa_id = p.id AND c.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.nomeados      n  WHERE n.pessoa_id = p.id AND n.deleted_at IS NULL)
ORDER BY p.nome;


-- ══════════════════════════════════════════════════════════════════════
-- BLOCO 15: PRIMEIRO ADMIN — inserir após criar usuário no Supabase Auth
-- Substituir 'SEU-AUTH-USER-ID' pelo UUID real do admin
-- ══════════════════════════════════════════════════════════════════════

/*
INSERT INTO public.user_profiles (id, role)
VALUES ('SEU-AUTH-USER-ID'::uuid, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
*/


-- ══════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT V3 INCREMENTAL
-- ══════════════════════════════════════════════════════════════════════
