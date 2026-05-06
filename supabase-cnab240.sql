-- ═══════════════════════════════════════════════════════
-- SIPEN — CNAB 240 Bradesco
-- Executar no SQL Editor do Supabase antes de usar o módulo.
-- ═══════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.financeiro_solicitacoes
  ADD COLUMN IF NOT EXISTS favorecido_nome       TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_cpf_cnpj   TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_banco      TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_agencia    TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_agencia_dv TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_conta      TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_conta_dv   TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_pix_chave  TEXT,
  ADD COLUMN IF NOT EXISTS favorecido_pix_tipo   TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras         TEXT,
  ADD COLUMN IF NOT EXISTS tipo_operacao         TEXT;

CREATE TABLE IF NOT EXISTS public.cnab_remessas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_sequencial INTEGER NOT NULL,
  descricao         TEXT,
  banco             TEXT NOT NULL DEFAULT '237',
  agencia_empresa   TEXT NOT NULL,
  conta_empresa     TEXT NOT NULL,
  conta_empresa_dv  TEXT NOT NULL,
  cnpj_empresa      TEXT NOT NULL,
  nome_empresa      TEXT NOT NULL,
  total_pagamentos  INTEGER DEFAULT 0,
  valor_total       NUMERIC(15,2) DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'gerada'
                    CHECK (status IN ('gerada','enviada','processada','erro')),
  conteudo_arquivo  TEXT,
  created_by        UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cnab_remessa_itens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remessa_id        UUID NOT NULL REFERENCES public.cnab_remessas(id) ON DELETE CASCADE,
  solicitacao_id    UUID REFERENCES public.financeiro_solicitacoes(id),
  lote              INTEGER NOT NULL,
  numero_seq_lote   INTEGER NOT NULL,
  tipo_operacao     TEXT NOT NULL,
  favorecido_nome   TEXT,
  valor             NUMERIC(12,2) NOT NULL,
  vencimento        DATE,
  status_retorno    TEXT DEFAULT 'pendente',
  codigo_retorno    TEXT,
  descricao_retorno TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cnab_retornos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remessa_id        UUID REFERENCES public.cnab_remessas(id),
  nome_arquivo      TEXT,
  total_registros   INTEGER DEFAULT 0,
  total_pagos       INTEGER DEFAULT 0,
  total_rejeitados  INTEGER DEFAULT 0,
  valor_total_pago  NUMERIC(15,2) DEFAULT 0,
  conteudo_arquivo  TEXT,
  importado_por     UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cnab_retorno_itens (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retorno_id           UUID NOT NULL REFERENCES public.cnab_retornos(id) ON DELETE CASCADE,
  remessa_item_id      UUID REFERENCES public.cnab_remessa_itens(id),
  solicitacao_id       UUID REFERENCES public.financeiro_solicitacoes(id),
  numero_seq_lote      INTEGER,
  ocorrencia           TEXT,
  descricao_ocorrencia TEXT,
  valor_pago           NUMERIC(12,2),
  data_pagamento       DATE,
  status               TEXT NOT NULL CHECK (status IN ('pago','agendado','rejeitado','inconsistencia','saldo_insuficiente','conta_invalida','pix_invalido','erro_banco','liquidado')),
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cnab_config_empresa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco         TEXT NOT NULL DEFAULT '237',
  agencia       TEXT NOT NULL,
  agencia_dv    TEXT,
  conta         TEXT NOT NULL,
  conta_dv      TEXT NOT NULL,
  cnpj          TEXT NOT NULL,
  nome_empresa  TEXT NOT NULL,
  convenio      TEXT,
  ativo         BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_cnab_remessas_upd ON public.cnab_remessas;
CREATE TRIGGER trg_cnab_remessas_upd BEFORE UPDATE ON public.cnab_remessas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cnab_config_empresa_upd ON public.cnab_config_empresa;
CREATE TRIGGER trg_cnab_config_empresa_upd BEFORE UPDATE ON public.cnab_config_empresa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.pode_editar_financeiro()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    public.is_admin()
    OR public.has_any_role(ARRAY['admin','tesoureiro'])
    OR EXISTS (
      SELECT 1
      FROM public.perfis_permissoes pp
      JOIN public.perfis pf ON pf.id = pp.perfil_id
      JOIN public.user_profiles up ON up.role = pf.nome
      WHERE up.id = auth.uid()
        AND pp.modulo = 'FINANCEIRO'
        AND pp.nivel_acesso IN ('EDICAO', 'COMPLETO')
    );
$$;

ALTER TABLE public.cnab_remessas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_remessa_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_retornos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_retorno_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_config_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cnab_select ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_write ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_upd ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_del ON public.cnab_remessas;
CREATE POLICY cnab_select ON public.cnab_remessas FOR SELECT TO authenticated USING (true);
CREATE POLICY cnab_write  ON public.cnab_remessas FOR INSERT TO authenticated WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_upd    ON public.cnab_remessas FOR UPDATE TO authenticated USING (public.pode_editar_financeiro()) WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_del    ON public.cnab_remessas FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS cnab_itens_select ON public.cnab_remessa_itens;
DROP POLICY IF EXISTS cnab_itens_write ON public.cnab_remessa_itens;
DROP POLICY IF EXISTS cnab_itens_upd ON public.cnab_remessa_itens;
DROP POLICY IF EXISTS cnab_itens_del ON public.cnab_remessa_itens;
CREATE POLICY cnab_itens_select ON public.cnab_remessa_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY cnab_itens_write  ON public.cnab_remessa_itens FOR INSERT TO authenticated WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_itens_upd    ON public.cnab_remessa_itens FOR UPDATE TO authenticated USING (public.pode_editar_financeiro()) WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_itens_del    ON public.cnab_remessa_itens FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS cnab_ret_select ON public.cnab_retornos;
DROP POLICY IF EXISTS cnab_ret_write ON public.cnab_retornos;
DROP POLICY IF EXISTS cnab_ret_upd ON public.cnab_retornos;
DROP POLICY IF EXISTS cnab_ret_del ON public.cnab_retornos;
CREATE POLICY cnab_ret_select ON public.cnab_retornos FOR SELECT TO authenticated USING (true);
CREATE POLICY cnab_ret_write  ON public.cnab_retornos FOR INSERT TO authenticated WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_ret_upd    ON public.cnab_retornos FOR UPDATE TO authenticated USING (public.pode_editar_financeiro()) WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_ret_del    ON public.cnab_retornos FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS cnab_ret_itens_select ON public.cnab_retorno_itens;
DROP POLICY IF EXISTS cnab_ret_itens_write ON public.cnab_retorno_itens;
DROP POLICY IF EXISTS cnab_ret_itens_upd ON public.cnab_retorno_itens;
DROP POLICY IF EXISTS cnab_ret_itens_del ON public.cnab_retorno_itens;
CREATE POLICY cnab_ret_itens_select ON public.cnab_retorno_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY cnab_ret_itens_write  ON public.cnab_retorno_itens FOR INSERT TO authenticated WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_ret_itens_upd    ON public.cnab_retorno_itens FOR UPDATE TO authenticated USING (public.pode_editar_financeiro()) WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_ret_itens_del    ON public.cnab_retorno_itens FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS cnab_cfg_select ON public.cnab_config_empresa;
DROP POLICY IF EXISTS cnab_cfg_write ON public.cnab_config_empresa;
DROP POLICY IF EXISTS cnab_cfg_upd ON public.cnab_config_empresa;
DROP POLICY IF EXISTS cnab_cfg_del ON public.cnab_config_empresa;
CREATE POLICY cnab_cfg_select ON public.cnab_config_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY cnab_cfg_write  ON public.cnab_config_empresa FOR INSERT TO authenticated WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_cfg_upd    ON public.cnab_config_empresa FOR UPDATE TO authenticated USING (public.pode_editar_financeiro()) WITH CHECK (public.pode_editar_financeiro());
CREATE POLICY cnab_cfg_del    ON public.cnab_config_empresa FOR DELETE TO authenticated USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_remessas       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_remessa_itens  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_retornos       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_retorno_itens  TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.cnab_config_empresa TO authenticated;

REVOKE ALL ON public.cnab_remessas       FROM anon;
REVOKE ALL ON public.cnab_remessa_itens  FROM anon;
REVOKE ALL ON public.cnab_retornos       FROM anon;
REVOKE ALL ON public.cnab_retorno_itens  FROM anon;
REVOKE ALL ON public.cnab_config_empresa FROM anon;

COMMIT;
