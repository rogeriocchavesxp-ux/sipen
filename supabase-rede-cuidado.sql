-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Rede de Cuidado Pastoral Progressivo
-- Executar no SQL Editor do Supabase Dashboard.
-- Idempotente: seguro para rodar múltiplas vezes.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. TABELA PRINCIPAL ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rede_cuidado (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cuidador_id   uuid        NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  cuidado_id    uuid        NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  nivel         integer     NOT NULL DEFAULT 1 CHECK (nivel >= 1),
  ativo         boolean     NOT NULL DEFAULT true,
  observacoes   text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  criado_por    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  inativado_em  timestamptz,
  inativado_por uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Garante que uma pessoa ativa só pode ter UM cuidador ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_rede_cuidado_cuidado_unico
  ON public.rede_cuidado(cuidado_id)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_rede_cuidado_cuidador
  ON public.rede_cuidado(cuidador_id);

CREATE INDEX IF NOT EXISTS idx_rede_cuidado_nivel
  ON public.rede_cuidado(nivel);


-- ── 2. RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.rede_cuidado ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
DROP POLICY IF EXISTS "rede_cuidado_admin_all" ON public.rede_cuidado;
CREATE POLICY "rede_cuidado_admin_all"
  ON public.rede_cuidado
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.membros m
      JOIN public.pessoas p ON p.id = m.pessoa_id
      WHERE p.auth_user_id = auth.uid()
        AND m.funcao IN ('ADMINISTRADOR_GERAL','admin_geral','PASTORAL','pastoral','pastor','PASTOR')
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.membros m
      JOIN public.pessoas p ON p.id = m.pessoa_id
      WHERE p.auth_user_id = auth.uid()
        AND m.funcao IN ('ADMINISTRADOR_GERAL','admin_geral','PASTORAL','pastoral','pastor','PASTOR')
        AND m.status = 'ativo'
        AND m.deleted_at IS NULL
    )
  );

