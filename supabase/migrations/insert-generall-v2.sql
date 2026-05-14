-- ═══════════════════════════════════════════════════════
-- SIPEN — Inserção: Contrato Generall (schema v2)
-- Tabela alvo: public.contratos
-- Executar APÓS contratos-rls-grant-fix.sql
-- ═══════════════════════════════════════════════════════

-- 1. Garante enum atualizado
DO $$ BEGIN
  ALTER TYPE public.tipo_contrato_t ADD VALUE IF NOT EXISTS 'Portaria Remota';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 2. Garante coluna custos (adicionada por contratos-upgrade.sql)
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS custos JSONB DEFAULT '[]'::jsonb;

-- 3. Inserção do contrato Generall (contrato único consolidado)
INSERT INTO public.contratos (
  tipo,
  titulo,
  descricao,
  fornecedor,
  contato_fornecedor,
  valor,
  periodicidade,
  forma_pagamento,
  data_inicio,
  data_vencimento,
  renovacao_automatica,
  status,
  responsavel_txt,
  observacoes,
  custos
)
VALUES (
  'Portaria Remota',

  'Portaria Remota e Controle de Acesso — Generall',

  'Serviços de portaria remota 24x7, monitoramento, licenças e locação de equipamentos de segurança eletrônica (CFTV, controle de acesso, alarme e rede). Proposta nº 05122025-04.',

  'GENERAL TEC SISTEMAS DE SEGURANÇA ELETRÔNICA LTDA',

  'Marco Antonio Martins Tozatti — (11) 4238-3700 — marcotozatti@generall.com.br',

  -- valor = soma mensal de todos os itens
  7883.78,
  'Mensal',
  'Boleto bancário',

  '2026-01-05',
  '2028-01-05',   -- prazo da locação de equipamentos (24 meses)

  TRUE,           -- renovação automática por prazo indeterminado se não houver aviso de 30 dias

  'Ativo',

  'Amauri Costa de Oliveira',

  'Proposta nº 05122025-04 · Assinado em 05/01/2026. ' ||
  'Custo único de infraestrutura/instalação: R$ 35.365,52. ' ||
  'Opção de compra dos equipamentos: R$ 36.151,57. ' ||
  'Rescisão antecipada da locação: indenização de 70% das parcelas restantes (Cláusula 3). ' ||
  'SLA técnico: 48h úteis via www.generall.com.br ou Central 24hs.',

  '[
    {"descricao": "Gerenciamento Remoto (Monitoramento 24x7)",                              "valor": 4837.00, "periodicidade": "Mensal"},
    {"descricao": "Licenças de portaria remota (software, imagem, alarme, Chave Virtual)",  "valor":  877.66, "periodicidade": "Mensal"},
    {"descricao": "Locação de equipamentos (CFTV + controle de acesso + alarme + rede)",    "valor": 2169.12, "periodicidade": "Mensal"},
    {"descricao": "Infraestrutura e instalação (custo único)",                              "valor": 35365.52, "periodicidade": "Único"},
    {"descricao": "Opção de compra dos equipamentos (custo único)",                         "valor": 36151.57, "periodicidade": "Único"}
  ]'::jsonb
);
