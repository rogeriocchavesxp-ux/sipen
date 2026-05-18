-- ================================================================
-- SIPEN — Adiciona TODAS as colunas usadas pelo front-end em congregacoes
-- Data: 2026-05-18
-- Executar no Supabase Dashboard → SQL Editor
-- Seguro: ADD COLUMN IF NOT EXISTS não falha se a coluna já existe
-- ================================================================

ALTER TABLE congregacoes
  -- identificação
  ADD COLUMN IF NOT EXISTS localizacao          TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco             TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_inicio          DATE,
  ADD COLUMN IF NOT EXISTS cor                  TEXT    NOT NULL DEFAULT '#3AAA5C',
  ADD COLUMN IF NOT EXISTS icon                 TEXT    NOT NULL DEFAULT '⛪',
  ADD COLUMN IF NOT EXISTS obs                  TEXT    NOT NULL DEFAULT '',

  -- panorama membresia
  ADD COLUMN IF NOT EXISTS membros_ativos       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS membros_cooperadores INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criancas             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jovens               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adultos              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idosos               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batizados_ano        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS novos_membros_ano    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desligados_ano       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_membros         INTEGER NOT NULL DEFAULT 0,

  -- atividades
  ADD COLUMN IF NOT EXISTS cultos_por_semana    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequencia_media     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horarios             JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS escola_dominical     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS culto_jovens         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS culto_mulheres       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS culto_homens         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS culto_criancas       BOOLEAN NOT NULL DEFAULT false,

  -- pequenos grupos
  ADD COLUMN IF NOT EXISTS total_grupos         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grupos               JSONB   NOT NULL DEFAULT '[]',

  -- ministérios e liderança
  ADD COLUMN IF NOT EXISTS ministerios          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pastor_responsavel   TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lideres              JSONB   NOT NULL DEFAULT '{}',

  -- financeiro
  ADD COLUMN IF NOT EXISTS receita_media_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS despesa_media_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_atual          NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financeiro_historico JSONB   NOT NULL DEFAULT '[]',

  -- planejamento
  ADD COLUMN IF NOT EXISTS desafios             JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS metas_ano            TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eventos              JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS acoes                JSONB   NOT NULL DEFAULT '[]',

  -- departamentos
  ADD COLUMN IF NOT EXISTS departamentos        JSONB   NOT NULL DEFAULT '[]';

-- Confirmar colunas adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'congregacoes'
ORDER BY ordinal_position;
