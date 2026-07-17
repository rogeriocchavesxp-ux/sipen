-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo Resoluções do Conselho
-- Repositório oficial de deliberações normativas da IPPenha
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. TABELA PRINCIPAL
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resolucoes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            integer     NOT NULL,
  ano               integer     NOT NULL,
  versao            integer     NOT NULL DEFAULT 1,
  titulo            text        NOT NULL,
  assunto           text,
  categoria         text        NOT NULL DEFAULT 'outros'
    CHECK (categoria IN (
      'administracao','espacos','eventos','financas','comunicacao',
      'patrimonio','ministerio','missoes','liturgia','governanca',
      'seguranca','recursos_humanos','tecnologia','outros'
    )),
  status            text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_analise','aprovada','publicada','revogada','substituida')),
  resumo            text,
  texto_oficial     text,
  ata_origem        text,
  data_reuniao      date,
  relator           text,
  comissao          text,
  data_inicio       date,
  data_fim          date,
  resolucao_pai_id  uuid,
  revogada_por_id   uuid,
  criado_por        uuid,
  criado_por_nm     text,
  publicado_por     uuid,
  publicado_por_nm  text,
  revogado_por      uuid,
  revogado_por_nm   text,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_resolucao_numero_ano_versao UNIQUE (numero, ano, versao)
);

-- ────────────────────────────────────────────────────────────────
-- 2. HISTÓRICO / AUDITORIA
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resolucoes_historico (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resolucao_id  uuid        NOT NULL,
  acao          text        NOT NULL
    CHECK (acao IN ('criado','editado','aprovado','publicado','revogado','substituido')),
  campo_alt     text,
  valor_ant     text,
  valor_nov     text,
  feito_por     uuid,
  feito_por_nm  text,
  feito_em      timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 3. VÍNCULOS COM OUTROS MÓDULOS
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resolucoes_vinculos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resolucao_id  uuid        NOT NULL,
  modulo        text        NOT NULL,
  referencia_id uuid,
  descricao     text        NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 4. TRIGGER atualizado_em
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_atualizado_em_resolucoes()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resolucoes_atualizado_em
  BEFORE UPDATE ON resolucoes
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_resolucoes();

-- ────────────────────────────────────────────────────────────────
-- 5. RLS
-- ────────────────────────────────────────────────────────────────

ALTER TABLE resolucoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolucoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolucoes_vinculos  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resolucoes_sel" ON resolucoes;
DROP POLICY IF EXISTS "resolucoes_ins" ON resolucoes;
DROP POLICY IF EXISTS "resolucoes_upd" ON resolucoes;
DROP POLICY IF EXISTS "resolucoes_del" ON resolucoes;

CREATE POLICY "resolucoes_sel" ON resolucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "resolucoes_ins" ON resolucoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "resolucoes_upd" ON resolucoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "resolucoes_del" ON resolucoes FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "resolucoes_hist_sel" ON resolucoes_historico;
DROP POLICY IF EXISTS "resolucoes_hist_ins" ON resolucoes_historico;

CREATE POLICY "resolucoes_hist_sel" ON resolucoes_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "resolucoes_hist_ins" ON resolucoes_historico FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "resolucoes_vinc_sel" ON resolucoes_vinculos;
DROP POLICY IF EXISTS "resolucoes_vinc_ins" ON resolucoes_vinculos;
DROP POLICY IF EXISTS "resolucoes_vinc_del" ON resolucoes_vinculos;

CREATE POLICY "resolucoes_vinc_sel" ON resolucoes_vinculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "resolucoes_vinc_ins" ON resolucoes_vinculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "resolucoes_vinc_del" ON resolucoes_vinculos FOR DELETE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────────
-- 6. ÍNDICES
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resolucoes_ano        ON resolucoes(ano);
CREATE INDEX IF NOT EXISTS idx_resolucoes_status     ON resolucoes(status);
CREATE INDEX IF NOT EXISTS idx_resolucoes_categoria  ON resolucoes(categoria);
CREATE INDEX IF NOT EXISTS idx_resolucoes_num_ano    ON resolucoes(numero, ano);
CREATE INDEX IF NOT EXISTS idx_resolucoes_hist_id    ON resolucoes_historico(resolucao_id);
CREATE INDEX IF NOT EXISTS idx_resolucoes_vinc_id    ON resolucoes_vinculos(resolucao_id);

-- ────────────────────────────────────────────────────────────────
-- 7. SEED — primeira resolução
-- ────────────────────────────────────────────────────────────────

INSERT INTO resolucoes (
  numero, ano, versao,
  titulo, assunto, categoria, status,
  resumo,
  ata_origem, data_reuniao,
  data_inicio,
  criado_por_nm, publicado_por_nm
) VALUES (
  1, 2026, 1,
  'Organização das ações de disponibilização de itens aos domingos',
  'Utilização dos espaços e disponibilização de recursos aos domingos',
  'espacos', 'publicada',
  'Autoriza apenas uma ação de disponibilização de itens aos domingos, mediante solicitação obrigatória pelo SIPEN, antecedência mínima de 15 dias e aprovação da Administração, observando os critérios definidos pelo Conselho.',
  'Ata nº 1292', '2026-07-03',
  '2026-01-01',
  'Secretaria', 'Secretaria'
)
ON CONFLICT (numero, ano, versao) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 8. VERIFICAÇÃO
-- ────────────────────────────────────────────────────────────────

SELECT id, numero, ano, versao, titulo, status, categoria
FROM resolucoes
ORDER BY ano DESC, numero DESC;
