-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Log de notificações por e-mail
-- Tabela: email_notificacoes
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_notificacoes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  para_email       TEXT        NOT NULL,       -- destinatário(s) separados por vírgula
  para_nome        TEXT,                       -- nome(s) do(s) destinatário(s)
  assunto          TEXT        NOT NULL,
  modulo           TEXT        NOT NULL DEFAULT 'DEMANDAS',
  referencia_tipo  TEXT,                       -- ex: 'demanda_aprovacao'
  referencia_id    TEXT,                       -- UUID do registro de origem
  status           TEXT        NOT NULL DEFAULT 'pendente'
                               CHECK (status IN ('pendente','enviado','erro')),
  erro_msg         TEXT,
  enviado_em       TIMESTAMPTZ,
  enviado_por      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key  TEXT        UNIQUE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notif_ref    ON email_notificacoes (referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_email_notif_status ON email_notificacoes (status);
CREATE INDEX IF NOT EXISTS idx_email_notif_modulo ON email_notificacoes (modulo);
CREATE INDEX IF NOT EXISTS idx_email_notif_criado ON email_notificacoes (criado_em DESC);

-- RLS: autenticados leem; escrita somente via service role (edge function)
ALTER TABLE email_notificacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'email_notif_select' AND tablename = 'email_notificacoes'
  ) THEN
    CREATE POLICY "email_notif_select"
      ON email_notificacoes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
