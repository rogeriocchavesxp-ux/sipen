-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Votação pública: função registrar_voto + políticas anon
-- Execute no Supabase SQL Editor do projeto SIPEN (erhwryfzpycahgsohhbh).
-- Pré-requisito: votacao-oficiais.sql já executado.
-- ═══════════════════════════════════════════════════════════════

-- ── Acesso anon para leitura pública ────────────────────────────

-- Candidatos ativos visíveis na cédula
CREATE POLICY "anon_select_candidatos" ON public.eleicao_candidatos
  FOR SELECT TO anon
  USING (deleted_at IS NULL AND ativo = true);

-- Config da votação (datas, limites) visível sem login
CREATE POLICY "anon_select_votacao_config" ON public.eleicao_votacao_config
  FOR SELECT TO anon
  USING (true);

-- ── Função pública de votação (SECURITY DEFINER) ─────────────────
-- Recebe: slug do processo, pessoa_id do eleitor, array de candidato IDs.
-- Garante: sigilo (votos_registro ≠ votos), idempotência, limites por tipo.

DROP FUNCTION IF EXISTS public.registrar_voto(TEXT, UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.registrar_voto(
  p_slug       TEXT,
  p_eleitor_id UUID,
  p_candidatos UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc   eleicao_processos%ROWTYPE;
  v_config eleicao_votacao_config%ROWTYPE;
  v_cand   eleicao_candidatos%ROWTYPE;
  v_cid    UUID;
  v_presb  INT := 0;
  v_diac   INT := 0;
  v_now    TIMESTAMPTZ := NOW();
BEGIN
  -- Carrega processo
  SELECT * INTO v_proc FROM eleicao_processos
  WHERE slug = p_slug AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Processo não encontrado.');
  END IF;

  -- Carrega configuração da votação
  SELECT * INTO v_config FROM eleicao_votacao_config
  WHERE processo_id = v_proc.id;
  IF NOT FOUND OR v_config.status_votacao <> 'aberta' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'A votação não está aberta no momento.');
  END IF;

  -- Verifica datas
  IF v_config.data_abertura_votacao IS NOT NULL AND v_now::DATE < v_config.data_abertura_votacao THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'A votação ainda não foi aberta.');
  END IF;
  IF v_config.data_encerramento_votacao IS NOT NULL AND v_now::DATE > v_config.data_encerramento_votacao THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'O prazo de votação foi encerrado.');
  END IF;

  -- Verifica voto duplicado
  IF EXISTS (
    SELECT 1 FROM eleicao_votos_registro
    WHERE processo_id = v_proc.id AND eleitor_id = p_eleitor_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'ja_votou', true, 'erro', 'Você já votou neste processo.');
  END IF;

  -- Valida candidatos e conta por tipo
  IF array_length(p_candidatos, 1) IS NULL OR array_length(p_candidatos, 1) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Selecione ao menos um candidato.');
  END IF;

  FOREACH v_cid IN ARRAY p_candidatos LOOP
    SELECT * INTO v_cand FROM eleicao_candidatos
    WHERE id = v_cid AND processo_id = v_proc.id AND ativo = true AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Candidato inválido.');
    END IF;
    IF v_cand.tipo = 'presbitero' THEN v_presb := v_presb + 1; END IF;
    IF v_cand.tipo = 'diacono'    THEN v_diac  := v_diac  + 1; END IF;
  END LOOP;

  -- Valida limites
  IF v_presb > v_config.max_votos_presbiteros THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      format('Máximo de %s voto(s) para presbíteros.', v_config.max_votos_presbiteros));
  END IF;
  IF v_diac > v_config.max_votos_diaconos THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      format('Máximo de %s voto(s) para diáconos.', v_config.max_votos_diaconos));
  END IF;

  -- Registra que o eleitor votou (SEM revelar em quem)
  INSERT INTO eleicao_votos_registro (processo_id, eleitor_id, votou_em)
  VALUES (v_proc.id, p_eleitor_id, v_now);

  -- Registra os votos (SEM revelar quem votou)
  FOREACH v_cid IN ARRAY p_candidatos LOOP
    INSERT INTO eleicao_votos (processo_id, candidato_id, criado_em)
    VALUES (v_proc.id, v_cid, v_now);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'total', array_length(p_candidatos, 1),
    'presbiteros', v_presb,
    'diaconos', v_diac
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.registrar_voto(TEXT, UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_voto(TEXT, UUID, UUID[]) TO anon, authenticated;
