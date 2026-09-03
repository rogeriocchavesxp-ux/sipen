-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Mini-currículo do candidato
-- Adiciona perfil (vida familiar, eclesiástica, profissional, foto)
-- e token de acesso público para preenchimento pelo próprio candidato.
-- Execute no Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Novas colunas em eleicao_candidatos ───────────────────
ALTER TABLE public.eleicao_candidatos
  ADD COLUMN IF NOT EXISTS token_perfil      UUID    DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS vida_familiar     TEXT,
  ADD COLUMN IF NOT EXISTS vida_eclesiastica TEXT,
  ADD COLUMN IF NOT EXISTS vida_profissional TEXT,
  ADD COLUMN IF NOT EXISTS foto_url          TEXT;

-- Backfill: gerar token para candidatos já existentes
UPDATE public.eleicao_candidatos
   SET token_perfil = gen_random_uuid()
 WHERE token_perfil IS NULL;

ALTER TABLE public.eleicao_candidatos
  ALTER COLUMN token_perfil SET DEFAULT gen_random_uuid(),
  ALTER COLUMN token_perfil SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eleicao_cand_token
  ON public.eleicao_candidatos (token_perfil)
  WHERE deleted_at IS NULL;

-- ── 2. Função pública para salvar o perfil via token ─────────
CREATE OR REPLACE FUNCTION public.eleicao_salvar_perfil(
  p_token             UUID,
  p_vida_familiar     TEXT DEFAULT NULL,
  p_vida_eclesiastica TEXT DEFAULT NULL,
  p_vida_profissional TEXT DEFAULT NULL,
  p_foto_url          TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
    FROM public.eleicao_candidatos
   WHERE token_perfil = p_token
     AND deleted_at IS NULL
     AND ativo = true
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Link inválido ou candidato não encontrado.');
  END IF;

  UPDATE public.eleicao_candidatos SET
    vida_familiar      = NULLIF(trim(COALESCE(p_vida_familiar, vida_familiar, '')), ''),
    vida_eclesiastica  = NULLIF(trim(COALESCE(p_vida_eclesiastica, vida_eclesiastica, '')), ''),
    vida_profissional  = NULLIF(trim(COALESCE(p_vida_profissional, vida_profissional, '')), ''),
    foto_url           = CASE WHEN p_foto_url IS NOT NULL THEN NULLIF(p_foto_url,'') ELSE foto_url END
  WHERE id = v_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.eleicao_salvar_perfil TO anon;
GRANT EXECUTE ON FUNCTION public.eleicao_salvar_perfil TO authenticated;

-- ── 3. Função pública para carregar perfil via token ─────────
CREATE OR REPLACE FUNCTION public.eleicao_perfil_por_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT id, nome, tipo, congregacao,
         vida_familiar, vida_eclesiastica, vida_profissional, foto_url
    INTO v_row
    FROM public.eleicao_candidatos
   WHERE token_perfil = p_token
     AND deleted_at IS NULL
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'erro', 'Link inválido.');
  END IF;

  RETURN json_build_object(
    'ok',    true,
    'id',    v_row.id,
    'nome',  v_row.nome,
    'tipo',  v_row.tipo,
    'congregacao',       v_row.congregacao,
    'vida_familiar',     v_row.vida_familiar,
    'vida_eclesiastica', v_row.vida_eclesiastica,
    'vida_profissional', v_row.vida_profissional,
    'foto_url',          v_row.foto_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.eleicao_perfil_por_token TO anon;
GRANT EXECUTE ON FUNCTION public.eleicao_perfil_por_token TO authenticated;
