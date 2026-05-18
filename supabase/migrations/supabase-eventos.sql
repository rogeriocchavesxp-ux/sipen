-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo Eventos
-- Tabelas: eventos · evento_inscricoes
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Eventos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                 TEXT        NOT NULL,
  descricao              TEXT,
  data_inicio            DATE        NOT NULL,
  hora_inicio            TIME,
  data_fim               DATE,
  hora_fim               TIME,
  local_nome             TEXT,
  ministerio_organizador TEXT,
  gratuito               BOOLEAN     NOT NULL DEFAULT true,
  valor                  NUMERIC(10,2),
  vagas                  INTEGER,
  prazo_inscricao        DATE,
  publico_alvo           TEXT[]      NOT NULL DEFAULT '{}',
  aceita_nao_membros     BOOLEAN     NOT NULL DEFAULT true,
  aceita_criancas        BOOLEAN     NOT NULL DEFAULT false,
  requer_responsavel     BOOLEAN     NOT NULL DEFAULT false,
  imagem_url             TEXT,
  observacoes            TEXT,
  status                 TEXT        NOT NULL DEFAULT 'rascunho'
                                     CHECK (status IN (
                                       'rascunho','publicado','inscricoes_abertas',
                                       'inscricoes_encerradas','em_andamento',
                                       'concluido','cancelado'
                                     )),
  criado_por             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome        TEXT,
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eve_status      ON eventos(status);
CREATE INDEX IF NOT EXISTS idx_eve_data_inicio ON eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_eve_criado      ON eventos(criado_em DESC);

-- ── 2. Inscrições ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evento_inscricoes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id            UUID        NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  pessoa_id            UUID,
  nome                 TEXT        NOT NULL,
  email                TEXT,
  telefone             TEXT,
  tipo                 TEXT        NOT NULL DEFAULT 'membro'
                                   CHECK (tipo IN ('membro','nao_membro','visitante','crianca','adolescente')),
  responsavel_nome     TEXT,
  responsavel_telefone TEXT,
  status               TEXT        NOT NULL DEFAULT 'pendente'
                                   CHECK (status IN ('pendente','confirmada','cancelada','presente','ausente')),
  pago                 BOOLEAN     NOT NULL DEFAULT false,
  valor_cobrado        NUMERIC(10,2),
  valor_pago           NUMERIC(10,2),
  forma_pagamento      TEXT,
  data_pagamento       TIMESTAMPTZ,
  referencia_pagamento TEXT,
  observacao           TEXT,
  criado_por           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome      TEXT,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eve_inscr_evento ON evento_inscricoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_eve_inscr_status ON evento_inscricoes(status);
CREATE INDEX IF NOT EXISTS idx_eve_inscr_criado ON evento_inscricoes(criado_em DESC);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE eventos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_inscricoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_select' AND tablename='eventos') THEN
    CREATE POLICY "eve_select" ON eventos FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_insert' AND tablename='eventos') THEN
    CREATE POLICY "eve_insert" ON eventos FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_update' AND tablename='eventos') THEN
    CREATE POLICY "eve_update" ON eventos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_inscr_select' AND tablename='evento_inscricoes') THEN
    CREATE POLICY "eve_inscr_select" ON evento_inscricoes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_inscr_insert' AND tablename='evento_inscricoes') THEN
    CREATE POLICY "eve_inscr_insert" ON evento_inscricoes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='eve_inscr_update' AND tablename='evento_inscricoes') THEN
    CREATE POLICY "eve_inscr_update" ON evento_inscricoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Verificação ────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('eventos','evento_inscricoes');
