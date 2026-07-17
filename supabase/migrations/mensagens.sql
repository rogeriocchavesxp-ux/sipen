-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Central de Comunicação
-- Mensagens, campanhas, modelos e destinatários
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. CAMPANHAS / MENSAGENS
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS msg_campanhas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text        NOT NULL,
  canal           text        NOT NULL DEFAULT 'whatsapp'
    CHECK (canal IN ('whatsapp','email','notificacao','todos')),
  status          text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','agendada','enviando','enviada','parcial','falha')),
  conteudo        text,
  modelo_id       uuid,
  filtros_desc    text,
  agendado_para   timestamptz,
  enviado_em      timestamptz,
  total_dest      integer     NOT NULL DEFAULT 0,
  total_entregue  integer     NOT NULL DEFAULT 0,
  total_lido      integer     NOT NULL DEFAULT 0,
  total_falha     integer     NOT NULL DEFAULT 0,
  criado_por      uuid,
  criado_por_nm   text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 2. DESTINATÁRIOS POR CAMPANHA
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS msg_destinatarios (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id     uuid        NOT NULL,
  pessoa_id       uuid,
  nome            text        NOT NULL,
  contato         text,
  canal           text        NOT NULL DEFAULT 'whatsapp',
  status          text        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','enviando','enviado','entregue','lido','respondido','falha')),
  erro            text,
  enviado_em      timestamptz,
  entregue_em     timestamptz,
  lido_em         timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 3. FILTROS DE SELEÇÃO (auditoria dos critérios usados)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS msg_filtros (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id     uuid        NOT NULL,
  tipo            text        NOT NULL,
  valor           text,
  valor_id        uuid,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 4. MODELOS / TEMPLATES
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS msg_modelos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text        NOT NULL,
  categoria       text        NOT NULL DEFAULT 'aviso'
    CHECK (categoria IN ('convocacao','aviso','culto','funeral','casamento','aniversario','pgs','missoes','escala','outros')),
  canal           text        NOT NULL DEFAULT 'todos'
    CHECK (canal IN ('whatsapp','email','notificacao','todos')),
  titulo          text,
  conteudo        text        NOT NULL,
  ativo           boolean     NOT NULL DEFAULT true,
  criado_por      uuid,
  criado_por_nm   text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 5. TRIGGER atualizado_em
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upd_msg_campanhas() RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_msg_campanhas_upd
  BEFORE UPDATE ON msg_campanhas
  FOR EACH ROW EXECUTE FUNCTION upd_msg_campanhas();

CREATE OR REPLACE FUNCTION upd_msg_modelos() RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_msg_modelos_upd
  BEFORE UPDATE ON msg_modelos
  FOR EACH ROW EXECUTE FUNCTION upd_msg_modelos();

-- ────────────────────────────────────────────────────────────────
-- 6. RLS
-- ────────────────────────────────────────────────────────────────

ALTER TABLE msg_campanhas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE msg_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE msg_filtros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE msg_modelos     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_camp_sel" ON msg_campanhas    FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_camp_ins" ON msg_campanhas    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "msg_camp_upd" ON msg_campanhas    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "msg_dest_sel" ON msg_destinatarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_dest_ins" ON msg_destinatarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "msg_dest_upd" ON msg_destinatarios FOR UPDATE TO authenticated USING (true);

CREATE POLICY "msg_filt_sel" ON msg_filtros      FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_filt_ins" ON msg_filtros      FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "msg_mod_sel"  ON msg_modelos      FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_mod_ins"  ON msg_modelos      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "msg_mod_upd"  ON msg_modelos      FOR UPDATE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────────
-- 7. ÍNDICES
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_msg_camp_status    ON msg_campanhas(status);
CREATE INDEX IF NOT EXISTS idx_msg_camp_canal     ON msg_campanhas(canal);
CREATE INDEX IF NOT EXISTS idx_msg_camp_agend     ON msg_campanhas(agendado_para) WHERE agendado_para IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_msg_dest_camp      ON msg_destinatarios(campanha_id);
CREATE INDEX IF NOT EXISTS idx_msg_dest_status    ON msg_destinatarios(status);
CREATE INDEX IF NOT EXISTS idx_msg_filt_camp      ON msg_filtros(campanha_id);
CREATE INDEX IF NOT EXISTS idx_msg_mod_ativo      ON msg_modelos(ativo) WHERE ativo = true;

-- ────────────────────────────────────────────────────────────────
-- 8. SEED — modelos iniciais
-- ────────────────────────────────────────────────────────────────

INSERT INTO msg_modelos (nome, categoria, canal, titulo, conteudo, criado_por_nm) VALUES
(
  'Convocação para Reunião',
  'convocacao', 'whatsapp', 'Reunião do Conselho',
  'Prezado(a) {{nome}},

O Conselho da Igreja Presbiteriana da Penha convoca V.Sa. para a reunião ordinária que se realizará no dia {{data}}, às {{hora}}, em {{local}}.

Contamos com a sua presença.

*Igreja Presbiteriana da Penha*',
  'Sistema'
),
(
  'Aviso de Culto Especial',
  'culto', 'whatsapp', 'Culto Especial',
  'Olá {{nome}}! 🙏

Convidamos você para o nosso *{{evento}}* no dia *{{data}}*, às *{{hora}}*, na Igreja Presbiteriana da Penha.

*Local:* {{local}}

Venha e traga alguém!',
  'Sistema'
),
(
  'Parabéns de Aniversário',
  'aniversario', 'whatsapp', null,
  'Olá {{nome}}! 🎂

A família da Igreja Presbiteriana da Penha deseja a você um feliz aniversário!

Que Deus o(a) abençoe grandemente neste novo ano de vida.

_"O Senhor te abençoe e te guarde."_ — Números 6:24',
  'Sistema'
),
(
  'Escala Publicada',
  'escala', 'whatsapp', null,
  'Olá {{nome}}!

A escala de *{{ministerio}}* para o mês de *{{mes}}* foi publicada.

Acesse o SIPEN para conferir os seus horários e confirmar disponibilidade.

Dúvidas? Fale com o seu líder.',
  'Sistema'
),
(
  'Aviso Geral',
  'aviso', 'todos', 'Comunicado',
  'Olá {{nome}},

{{conteudo}}

Atenciosamente,
*Igreja Presbiteriana da Penha*',
  'Sistema'
)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 9. VERIFICAÇÃO
-- ────────────────────────────────────────────────────────────────

SELECT id, nome, categoria, canal FROM msg_modelos ORDER BY criado_em;
