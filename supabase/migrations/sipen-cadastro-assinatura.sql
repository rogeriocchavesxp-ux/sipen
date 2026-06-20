-- ═══════════════════════════════════════════════════════════════════
--  sipen-cadastro-assinatura.sql
--  Cadastro de clientes e assinaturas do SIPEN (produto SaaS)
--  Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── sipen_clientes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sipen_clientes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        UNIQUE, -- vinculado a auth.users.id após signup

  -- Etapa 1: Cadastro gratuito
  nome            text        NOT NULL,
  email           text        NOT NULL UNIQUE,
  nome_inst       text,               -- nome da igreja / instituição
  cidade_uf       text,               -- "São Paulo / SP"
  aceite_termos   bool        NOT NULL DEFAULT false,
  aceite_politica bool        NOT NULL DEFAULT false,

  -- Etapa 2: Dados de assinatura (preenchidos no upgrade)
  nome_completo   text,
  telefone        text,
  tipo_doc        text        CHECK (tipo_doc IS NULL OR tipo_doc IN ('cpf','cnpj')),
  cpf_cnpj        text,
  cargo_funcao    text,
  endereco_cobr   jsonb,      -- {cep, logradouro, numero, complemento, bairro, cidade, uf}
  plano           text        NOT NULL DEFAULT 'gratuito'
                              CHECK (plano IN ('gratuito','basico','profissional','institucional')),
  forma_pagto     text,
  dados_nota      jsonb,      -- {nome_razao, cpf_cnpj_nf, email_nf}
  aceite_contrato bool        NOT NULL DEFAULT false,

  -- Status
  status_conta    text        NOT NULL DEFAULT 'ativo'
                              CHECK (status_conta IN ('ativo','pendente_pagamento','suspenso','cancelado')),
  status_assn     text        NOT NULL DEFAULT 'sem_assinatura'
                              CHECK (status_assn IN ('sem_assinatura','pendente','ativa','inadimplente','cancelada')),
  plano_ativo_em  timestamptz,
  plano_expira_em timestamptz,

  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- ─── sipen_assinaturas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sipen_assinaturas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid        NOT NULL REFERENCES sipen_clientes(id) ON DELETE CASCADE,
  plano        text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pendente'
                           CHECK (status IN ('pendente','ativa','inadimplente','cancelada')),
  valor_mensal numeric(10,2),
  forma_pagto  text,
  ref_pagto    text,       -- ID no gateway de pagamento (futuro)
  notas        text,
  iniciada_em  timestamptz DEFAULT now(),
  expira_em    timestamptz,
  cancelada_em timestamptz,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE sipen_clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sipen_assinaturas ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode se registrar (INSERT público)
CREATE POLICY "anon_pode_registrar" ON sipen_clientes
  FOR INSERT TO anon WITH CHECK (true);

-- Usuário vê e edita apenas seu próprio registro
CREATE POLICY "cliente_proprio_select" ON sipen_clientes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "cliente_proprio_update" ON sipen_clientes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Assinaturas: dono lê, só admin atualiza (status é gerenciado no backend)
CREATE POLICY "cliente_assn_propria" ON sipen_assinaturas
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT id FROM sipen_clientes WHERE user_id = auth.uid()));

CREATE POLICY "anon_pode_inserir_assn" ON sipen_assinaturas
  FOR INSERT TO anon WITH CHECK (true);

-- ─── Trigger: atualiza atualizado_em ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_sipen_clientes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sipen_clientes_updated_at ON sipen_clientes;
CREATE TRIGGER trg_sipen_clientes_updated_at
  BEFORE UPDATE ON sipen_clientes
  FOR EACH ROW EXECUTE FUNCTION fn_sipen_clientes_updated_at();

-- ─── Índices ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sc_email     ON sipen_clientes(email);
CREATE INDEX IF NOT EXISTS idx_sc_user_id   ON sipen_clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_sc_plano     ON sipen_clientes(plano);
CREATE INDEX IF NOT EXISTS idx_sc_status_a  ON sipen_clientes(status_assn);
CREATE INDEX IF NOT EXISTS idx_sa_cliente   ON sipen_assinaturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sa_status    ON sipen_assinaturas(status);
