-- ═══════════════════════════════════════════════════════
-- SIPEN — Pedidos de Compra (Fase 1)
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS seq_pedidos_compra_numero START 1;

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          bigint DEFAULT nextval('seq_pedidos_compra_numero') UNIQUE NOT NULL,
  titulo          text NOT NULL,
  descricao       text,
  status          text NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente','em_analise','em_cotacao','aguardando_aprovacao',
    'aprovado','em_pedido','recebido','encerrado','rejeitado','cancelado'
  )),
  origem          text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','chamado','requisicao')),
  urgencia        text NOT NULL DEFAULT 'normal'  CHECK (urgencia IN ('normal','urgente','critico')),
  -- vínculos (Fases 2-3, nullable por enquanto)
  demanda_id      uuid,
  requisicao_id   uuid,
  nota_fiscal_id  uuid,
  fin_solicitacao_id uuid,
  -- dados do solicitante
  solicitante_nome text NOT NULL,
  departamento    text,
  -- aprovação
  valor_estimado  numeric(12,2),
  valor_aprovado  numeric(12,2),
  requer_cotacao  boolean DEFAULT false,
  aprovado_por    text,
  aprovado_em     timestamptz,
  motivo_rejeicao text,
  -- controle
  previsao_entrega date,
  obs             text,
  criado_por      text,
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id      uuid NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  item_id        uuid,             -- FK futura → recursos_itens
  descricao      text NOT NULL,
  quantidade     numeric(12,3) NOT NULL DEFAULT 1,
  unidade        text DEFAULT 'un',
  valor_unitario numeric(12,2),
  obs            text,
  criado_em      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_compra_historico (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id   uuid NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  status_de   text,
  status_para text NOT NULL,
  observacao  text,
  usuario     text,
  criado_em   timestamptz DEFAULT now()
);

-- Trigger: atualiza atualizado_em
CREATE OR REPLACE FUNCTION _fn_pc_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pc_updated ON pedidos_compra;
CREATE TRIGGER trg_pc_updated
  BEFORE UPDATE ON pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION _fn_pc_updated();

-- RLS
ALTER TABLE pedidos_compra           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra_itens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra_historico ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "pc_read"    ON pedidos_compra           FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pc_write"   ON pedidos_compra           FOR ALL    TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pci_read"   ON pedidos_compra_itens     FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pci_write"  ON pedidos_compra_itens     FOR ALL    TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pch_read"   ON pedidos_compra_historico FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pch_write"  ON pedidos_compra_historico FOR ALL    TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
