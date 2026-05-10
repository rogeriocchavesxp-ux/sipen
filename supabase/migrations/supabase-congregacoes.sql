-- ═══════════════════════════════════════════════════════
-- SIPEN — Criação das tabelas do módulo Congregações
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. Tabela principal de congregações
CREATE TABLE IF NOT EXISTS congregacoes (
  id                   text PRIMARY KEY,
  -- Identificação
  nome                 text NOT NULL,
  localizacao          text,
  endereco             text,
  data_inicio          date,
  status               text DEFAULT 'ativa',
  cor                  text DEFAULT '#3AAA5C',
  icon                 text DEFAULT '⛪',
  obs                  text,
  -- Membresia (campos numéricos flat para facilitar consultas)
  membros_ativos       int DEFAULT 0,
  membros_cooperadores int DEFAULT 0,
  criancas             int DEFAULT 0,
  jovens               int DEFAULT 0,
  adultos              int DEFAULT 0,
  idosos               int DEFAULT 0,
  batizados_ano        int DEFAULT 0,
  novos_membros_ano    int DEFAULT 0,
  desligados_ano       int DEFAULT 0,
  meta_membros         int DEFAULT 0,
  -- Atividades
  cultos_por_semana    int DEFAULT 0,
  frequencia_media     int DEFAULT 0,
  horarios             jsonb DEFAULT '[]',
  escola_dominical     boolean DEFAULT false,
  culto_jovens         boolean DEFAULT false,
  culto_mulheres       boolean DEFAULT false,
  culto_homens         boolean DEFAULT false,
  culto_criancas       boolean DEFAULT false,
  -- Pequenos Grupos
  total_grupos         int DEFAULT 0,
  grupos               jsonb DEFAULT '[]',
  -- Ministérios
  ministerios          jsonb DEFAULT '[]',
  -- Liderança
  pastor_responsavel   text,
  lideres              jsonb DEFAULT '[]',
  -- Financeiro
  receita_media_mensal numeric DEFAULT 0,
  despesa_media_mensal numeric DEFAULT 0,
  saldo_atual          numeric DEFAULT 0,
  financeiro_historico jsonb DEFAULT '[]',
  -- Desafios e Planejamento
  desafios             jsonb DEFAULT '[]',
  metas_ano            text,
  eventos              jsonb DEFAULT '[]',
  acoes                jsonb DEFAULT '[]',
  -- Metadados
  criado_em            timestamptz DEFAULT now(),
  atualizado_em        timestamptz DEFAULT now()
);

-- 2. Tabela de cultos (registros frequentes — tabela separada)
CREATE TABLE IF NOT EXISTS congregacao_cultos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cong_id       text NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  data          date NOT NULL,
  tipo          text,
  pregador      text,
  tema          text,
  participantes int DEFAULT 0,
  visitantes    int DEFAULT 0,
  decisoes      int DEFAULT 0,
  obs           text,
  criado_em     timestamptz DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_congregacoes_status ON congregacoes(status);
CREATE INDEX IF NOT EXISTS idx_congregacao_cultos_cong_id ON congregacao_cultos(cong_id);
CREATE INDEX IF NOT EXISTS idx_congregacao_cultos_data ON congregacao_cultos(data DESC);

-- 4. RLS (Row Level Security) — habilitar se necessário
-- ALTER TABLE congregacoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE congregacao_cultos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Acesso autenticado" ON congregacoes FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Acesso autenticado" ON congregacao_cultos FOR ALL USING (auth.role() = 'authenticated');

-- 5. Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_congregacoes_atualizado_em
  BEFORE UPDATE ON congregacoes
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
