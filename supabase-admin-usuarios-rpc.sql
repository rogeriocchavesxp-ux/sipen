-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Administração segura de usuários/acessos
-- Corrige "permission denied for table membros" em #config-usuarios.
--
-- Executar no SQL Editor do Supabase Dashboard.
-- Idempotente: seguro para rodar múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════

-- Leitura necessária para a tela Configurações > Usuários e Acessos.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.v_membros TO authenticated;
GRANT SELECT ON public.membros TO authenticated;

-- Não concedemos UPDATE direto em public.membros para anon/authenticated.
-- A alteração de perfil/status passa exclusivamente pela RPC abaixo.

CREATE OR REPLACE FUNCTION public.is_admin_sipen()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas p
    JOIN public.membros m ON m.pessoa_id = p.id
    WHERE p.auth_user_id = auth.uid()
      AND p.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.status = 'ativo'
      AND upper(regexp_replace(coalesce(m.funcao, ''), '[^A-Za-z0-9]+', '_', 'g'))
          IN ('ADMINISTRADOR_GERAL', 'ADMIN_GERAL')
  );
$$;

COMMENT ON FUNCTION public.is_admin_sipen()
IS 'Retorna true quando auth.uid() pertence a um membro ativo com perfil Administrador Geral no SIPEN.';

REVOKE ALL ON FUNCTION public.is_admin_sipen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_sipen() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_atualizar_acesso_membro(
  p_membro_id uuid,
  p_perfil_acesso text,
  p_ativo boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.status_membro_t;
  v_membro public.v_membros%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_admin_sipen() THEN
    RAISE EXCEPTION 'Apenas Administrador Geral pode alterar perfil/status de usuários.'
      USING ERRCODE = '42501';
  END IF;

  IF p_membro_id IS NULL THEN
    RAISE EXCEPTION 'ID do membro é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF p_ativo IS NOT NULL THEN
    v_status := CASE WHEN p_ativo
      THEN 'ativo'::public.status_membro_t
      ELSE 'inativo'::public.status_membro_t
    END;
  END IF;

  UPDATE public.membros m
     SET funcao = nullif(btrim(p_perfil_acesso), ''),
         status = coalesce(v_status, m.status)
   WHERE m.id = p_membro_id
     AND m.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado ou excluído.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT vm.*
    INTO v_membro
    FROM public.v_membros vm
   WHERE vm.id = p_membro_id;

  RETURN to_jsonb(v_membro);
END;
$$;

COMMENT ON FUNCTION public.admin_atualizar_acesso_membro(uuid, text, boolean)
IS 'Atualiza somente funcao e status de public.membros, mediante validação de Administrador Geral via auth.uid().';

REVOKE ALL ON FUNCTION public.admin_atualizar_acesso_membro(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_acesso_membro(uuid, text, boolean) TO authenticated;

-- Opcional para endurecer o modelo se grants amplos antigos foram aplicados:
-- REVOKE UPDATE ON public.membros FROM anon;
-- REVOKE UPDATE ON public.membros FROM authenticated;

-- ═══════════════════════════════════════════════════════════════
-- FIM
-- ═══════════════════════════════════════════════════════════════
