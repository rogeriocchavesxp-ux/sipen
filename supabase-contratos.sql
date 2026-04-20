-- ═══════════════════════════════════════════════════════
-- SIPEN — Tabela de Contratos Institucionais
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contratos (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  tipo                text        NOT NULL,  -- Software | Imóvel | Serviço | Seguro | Fornecimento | Outro
  titulo              text        NOT NULL,
  descricao           text,

  -- Fornecedor / Partes
  fornecedor          text,
  contato_fornecedor  text,
  proprietario        text,       -- Imóvel: locador/proprietário
  produto             text,       -- Software / Fornecimento: nome do produto

  -- Financeiro
  valor               numeric(12,2),
  periodicidade       text,       -- Mensal | Trimestral | Semestral | Anual | Único | Sob demanda
  valor_segurado      numeric(12,2), -- Seguro

  -- Prazos
  data_inicio         date,
  data_vencimento     date,
  renovacao_automatica boolean     DEFAULT false,

  -- Status
  status              text        NOT NULL DEFAULT 'Ativo',
  -- Ativo | A vencer | Vencido | Em negociação | Cancelado | Encerrado

  -- Software
  num_licencas        integer,
  tipo_licenca        text,       -- Assinatura anual | Mensal | Perpétua | Teste | Educacional

  -- Imóvel
  endereco            text,
  indice_reajuste     text,       -- IPCA | IGP-M | INPC | Fixo | Negociado
  perc_reajuste       numeric(5,2),

  -- Seguro
  num_apolice         text,
  tipo_seguro         text,       -- Patrimonial | Incêndio | Veicular | Vida | Outros

  -- Pagamento
  forma_pagamento     text,       -- Boleto | Débito automático | Cartão | Transferência/PIX | Cheque | Outros

  -- Controle
  responsavel         text,
  observacoes         text,
  criado_por          text,
  criado_em           timestamptz DEFAULT now(),
  atualizado_em       timestamptz DEFAULT now()
);

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_contratos_tipo           ON contratos(tipo);
CREATE INDEX IF NOT EXISTS idx_contratos_status         ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_data_vencimento ON contratos(data_vencimento);

-- RLS (Row Level Security) — ajuste conforme sua política Supabase
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contratos' AND policyname='contratos_select_all') THEN
    CREATE POLICY "contratos_select_all" ON contratos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contratos' AND policyname='contratos_insert_auth') THEN
    CREATE POLICY "contratos_insert_auth" ON contratos FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contratos' AND policyname='contratos_update_auth') THEN
    CREATE POLICY "contratos_update_auth" ON contratos FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contratos' AND policyname='contratos_delete_auth') THEN
    CREATE POLICY "contratos_delete_auth" ON contratos FOR DELETE USING (true);
  END IF;
END $$;

-- ── Inserção de exemplo: Microsoft Office 365 ────────────
INSERT INTO contratos (
  tipo, titulo, produto, fornecedor, num_licencas, tipo_licenca,
  valor, periodicidade, data_inicio, data_vencimento,
  renovacao_automatica, status, responsavel,
  observacoes
) VALUES (
  'Software',
  'Microsoft Office 365',
  'Microsoft Office 365 Business Standard',
  'Microsoft / Parceiro local',
  10,
  'Assinatura anual',
  NULL,        -- preencher o valor real
  'Anual',
  CURRENT_DATE,
  (CURRENT_DATE + INTERVAL '1 year'),
  true,
  'Ativo',
  'Administração',
  'Contrato fechado em 2026-04-20. Inclui Word, Excel, PowerPoint, Teams e OneDrive.'
);
