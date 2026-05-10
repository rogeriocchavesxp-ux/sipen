-- ══════════════════════════════════════════════════════════════
-- SIPEN — RLS: membros e pessoas
-- Execute no SQL Editor do Supabase Dashboard.
-- Restringe escrita a perfis com acesso COMPLETO/EDICAO em MEMBRESIA.
-- ══════════════════════════════════════════════════════════════

-- Função auxiliar: verifica se o usuário logado pode editar membros
CREATE OR REPLACE FUNCTION public.pode_editar_membresia()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas pe
    JOIN public.membros m ON m.pessoa_id = pe.id
    WHERE pe.auth_user_id = auth.uid()
      AND m.status = 'ativo'
      AND UPPER(m.funcao) IN (
        'ADMINISTRADOR_GERAL',
        'PASTORAL',
        'ADM_OPERACIONAL'
      )
  );
$$;

-- ── RLS: membros ────────────────────────────────────────────

ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membros_select_auth"   ON public.membros;
DROP POLICY IF EXISTS "membros_insert_editor" ON public.membros;
DROP POLICY IF EXISTS "membros_update_editor" ON public.membros;
DROP POLICY IF EXISTS "membros_delete_admin"  ON public.membros;

-- Qualquer autenticado lê (necessário para carregarUsuarioLogado e is_admin)
CREATE POLICY "membros_select_auth"
  ON public.membros FOR SELECT TO authenticated
  USING (true);

-- Inserir e atualizar: apenas perfis com acesso COMPLETO em MEMBRESIA
CREATE POLICY "membros_insert_editor"
  ON public.membros FOR INSERT TO authenticated
  WITH CHECK (public.pode_editar_membresia());

CREATE POLICY "membros_update_editor"
  ON public.membros FOR UPDATE TO authenticated
  USING  (public.pode_editar_membresia())
  WITH CHECK (public.pode_editar_membresia());

-- Excluir: apenas ADMINISTRADOR_GERAL
CREATE POLICY "membros_delete_admin"
  ON public.membros FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── RLS: pessoas ────────────────────────────────────────────

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pessoas_select_auth"   ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_insert_editor" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_update_editor" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_delete_admin"  ON public.pessoas;

CREATE POLICY "pessoas_select_auth"
  ON public.pessoas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pessoas_insert_editor"
  ON public.pessoas FOR INSERT TO authenticated
  WITH CHECK (public.pode_editar_membresia());

CREATE POLICY "pessoas_update_editor"
  ON public.pessoas FOR UPDATE TO authenticated
  USING  (public.pode_editar_membresia())
  WITH CHECK (public.pode_editar_membresia());

CREATE POLICY "pessoas_delete_admin"
  ON public.pessoas FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── Verificação ──────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('membros', 'pessoas')
ORDER BY tablename, cmd;
