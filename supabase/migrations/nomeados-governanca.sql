-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Governança e Nomeações v2
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. NOVAS COLUNAS NA TABELA nomeados
-- ────────────────────────────────────────────────────────────────

ALTER TABLE nomeados
  ADD COLUMN IF NOT EXISTS origem          text DEFAULT 'conselho'
    CHECK (origem IN ('conselho','lideranca')),
  ADD COLUMN IF NOT EXISTS ministerio_id   uuid,
  ADD COLUMN IF NOT EXISTS dept_id         uuid,
  ADD COLUMN IF NOT EXISTS nomeado_por     uuid,
  ADD COLUMN IF NOT EXISTS nomeado_por_nm  text,
  ADD COLUMN IF NOT EXISTS encerrado_em    timestamptz,
  ADD COLUMN IF NOT EXISTS encerrado_por   uuid,
  ADD COLUMN IF NOT EXISTS motivo_enc      text;

-- ────────────────────────────────────────────────────────────────
-- 2. MARCAR REGISTROS EXISTENTES COMO ORIGEM CONSELHO
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados SET origem = 'conselho' WHERE origem IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 3. VINCULAR ministerio_id NOS REGISTROS EXISTENTES
--    (join por nome — case-insensitive, sem acentos)
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados n
SET ministerio_id = m.id
FROM ministerios m
WHERE lower(trim(n.orgao)) = lower(trim(m.nome))
  AND n.ministerio_id IS NULL
  AND n.orgao IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 4. VINCULAR dept_id NOS REGISTROS DE DEPARTAMENTO
-- ────────────────────────────────────────────────────────────────

UPDATE nomeados n
SET dept_id = d.id
FROM dept_administrativos d
WHERE lower(trim(n.orgao)) = lower(trim(d.nome))
  AND n.dept_id IS NULL
  AND n.orgao_tipo = 'departamento'
  AND n.orgao IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 5. TABELA DE AUDITORIA
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nomeados_audit (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nomeado_id    uuid        NOT NULL,
  acao          text        NOT NULL
    CHECK (acao IN ('criado','editado','encerrado','reativado')),
  campo_alt     text,
  valor_ant     text,
  valor_nov     text,
  feito_por     uuid,
  feito_por_nm  text,
  feito_em      timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 6. RLS NA TABELA DE AUDITORIA
-- ────────────────────────────────────────────────────────────────

ALTER TABLE nomeados_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomeados_audit_sel" ON nomeados_audit;
DROP POLICY IF EXISTS "nomeados_audit_ins" ON nomeados_audit;

CREATE POLICY "nomeados_audit_sel" ON nomeados_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nomeados_audit_ins" ON nomeados_audit
  FOR INSERT TO authenticated WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- 7. ÍNDICES
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_nomeados_ministerio_id
  ON nomeados(ministerio_id) WHERE ministerio_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_dept_id
  ON nomeados(dept_id) WHERE dept_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_origem
  ON nomeados(origem);

CREATE INDEX IF NOT EXISTS idx_nomeados_encerrado
  ON nomeados(encerrado_em) WHERE encerrado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_audit_nomeado
  ON nomeados_audit(nomeado_id);

-- ────────────────────────────────────────────────────────────────
-- 8. VERIFICAÇÃO
-- ────────────────────────────────────────────────────────────────

SELECT
  origem,
  tipo_nomeacao,
  funcao_lider,
  tipo_membro,
  COUNT(*)                                        AS total,
  COUNT(ministerio_id)                            AS com_ministerio_id,
  COUNT(dept_id)                                  AS com_dept_id
FROM nomeados
WHERE deleted_at IS NULL
GROUP BY origem, tipo_nomeacao, funcao_lider, tipo_membro
ORDER BY origem, tipo_nomeacao, funcao_lider, tipo_membro;