-- Líder (cuidador) vê apenas seus próprios vínculos
DROP POLICY IF EXISTS "rede_cuidado_lider_select" ON public.rede_cuidado;
CREATE POLICY "rede_cuidado_lider_select"
  ON public.rede_cuidado
  FOR SELECT
  TO authenticated
  USING (
    cuidador_id IN (
      SELECT p.id FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Pessoa cuidada pode ver quem é seu cuidador
DROP POLICY IF EXISTS "rede_cuidado_cuidado_select" ON public.rede_cuidado;
CREATE POLICY "rede_cuidado_cuidado_select"
  ON public.rede_cuidado
  FOR SELECT
  TO authenticated
  USING (
    cuidado_id IN (
      SELECT p.id FROM public.pessoas p
      WHERE p.auth_user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- service_role: acesso total (RPCs SECURITY DEFINER)
DROP POLICY IF EXISTS "rede_cuidado_service_all" ON public.rede_cuidado;
CREATE POLICY "rede_cuidado_service_all"
  ON public.rede_cuidado
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 3. RPC: adicionar_membro_rede_cuidado ─────────────────────────────
-- Executa como SECURITY DEFINER para garantir atomicidade.
-- Retorna: {"ok": true} ou {"ok": false, "erro": "mensagem"}

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

  -- 1. Não pode cuidar de si mesmo
  IF p_cuidador_id = p_cuidado_id THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'O cuidador não pode ser vinculado a si mesmo.');
  END IF;

  -- 2. Verifica se o cuidador existe em pessoas
  IF NOT EXISTS (SELECT 1 FROM public.pessoas WHERE id = p_cuidador_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cuidador não encontrado.');
  END IF;

  -- 3. Verifica se o cuidado existe em pessoas
  IF NOT EXISTS (SELECT 1 FROM public.pessoas WHERE id = p_cuidado_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Membro a ser cuidado não encontrado.');
  END IF;

  -- 4. Conta vínculos ativos do cuidador (limite: 5)
  SELECT COUNT(*) INTO v_count
  FROM public.rede_cuidado
  WHERE cuidador_id = p_cuidador_id
    AND ativo = true;

  IF v_count >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cuidador já atingiu o limite de 5 pessoas sob seu cuidado.');
  END IF;

  -- 5. Verifica se o membro já tem cuidador ativo
  SELECT EXISTS(
    SELECT 1 FROM public.rede_cuidado
    WHERE cuidado_id = p_cuidado_id AND ativo = true
  ) INTO v_existe;

  IF v_existe THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este membro já está vinculado a outro cuidador na Rede de Cuidado.');
  END IF;

  -- 6. Insere o vínculo
  INSERT INTO public.rede_cuidado (cuidador_id, cuidado_id, nivel, observacoes, criado_por)
  VALUES (p_cuidador_id, p_cuidado_id, p_nivel, p_obs, v_auth_id);

  RETURN jsonb_build_object('ok', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este membro já está vinculado a outro cuidador na Rede de Cuidado.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Erro interno: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.adicionar_membro_rede_cuidado TO authenticated;


-- ── 4. RPC: remover_membro_rede_cuidado ───────────────────────────────
-- Soft delete: marca ativo=false, registra quem removeu e quando.
-- Retorna: {"ok": true} ou {"ok": false, "erro": "mensagem"}

CREATE OR REPLACE FUNCTION public.remover_membro_rede_cuidado(
  p_vinculo_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vinculo   public.rede_cuidado%ROWTYPE;
  v_auth_id   uuid;
  v_pessoa_id uuid;
  v_is_admin  boolean := false;
BEGIN
  v_auth_id := auth.uid();

  -- Busca pessoa do usuário logado
  SELECT p.id INTO v_pessoa_id
  FROM public.pessoas p
  WHERE p.auth_user_id = v_auth_id AND p.deleted_at IS NULL
  LIMIT 1;

  -- Verifica se é admin ou pastor
  SELECT EXISTS(
    SELECT 1 FROM public.membros m
    WHERE m.pessoa_id = v_pessoa_id
      AND m.funcao IN ('ADMINISTRADOR_GERAL','admin_geral','PASTORAL','pastoral','pastor','PASTOR')
      AND m.status = 'ativo'
      AND m.deleted_at IS NULL
  ) INTO v_is_admin;

  -- Busca o vínculo
  SELECT * INTO v_vinculo
  FROM public.rede_cuidado
  WHERE id = p_vinculo_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Vínculo não encontrado ou já inativo.');
  END IF;

  -- Verifica permissão: apenas o próprio cuidador ou admin
  IF NOT v_is_admin AND v_vinculo.cuidador_id <> v_pessoa_id THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão para remover este vínculo.');
  END IF;

  -- Soft delete
  UPDATE public.rede_cuidado
  SET ativo         = false,
      inativado_em  = now(),
      inativado_por = v_auth_id
  WHERE id = p_vinculo_id;

  RETURN jsonb_build_object('ok', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Erro interno: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_membro_rede_cuidado TO authenticated;


-- ── 5. VIEW ADMINISTRATIVA ─────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_rede_cuidado AS
SELECT
  rc.id,
  rc.nivel,
  rc.ativo,
  rc.observacoes,
  rc.criado_em,
  rc.cuidador_id,
  pc.nome   AS cuidador_nome,
  rc.cuidado_id,
  pd.nome   AS cuidado_nome,
  rc.inativado_em
FROM public.rede_cuidado rc
JOIN public.pessoas pc ON pc.id = rc.cuidador_id
JOIN public.pessoas pd ON pd.id = rc.cuidado_id
WHERE pc.deleted_at IS NULL
  AND pd.deleted_at IS NULL;

-- ── 6. GRANTS ──────────────────────────────────────────────────────────

GRANT SELECT ON public.v_rede_cuidado TO authenticated;

-- ── 7. FORÇAR RECARGA DO SCHEMA CACHE (PostgREST) ──────────────────────
-- Garante que as novas funções aparecem imediatamente via REST API.
NOTIFY pgrst, 'reload schema';

-- ── 8. VERIFICAÇÃO ─────────────────────────────────────────────────────
SELECT
  proname        AS funcao,
  pg_get_function_arguments(oid) AS parametros
FROM pg_proc
WHERE proname IN ('adicionar_membro_rede_cuidado', 'remover_membro_rede_cuidado')
  AND pronamespace = 'public'::regnamespace;
