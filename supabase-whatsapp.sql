-- ═══════════════════════════════════════════════════════════════
-- SIPEN — WhatsApp / Evolution API
-- Executar no Supabase Dashboard > SQL Editor
--
-- Secrets necessários (supabase secrets set):
--   EVOLUTION_API_KEY  → chave da instância Evolution API
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Configuração da instância Evolution API ───────────────
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  api_url       text NOT NULL,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Garante no máximo uma linha ativa
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_config_ativa_idx
  ON whatsapp_config (ativo) WHERE ativo = true;

-- ── 2. Histórico de mensagens enviadas ──────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  para_numero      text NOT NULL,
  para_nome        text,
  mensagem         text NOT NULL,
  modulo           text NOT NULL,
  referencia_tipo  text,
  referencia_id    text,
  status           text NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','enviado','erro','duplicado')),
  erro_msg         text,
  enviado_em       timestamptz,
  enviado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key  text UNIQUE,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_modulo   ON whatsapp_mensagens (modulo);
CREATE INDEX IF NOT EXISTS idx_wa_msg_numero   ON whatsapp_mensagens (para_numero);
CREATE INDEX IF NOT EXISTS idx_wa_msg_status   ON whatsapp_mensagens (status);
CREATE INDEX IF NOT EXISTS idx_wa_msg_ref      ON whatsapp_mensagens (referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_criado   ON whatsapp_mensagens (criado_em DESC);

-- ── 3. Templates de mensagem por módulo ─────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave     text NOT NULL UNIQUE,
  modulo    text NOT NULL,
  titulo    text NOT NULL,
  corpo     text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Templates iniciais
INSERT INTO whatsapp_templates (chave, modulo, titulo, corpo) VALUES
  ('BOAS_VINDAS',          'MEMBRESIA',    'Boas-vindas ao SIPEN',
   'Olá, {{nome}}! Seu cadastro na IPPenha foi confirmado. Bem-vindo(a)! 🙏'),
  ('CONFIRMACAO_EVENTO',   'AGENDA',       'Confirmação de inscrição em evento',
   'Olá, {{nome}}! Sua inscrição no evento *{{evento}}* em {{data}} foi confirmada. Te esperamos!'),
  ('LEMBRETE_EVENTO',      'AGENDA',       'Lembrete de evento',
   'Olá, {{nome}}! Lembrando que o evento *{{evento}}* acontece {{data}} às {{hora}}. Contamos com você!'),
  ('CONFIRMACAO_PAGAMENTO','FINANCEIRO',   'Confirmação de pagamento',
   'Olá, {{nome}}! O pagamento de R$ {{valor}} foi aprovado e será processado em breve.'),
  ('DEMANDA_STATUS',       'DEMANDAS',     'Atualização de solicitação',
   'Olá, {{nome}}! Sua solicitação *{{titulo}}* foi atualizada: {{status}}.'),
  ('AVISO_GERAL',          'COMUNICACAO',  'Aviso geral',
   '📢 *IPPenha*\n\n{{mensagem}}')
ON CONFLICT (chave) DO NOTHING;

-- ── 4. Ativação de notificações por módulo ──────────────────
CREATE TABLE IF NOT EXISTS whatsapp_modulo_config (
  modulo    text PRIMARY KEY,
  ativo     boolean NOT NULL DEFAULT true,
  descricao text
);

INSERT INTO whatsapp_modulo_config (modulo, ativo, descricao) VALUES
  ('MEMBRESIA',     true,  'Boas-vindas e confirmações de cadastro'),
  ('AGENDA',        true,  'Confirmações e lembretes de eventos'),
  ('FINANCEIRO',    true,  'Confirmações de pagamento e avisos financeiros'),
  ('DEMANDAS',      true,  'Atualizações de status de solicitações'),
  ('ESTACIONAMENTO',true,  'Avisos sobre controles de acesso'),
  ('PASTORAL',      false, 'Comunicação pastoral (privado)'),
  ('COMUNICACAO',   true,  'Avisos gerais para membros e externos')
ON CONFLICT (modulo) DO NOTHING;

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE whatsapp_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_modulo_config   ENABLE ROW LEVEL SECURITY;

-- whatsapp_config: só admins lêem/escrevem
CREATE POLICY "admin_select_wa_config" ON whatsapp_config
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

CREATE POLICY "admin_update_wa_config" ON whatsapp_config
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

-- whatsapp_mensagens: admins lêem, só service role insere (Edge Function)
CREATE POLICY "admin_select_wa_msg" ON whatsapp_mensagens
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL','adm_operacional','ADM_OPERACIONAL'));

-- whatsapp_templates: todos autenticados lêem; admins gerenciam
CREATE POLICY "autenticado_select_templates" ON whatsapp_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_templates" ON whatsapp_templates
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

-- whatsapp_modulo_config: todos lêem; admins escrevem
CREATE POLICY "autenticado_select_modulo_config" ON whatsapp_modulo_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_update_modulo_config" ON whatsapp_modulo_config
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'));

-- Notifica PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
