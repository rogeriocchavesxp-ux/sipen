-- ═══════════════════════════════════════════════════════════
-- SIPEN — Conselho: estrutura formal de reuniões
-- Criado em: 2026-05-24
-- ═══════════════════════════════════════════════════════════

-- 1. Campos estruturados em conselho_reunioes
ALTER TABLE conselho_reunioes
  ADD COLUMN IF NOT EXISTS numero_ata           text,
  ADD COLUMN IF NOT EXISTS horario_encerramento time,
  ADD COLUMN IF NOT EXISTS presidente           text,
  ADD COLUMN IF NOT EXISTS secretario          text,
  ADD COLUMN IF NOT EXISTS oracao_inicial       text,
  ADD COLUMN IF NOT EXISTS oracao_final         text;

-- 2. Tabela de presenças estruturadas
CREATE TABLE IF NOT EXISTS conselho_reuniao_presentes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id  uuid NOT NULL REFERENCES conselho_reunioes(id) ON DELETE CASCADE,
  pessoa_id   uuid REFERENCES pessoas(id),
  nome        text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN (
    'PASTOR_PRESENTE', 'PRESBITERO_PRESENTE', 'ONLINE',
    'PASTOR_AUSENTE',  'PRESBITERO_AUSENTE',  'AUSENTE_JUSTIFICADO'
  )),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crp_reuniao ON conselho_reuniao_presentes(reuniao_id);

-- 3. RLS
ALTER TABLE conselho_reuniao_presentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY crp_select ON conselho_reuniao_presentes FOR SELECT TO authenticated USING (true);
CREATE POLICY crp_insert ON conselho_reuniao_presentes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY crp_update ON conselho_reuniao_presentes FOR UPDATE TO authenticated USING (true);
CREATE POLICY crp_delete ON conselho_reuniao_presentes FOR DELETE TO authenticated USING (true);
