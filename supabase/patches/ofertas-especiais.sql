-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ofertas Especiais: schema completo
-- ofertas-especiais.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Campanhas ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ofertas_especiais (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  titulo                    text NOT NULL,
  descricao                 text,
  descricao_completa        text,
  categoria                 text,
  departamento              text,
  responsavel_id            uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  responsavel_financeiro_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  imagem_url                text,

  -- Status
  status                    text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN (
      'rascunho','aguardando_aprovacao','aprovada',
      'publicada','em_andamento','meta_atingida',
      'encerrada','suspensa','cancelada'
    )),

  -- Objetivo financeiro
  meta                      numeric(12,2),
  sem_meta                  boolean NOT NULL DEFAULT false,
  valor_inicial             numeric(12,2) NOT NULL DEFAULT 0,
  pct_minimo                numeric(5,2),
  continuar_apos_meta       boolean NOT NULL DEFAULT false,
  finalidade_recursos       text,

  -- Período
  data_inicio               date,
  data_fim                  date,
  sem_data_fim              boolean NOT NULL DEFAULT false,
  data_uso_previsto         date,

  -- Destinação contábil
  centro_custo              text,
  categoria_financeira      text,
  conta_bancaria            text,
  chave_pix                 text,
  descricao_conciliacao     text,
  codigo_campanha           text UNIQUE,

  -- Publicação
  publica                   boolean NOT NULL DEFAULT false,
  exibir_arrecadado         boolean NOT NULL DEFAULT true,
  exibir_percentual         boolean NOT NULL DEFAULT true,
  exibir_qtd_contrib        boolean NOT NULL DEFAULT false,
  exibir_nomes              boolean NOT NULL DEFAULT false,
  permitir_anonimo          boolean NOT NULL DEFAULT true,
  mensagem_agradecimento    text,
  instrucoes_contribuicao   text,
  termo                     text,

  -- URL pública
  slug                      text UNIQUE,

  -- Rastreamento de aprovação
  criado_por                uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  aprovado_por              uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  aprovado_em               timestamptz,
  publicado_por             uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  publicado_em              timestamptz,
  encerrado_por             uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  encerrado_em              timestamptz,
  motivo_suspensao          text,
  motivo_cancelamento       text,

  -- Saldo remanescente
  saldo_destinacao          text,
  saldo_justificativa       text,

  -- Auditoria
  criado_em                 timestamptz NOT NULL DEFAULT now(),
  atualizado_em             timestamptz NOT NULL DEFAULT now(),
  created_by                uuid,
  igreja_id                 uuid
);

CREATE INDEX IF NOT EXISTS idx_oe_status     ON public.ofertas_especiais(status);
CREATE INDEX IF NOT EXISTS idx_oe_publica    ON public.ofertas_especiais(publica);
CREATE INDEX IF NOT EXISTS idx_oe_slug       ON public.ofertas_especiais(slug);
CREATE INDEX IF NOT EXISTS idx_oe_criado_em  ON public.ofertas_especiais(criado_em DESC);

-- ── Contribuições ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oe_contribuicoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id           uuid NOT NULL REFERENCES public.ofertas_especiais(id) ON DELETE RESTRICT,

  data                  date NOT NULL DEFAULT CURRENT_DATE,
  valor                 numeric(12,2) NOT NULL CHECK (valor > 0),
  forma                 text NOT NULL DEFAULT 'pix'
    CHECK (forma IN ('pix','transferencia','dinheiro','cartao','boleto','manual','outro')),

  -- Contribuinte
  nome_contribuinte     text,
  cpf                   text,
  telefone              text,
  email                 text,
  anonimo               boolean NOT NULL DEFAULT false,
  mensagem_publica      text,

  -- Recebimento
  conta_recebimento     text,
  comprovante_url       text,
  origem                text NOT NULL DEFAULT 'interno'
    CHECK (origem IN ('interno','publico')),

  -- Conciliação
  status_conciliacao    text NOT NULL DEFAULT 'aguardando'
    CHECK (status_conciliacao IN (
      'aguardando','confirmada','divergente','nao_localizada','cancelada'
    )),
  conciliado_por        uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  conciliado_em         timestamptz,
  lancamento_id         uuid REFERENCES public.financeiro(id) ON DELETE SET NULL,

  obs                   text,
  registrado_por        uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,

  -- Auditoria
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  igreja_id             uuid
);

