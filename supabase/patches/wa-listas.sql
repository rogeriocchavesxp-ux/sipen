-- ═══════════════════════════════════════════════════════
-- SIPEN — WhatsApp: Listas de Comunicação
-- wa-listas.sql
-- ═══════════════════════════════════════════════════════

-- 1. Listas
CREATE TABLE IF NOT EXISTS wa_listas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  descricao     TEXT,
  icone         TEXT DEFAULT '📋',
  ativo         BOOLEAN DEFAULT TRUE,
  criado_por    UUID REFERENCES auth.users(id),
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vínculos pessoa ↔ lista
CREATE TABLE IF NOT EXISTS wa_lista_membros (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id  UUID NOT NULL REFERENCES wa_listas(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  ativo     BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_id, pessoa_id)
);

-- 3. Envios em massa
CREATE TABLE IF NOT EXISTS wa_envios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id      UUID REFERENCES wa_listas(id),
  lista_nome    TEXT,
  mensagem      TEXT NOT NULL,
  template_id   UUID REFERENCES whatsapp_templates(id),
  enviado_por   UUID REFERENCES auth.users(id),
  total         INT DEFAULT 0,
  enviados      INT DEFAULT 0,
  falhas        INT DEFAULT 0,
  status        TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviando','concluido','erro')),
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  concluido_em  TIMESTAMPTZ
);

-- 4. Destinatários por envio
CREATE TABLE IF NOT EXISTS wa_envio_destinatarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id   UUID NOT NULL REFERENCES wa_envios(id) ON DELETE CASCADE,
  pessoa_id  UUID REFERENCES pessoas(id),
  nome       TEXT,
  numero     TEXT,
  status     TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
  erro_msg   TEXT,
  enviado_em TIMESTAMPTZ
);

-- 5. Agendamentos
CREATE TABLE IF NOT EXISTS wa_agendamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id       UUID NOT NULL REFERENCES wa_listas(id) ON DELETE CASCADE,
  lista_nome     TEXT,
  mensagem       TEXT NOT NULL,
  template_id    UUID REFERENCES whatsapp_templates(id),
  agendado_para  TIMESTAMPTZ NOT NULL,
  status         TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','cancelado')),
  criado_por     UUID REFERENCES auth.users(id),
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wa_listas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_lista_membros       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_envios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_envio_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_agendamentos        ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados podem tudo; anon lê apenas listas ativas
CREATE POLICY "auth_all_wa_listas"              ON wa_listas              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_wa_lista_membros"       ON wa_lista_membros       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_wa_envios"              ON wa_envios              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_wa_envio_dest"          ON wa_envio_destinatarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_wa_agendamentos"        ON wa_agendamentos        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_listas              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_lista_membros       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_envios              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_envio_destinatarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_agendamentos        TO authenticated;

-- Índices
CREATE INDEX IF NOT EXISTS idx_wa_lista_membros_lista   ON wa_lista_membros(lista_id);
CREATE INDEX IF NOT EXISTS idx_wa_lista_membros_pessoa  ON wa_lista_membros(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_wa_envios_lista          ON wa_envios(lista_id);
CREATE INDEX IF NOT EXISTS idx_wa_envio_dest_envio      ON wa_envio_destinatarios(envio_id);
CREATE INDEX IF NOT EXISTS idx_wa_agendamentos_status   ON wa_agendamentos(status, agendado_para);

-- Seed de listas padrão
INSERT INTO wa_listas (nome, descricao, icone) VALUES
  ('Líderes',             'Líderes de ministérios e pequenos grupos',    '👥'),
  ('Conselho',            'Membros do Conselho da IPPenha',               '◈'),
  ('Diáconos',            'Junta Diaconal',                              '✚'),
  ('Professores',         'Professores da Escola Dominical',             '📚'),
  ('Pequenos Grupos',     'Líderes e participantes de PGs',              '🏠'),
  ('Ministério Infantil', 'Equipe do Penha Kids',                        '🧒'),
  ('Administração',       'Equipe administrativa da Igreja',             '⚙'),
  ('Voluntários',         'Voluntários em geral',                        '🙋')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
