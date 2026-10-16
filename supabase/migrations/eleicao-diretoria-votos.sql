-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Votação de Diretoria
-- Candidatos são cadastrados sem cargo; o cargo é definido na hora do voto.
-- Na cédula, todos os candidatos aparecem para cada cargo.
-- Execute no Supabase SQL Editor do projeto SIPEN
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela de votos de diretoria (cargo + candidato no momento do voto)
CREATE TABLE IF NOT EXISTS public.eleicao_votos_diretoria (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id  uuid        NOT NULL REFERENCES public.eleicao_processos(id) ON DELETE CASCADE,
  eleitor_id   uuid        NOT NULL,
  cargo        text        NOT NULL,
  candidato_id uuid        NOT NULL REFERENCES public.eleicao_candidatos(id),
  created_at   timestamptz DEFAULT now()
);

-- Um voto por eleitor por cargo por processo
CREATE UNIQUE INDEX IF NOT EXISTS eleicao_votos_diretoria_uq
  ON public.eleicao_votos_diretoria(processo_id, eleitor_id, cargo);

-- 2. RPC para registrar voto de diretoria
CREATE OR REPLACE FUNCTION public.registrar_voto_diretoria(
  p_slug       text,
  p_eleitor_id uuid,
  p_votos      jsonb   -- [{"cargo":"Vice-presidente","candidato_id":"uuid"}, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc eleicao_processos%ROWTYPE;
  v_cfg  eleicao_votacao_config%ROWTYPE;
  v_voto jsonb;
BEGIN
  SELECT * INTO v_proc
  FROM eleicao_processos
  WHERE slug = p_slug AND tipo = 'diretoria'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Processo não encontrado');
  END IF;

  IF EXISTS (
    SELECT 1 FROM eleicao_votos_registro
    WHERE processo_id = v_proc.id AND eleitor_id = p_eleitor_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'ja_votou', true);
  END IF;

  SELECT * INTO v_cfg
  FROM eleicao_votacao_config
  WHERE processo_id = v_proc.id
  LIMIT 1;

  IF v_cfg.status_votacao IS DISTINCT FROM 'aberta' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Votação não está aberta');
  END IF;

  FOR v_voto IN SELECT * FROM jsonb_array_elements(p_votos) LOOP
    IF (v_voto->>'cargo') IS NOT NULL AND (v_voto->>'candidato_id') IS NOT NULL THEN
      INSERT INTO eleicao_votos_diretoria(processo_id, eleitor_id, cargo, candidato_id)
      VALUES (
        v_proc.id,
        p_eleitor_id,
        v_voto->>'cargo',
        (v_voto->>'candidato_id')::uuid
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO eleicao_votos_registro(processo_id, eleitor_id)
  VALUES (v_proc.id, p_eleitor_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'diretoria', jsonb_array_length(p_votos));
END;
$$;
