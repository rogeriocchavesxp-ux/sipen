-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Integração InfinityPay: Eventos
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Campos InfinityPay na tabela eventos ───────────────────
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS infinitypay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS infinitypay_account_id TEXT;

-- ── 2. Campos InfinityPay em evento_inscricoes ─────────────────
ALTER TABLE evento_inscricoes
  ADD COLUMN IF NOT EXISTS infinitypay_charge_id   TEXT,
  ADD COLUMN IF NOT EXISTS infinitypay_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS infinitypay_status       TEXT;

CREATE INDEX IF NOT EXISTS idx_inscr_ip_charge ON evento_inscricoes(infinitypay_charge_id);

-- ── 3. Tabela de configurações do sistema ─────────────────────
CREATE TABLE IF NOT EXISTS sipen_configuracoes (
  chave        TEXT PRIMARY KEY,
  valor        TEXT,
  descricao    TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por TEXT
);

ALTER TABLE sipen_configuracoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'sconfig_select' AND tablename = 'sipen_configuracoes'
  ) THEN
    CREATE POLICY "sconfig_select" ON sipen_configuracoes
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'sconfig_write' AND tablename = 'sipen_configuracoes'
  ) THEN
    CREATE POLICY "sconfig_write" ON sipen_configuracoes
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Seed inicial das chaves InfinityPay ────────────────────
INSERT INTO sipen_configuracoes (chave, descricao)
VALUES
  ('infinitypay_api_token',   'Token de acesso à API InfinityPay')
ON CONFLICT (chave) DO NOTHING;

-- ── 5. Verificação ────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'eventos' AND column_name = 'infinitypay_enabled')    AS col_eve_enabled,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'evento_inscricoes' AND column_name = 'infinitypay_charge_id') AS col_inscr_charge_id,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'sipen_configuracoes')                                 AS tbl_config;