CREATE INDEX IF NOT EXISTS idx_oe_contrib_campanha   ON public.oe_contribuicoes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_oe_contrib_status     ON public.oe_contribuicoes(status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_oe_contrib_origem     ON public.oe_contribuicoes(origem);
CREATE INDEX IF NOT EXISTS idx_oe_contrib_data       ON public.oe_contribuicoes(data DESC);

-- ── Histórico / Auditoria ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oe_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id   uuid NOT NULL REFERENCES public.ofertas_especiais(id) ON DELETE CASCADE,
  acao          text NOT NULL,
  campo         text,
  valor_ant     text,
  valor_novo    text,
  justificativa text,
  usuario_id    uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oe_hist_campanha ON public.oe_historico(campanha_id);
CREATE INDEX IF NOT EXISTS idx_oe_hist_acao     ON public.oe_historico(acao);

-- ── Trigger updated_at ─────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_updated_at') THEN
    CALL public.apply_updated_at('ofertas_especiais');
    CALL public.apply_updated_at('oe_contribuicoes');
  END IF;
END $$;

-- ── RLS ────────────────────────────────────────────────────────

ALTER TABLE public.ofertas_especiais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oe_contribuicoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oe_historico       ENABLE ROW LEVEL SECURITY;

-- Autenticados lêem tudo
DROP POLICY IF EXISTS oe_select         ON public.ofertas_especiais;
DROP POLICY IF EXISTS oe_insert         ON public.ofertas_especiais;
DROP POLICY IF EXISTS oe_update         ON public.ofertas_especiais;
DROP POLICY IF EXISTS oe_contrib_select ON public.oe_contribuicoes;
DROP POLICY IF EXISTS oe_contrib_insert ON public.oe_contribuicoes;
DROP POLICY IF EXISTS oe_contrib_update ON public.oe_contribuicoes;
DROP POLICY IF EXISTS oe_hist_select    ON public.oe_historico;
DROP POLICY IF EXISTS oe_hist_insert    ON public.oe_historico;
DROP POLICY IF EXISTS oe_anon_select          ON public.ofertas_especiais;
DROP POLICY IF EXISTS oe_contrib_anon_insert  ON public.oe_contribuicoes;

CREATE POLICY oe_select          ON public.ofertas_especiais  FOR SELECT TO authenticated USING (true);
CREATE POLICY oe_insert          ON public.ofertas_especiais  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY oe_update          ON public.ofertas_especiais  FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY oe_contrib_select  ON public.oe_contribuicoes   FOR SELECT TO authenticated USING (true);
CREATE POLICY oe_contrib_insert  ON public.oe_contribuicoes   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY oe_contrib_update  ON public.oe_contribuicoes   FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY oe_hist_select     ON public.oe_historico       FOR SELECT TO authenticated USING (true);
CREATE POLICY oe_hist_insert     ON public.oe_historico       FOR INSERT TO authenticated WITH CHECK (true);

-- Anônimos lêem campanhas públicas (para oferta.html)
CREATE POLICY oe_anon_select ON public.ofertas_especiais
  FOR SELECT TO anon
  USING (publica = true AND status IN ('publicada','em_andamento','meta_atingida','encerrada'));

-- Anônimos inserem contribuições públicas
CREATE POLICY oe_contrib_anon_insert ON public.oe_contribuicoes
  FOR INSERT TO anon
  WITH CHECK (origem = 'publico');

NOTIFY pgrst, 'reload schema';
