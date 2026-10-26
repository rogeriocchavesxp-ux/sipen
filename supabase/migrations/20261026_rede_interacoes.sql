-- ══════════════════════════════════════════════════════════════════
-- Rede de Cuidado — Tabela de interações/contatos
-- 2026-10-26
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rede_interacoes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vinculo_id   UUID        NOT NULL REFERENCES rede_cuidado(id) ON DELETE CASCADE,
  cuidador_id  UUID        NOT NULL REFERENCES pessoas(id),
  cuidado_id   UUID        NOT NULL REFERENCES pessoas(id),
  tipo         TEXT        NOT NULL DEFAULT 'outro'
               CHECK (tipo IN ('ligacao','whatsapp','visita','outro')),
  observacao   TEXT,
  data_contato DATE        NOT NULL DEFAULT CURRENT_DATE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rede_interacoes_vinculo  ON rede_interacoes(vinculo_id);
CREATE INDEX IF NOT EXISTS idx_rede_interacoes_cuidador ON rede_interacoes(cuidador_id);
CREATE INDEX IF NOT EXISTS idx_rede_interacoes_data     ON rede_interacoes(data_contato DESC);

-- ── RPC: registrar interação ────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_interacao_rede(
  p_vinculo_id UUID,
  p_tipo       TEXT    DEFAULT 'outro',
  p_observacao TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_cuidador_id UUID;
  v_cuidado_id  UUID;
  v_new_id      UUID;
BEGIN
  SELECT cuidador_id, cuidado_id
    INTO v_cuidador_id, v_cuidado_id
    FROM rede_cuidado
   WHERE id = p_vinculo_id AND ativo = true;

  IF v_cuidador_id IS NULL THEN
    RAISE EXCEPTION 'Vínculo não encontrado';
  END IF;

  INSERT INTO rede_interacoes(vinculo_id, cuidador_id, cuidado_id, tipo, observacao)
  VALUES (p_vinculo_id, v_cuidador_id, v_cuidado_id, p_tipo, NULLIF(trim(p_observacao), ''))
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE rede_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ri_select_proprio" ON rede_interacoes
  FOR SELECT USING (
    cuidador_id IN (
      SELECT id FROM pessoas WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM nomeados n
      JOIN pessoas p ON p.id = n.pessoa_id
      WHERE p.auth_user_id = auth.uid()
        AND n.status = 'ativo' AND n.deleted_at IS NULL
        AND (n.funcao_lider ILIKE ANY(ARRAY['%admin%','%pastor%','%pastoral%','%presbitero%','%presidente%'])
             OR n.cargo      ILIKE ANY(ARRAY['%admin%','%pastor%','%pastoral%']))
    )
  );

CREATE POLICY "ri_insert_proprio" ON rede_interacoes
  FOR INSERT WITH CHECK (
    cuidador_id IN (
      SELECT id FROM pessoas WHERE auth_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON rede_interacoes TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_interacao_rede TO authenticated;
