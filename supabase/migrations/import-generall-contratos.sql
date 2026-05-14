-- ═══════════════════════════════════════════════════════
-- SIPEN — Importação: Contratos Generall Tec
-- Proposta comercial nº 05122025-04 · Assinado 05/01/2026
-- Executar APÓS contratos-upgrade.sql
-- ═══════════════════════════════════════════════════════

-- Garante colunas que podem não existir em instâncias mais antigas
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS custos JSONB DEFAULT '[]'::jsonb;

INSERT INTO contratos (
  tipo, titulo, descricao, fornecedor, contato_fornecedor,
  data_inicio, data_vencimento, renovacao_automatica, status,
  valor, periodicidade, forma_pagamento, responsavel, observacoes, custos
)
VALUES

-- ── Contrato 1: Serviços de Portaria Remota e Monitoramento ──────────
(
  'Portaria Remota',
  'Portaria Remota e Monitoramento 24x7 — Generall',
  'Contrato de Prestação de Serviços de Controle de Acesso Remoto. Central de atendimento remoto 24x7 para visitantes e prestadores. Inclui: monitoramento, acionamento de pânico, licença de software, licenças de imagem e alarme, aplicativo Generall Chave Virtual.',
  'General Tec Sistemas de Segurança Eletrônica Ltda',
  'Marco Antonio Martins Tozatti — (11) 4238-3700 — marcotozatti@generall.com.br',
  '2026-01-05',
  NULL,
  -- Prazo indeterminado (Cláusula 2). Rescisão: aviso prévio de 30 dias.
  FALSE,
  'Ativo',
  5714.66,
  'Mensal',
  'Boleto bancário',
  'Amauri Costa de Oliveira',
  'Prazo indeterminado (Cláusula 2). Rescisão com aviso prévio de 30 dias. Atraso > 30 dias faculta rescisão imediata pela contratada. Pagamento: dia 05 de cada mês. Proposta nº 05122025-04.',
  '[
    {"descricao": "Serviços de Gerenciamento Remoto (Monitoramento 24x7)", "valor": 4837.00, "periodicidade": "Mensal"},
    {"descricao": "Licenças de portaria remota (software, imagem, alarme, app Chave Virtual)", "valor": 877.66, "periodicidade": "Mensal"}
  ]'::jsonb
),

-- ── Contrato 2: Locação de Equipamentos de Segurança Eletrônica ──────
(
  'Portaria Remota',
  'Locação de Equipamentos de Segurança Eletrônica — Generall',
  'Contrato de Locação de Equipamentos de Segurança Eletrônica. Inclui manutenção preventiva trimestral e corretiva sem custo adicional, substituição de peças e equipamentos quando necessário. Proposta nº 05122025-04.',
  'General Tec Sistemas de Segurança Eletrônica Ltda',
  'Marco Antonio Martins Tozatti — (11) 4238-3700 — marcotozatti@generall.com.br',
  '2026-01-05',
  '2028-01-05',
  -- 24 meses a partir da assinatura (Cláusula 2). Renovação automática por prazo indeterminado
  -- se não houver notificação prévia de 30 dias antes do vencimento.
  TRUE,
  'Ativo',
  2169.12,
  'Mensal',
  'Boleto bancário',
  'Amauri Costa de Oliveira',
  'Prazo: 24 meses (05/01/2026 a 05/01/2028). Renovação automática por prazo indeterminado se não houver aviso de 30 dias. Rescisão antecipada: indenização de 70% das parcelas restantes (Cláusula 3). Equipamentos instalados em: Rua Major Rudge, 154, São Paulo. Equipamentos cobertos: CFTV (gravador 16ch, 4 câmeras dome, 2 bullet, HD 4TB), controle de acesso (3 leitores faciais, fechaduras, porteiro eletrônico, semáforo), alarme (central GPRS, sensores IVP/IVA, sirene), rede (switch 24p, Mikrotik, ATA FXO). Chamados técnicos: plataforma www.generall.com.br ou Central 24hs. SLA: 48h úteis. Proposta nº 05122025-04.',
  '[
    {"descricao": "Locação de equipamentos (CFTV + controle de acesso + alarme + rede) — inclui manutenção preventiva trimestral e corretiva", "valor": 2169.12, "periodicidade": "Mensal"}
  ]'::jsonb
);
