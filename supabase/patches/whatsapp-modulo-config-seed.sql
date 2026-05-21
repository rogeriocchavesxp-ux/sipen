-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Seed: todos os módulos em whatsapp_modulo_config
-- Execute no Supabase Dashboard > SQL Editor
-- ON CONFLICT DO NOTHING preserva configurações já existentes
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.whatsapp_modulo_config (modulo, ativo, descricao) VALUES
  ('AGENDA',        true,  'Confirmações e lembretes de agendamentos'),
  ('DEMANDAS',      true,  'Atualizações de status de solicitações'),
  ('FINANCEIRO',    true,  'Confirmações de pagamento e avisos financeiros'),
  ('PASTORAL',      true,  'Comunicações pastorais e pedidos de oração'),
  ('MINISTERIAL',   true,  'Escalas, convocações e avisos dos departamentos'),
  ('MEMBRESIA',     true,  'Boas-vindas e confirmações de cadastro'),
  ('CONSELHO',      true,  'Decisões, documentos e reuniões do Conselho'),
  ('JUNTA_DIACONAL',true,  'Atendimentos e solicitações da Junta Diaconal'),
  ('INFRAESTRUTURA',true,  'Abertura e conclusão de ordens de manutenção'),
  ('JURIDICO',      true,  'Processos, prazos e documentos jurídicos')
ON CONFLICT (modulo) DO NOTHING;
