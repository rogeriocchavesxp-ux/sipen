-- Fix: contagem de vínculos ativos ignorava pessoas soft-deletadas
-- O RPC contava ativo=true na tabela base, incluindo linhas cujo cuidado_id
-- aponta para pessoas com deleted_at preenchido. Agora faz JOIN para excluí-las.

CREATE OR REPLACE FUNCTION public.adicionar_membro_rede_cuidado(
  p_cuidador_id uuid,
  p_cuidado_id  uuid,
  p_nivel       integer DEFAULT 1,
  p_obs         text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count   integer;
  v_existe  boolean;
  v_auth_id uuid;
BEGIN
  v_auth_id := auth.uid();

  IF p_cuidador_id = p_cuidado_id THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'O cuidador não pode ser vinculado a si mesmo.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pessoas WHERE id = p_cuidador_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cuidador não encontrado.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pessoas WHERE id = p_cuidado_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Membro a ser cuidado não encontrado.');
  END IF;

  -- Conta apenas vínculos ativos onde o cuidado não foi deletado
  SELECT COUNT(*) INTO v_count
  FROM public.rede_cuidado rc
  JOIN public.pessoas p ON p.id = rc.cuidado_id AND p.deleted_at IS NULL
  WHERE rc.cuidador_id = p_cuidador_id
    AND rc.ativo = true;

  IF v_count >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cuidador já atingiu o limite de 5 pessoas sob seu cuidado.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.rede_cuidado
    WHERE cuidado_id = p_cuidado_id AND ativo = true
  ) INTO v_existe;

  IF v_existe THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este membro já está vinculado a outro cuidador na Rede de Cuidado.');
  END IF;

  INSERT INTO public.rede_cuidado (cuidador_id, cuidado_id, nivel, observacoes, criado_por)
  VALUES (p_cuidador_id, p_cuidado_id, p_nivel, p_obs, v_auth_id);

  RETURN jsonb_build_object('ok', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este vínculo já existe.');
END;
$$;
