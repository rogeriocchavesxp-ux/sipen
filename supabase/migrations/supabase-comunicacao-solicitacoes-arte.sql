-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo Comunicação
-- Tabelas: com_solicitacoes_arte · com_andamentos
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela principal ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS com_solicitacoes_arte (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campos do formulário
  ministerio_solicitante    TEXT        NOT NULL,
  responsavel_nome          TEXT        NOT NULL,
  telefone_whatsapp         TEXT,
  descricao_demanda         TEXT        NOT NULL,
  data_evento               DATE,
  horario_evento            TIME,
  local_evento              TEXT,
  publico_alvo              TEXT[]      NOT NULL DEFAULT '{}',
  evento_gratuito           BOOLEAN     NOT NULL DEFAULT true,
  evento_valor              NUMERIC(10,2),
  evento_parcelamento       TEXT,
  evento_forma_pagamento    TEXT,
  evento_link_pagamento     TEXT,
  necessita_inscricao       BOOLEAN     NOT NULL DEFAULT false,
  link_inscricao            TEXT,
  areas_comunicacao         TEXT[]      NOT NULL DEFAULT '{}',
  justificativa_areas       TEXT,
  formatos_divulgacao       TEXT[]      NOT NULL DEFAULT '{}',
  prazo_entrega             DATE,
  anexos                    JSONB       NOT NULL DEFAULT '[]',
  informacoes_adicionais    TEXT,

  -- Gestão interna
  status                    TEXT        NOT NULL DEFAULT 'Recebida'
                                        CHECK (status IN ('Recebida','Em análise','Em produção','Aguardando aprovação','Concluída','Cancelada')),
  responsavel_interno_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_interno_nome  TEXT,
  observacoes_internas      TEXT,

  -- Metadados
  criado_por                UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome           TEXT,
  criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_com_arte_status   ON com_solicitacoes_arte(status);
CREATE INDEX IF NOT EXISTS idx_com_arte_criado   ON com_solicitacoes_arte(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_com_arte_min      ON com_solicitacoes_arte(ministerio_solicitante);
CREATE INDEX IF NOT EXISTS idx_com_arte_prazo    ON com_solicitacoes_arte(prazo_entrega);

-- ── 2. Andamentos / histórico ─────────────────────────────────
CREATE TABLE IF NOT EXISTS com_andamentos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sol_id        UUID        NOT NULL REFERENCES com_solicitacoes_arte(id) ON DELETE CASCADE,
  texto         TEXT        NOT NULL,
  usuario_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome  TEXT,
  automatico    BOOLEAN     NOT NULL DEFAULT false,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_com_and_sol    ON com_andamentos(sol_id);
CREATE INDEX IF NOT EXISTS idx_com_and_criado ON com_andamentos(criado_em DESC);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE com_solicitacoes_arte ENABLE ROW LEVEL SECURITY;
ALTER TABLE com_andamentos        ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='com_arte_select' AND tablename='com_solicitacoes_arte') THEN
    CREATE POLICY "com_arte_select" ON com_solicitacoes_arte FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='com_arte_insert' AND tablename='com_solicitacoes_arte') THEN
    CREATE POLICY "com_arte_insert" ON com_solicitacoes_arte FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='com_arte_update' AND tablename='com_solicitacoes_arte') THEN
    CREATE POLICY "com_arte_update" ON com_solicitacoes_arte FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='com_and_select' AND tablename='com_andamentos') THEN
    CREATE POLICY "com_and_select" ON com_andamentos FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='com_and_insert' AND tablename='com_andamentos') THEN
    CREATE POLICY "com_and_insert" ON com_andamentos FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Verificação ────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('com_solicitacoes_arte','com_andamentos');
