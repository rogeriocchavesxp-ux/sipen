-- SIPEN: RPC reenviar_termo
-- Garante registro em agenda_termo_aceites via SECURITY DEFINER (bypass RLS).
-- O insert direto pelo JS é bloqueado por RLS (sem policy de INSERT na tabela).

CREATE OR REPLACE FUNCTION public.reenviar_termo(p_agenda_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   public.agenda%ROWTYPE;
  v_token TEXT;
  v_termo UUID;
BEGIN
  SELECT * INTO v_row FROM public.agenda WHERE id = p_agenda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Agendamento não encontrado.');
  END IF;

  SELECT id INTO v_termo FROM public.agenda_termos WHERE ativo = true ORDER BY created_at DESC LIMIT 1;
  IF v_termo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum termo ativo configurado.');
  END IF;

  -- Reutiliza token existente ou gera novo
  IF v_row.token_termo IS NOT NULL THEN
    v_token := v_row.token_termo;
  ELSE
    v_token := replace(gen_random_uuid()::TEXT,'-','') || replace(gen_random_uuid()::TEXT,'-','');
    UPDATE public.agenda SET token_termo = v_token, status_termo = 'aguardando' WHERE id = p_agenda_id;
  END IF;

  -- Garante registro de aceite (ON CONFLICT ignora se token já existe)
  INSERT INTO public.agenda_termo_aceites (agenda_id, termo_id, nome_responsavel, token_acesso)
  VALUES (p_agenda_id, v_termo, v_row.solicitante_txt, v_token)
  ON CONFLICT (token_acesso) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reenviar_termo TO authenticated;
