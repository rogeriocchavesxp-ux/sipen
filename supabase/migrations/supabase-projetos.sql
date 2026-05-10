-- ═══════════════════════════════════════════════════════
-- SIPEN — Projetos & Acompanhamento
-- Tabelas, trigger e RLS do MVP
-- Execute no SQL Editor do Supabase antes de usar o módulo.
-- ═══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.projetos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  tipo            TEXT NOT NULL CHECK (tipo IN ('obra','legal','infraestrutura','administrativo')),
  status          TEXT NOT NULL DEFAULT 'planejamento'
                  CHECK (status IN ('planejamento','em_andamento','pausado','concluido')),
  prioridade      TEXT NOT NULL DEFAULT 'media'
                  CHECK (prioridade IN ('baixa','media','alta','critica')),
  responsavel_id  UUID REFERENCES public.membros(id),
  data_inicio     DATE,
  data_prevista   DATE,
  data_conclusao  DATE,
  created_by      UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projeto_etapas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id     UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','em_andamento','concluido')),
  responsavel_id UUID REFERENCES public.membros(id),
  data_limite    DATE,
  ordem          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projetos_updated_at ON public.projetos;
CREATE TRIGGER trg_projetos_updated_at
BEFORE UPDATE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Função auxiliar: verifica se o usuário logado pode editar projetos
CREATE OR REPLACE FUNCTION public.pode_editar_projetos()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas pe
    JOIN public.membros m   ON m.pessoa_id  = pe.id
    JOIN public.perfis pf   ON UPPER(pf.nome) = UPPER(m.funcao)
    JOIN public.perfis_permissoes pp ON pp.perfil_id = pf.id
    WHERE pe.auth_user_id = auth.uid()
      AND m.status = 'ativo'
      AND pp.modulo = 'PROJETOS'
      AND pp.nivel_acesso IN ('EDICAO', 'COMPLETO')
  );
$$;

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proj_select ON public.projetos;
DROP POLICY IF EXISTS proj_insert ON public.projetos;
DROP POLICY IF EXISTS proj_update ON public.projetos;
DROP POLICY IF EXISTS proj_delete ON public.projetos;
DROP POLICY IF EXISTS etapa_select ON public.projeto_etapas;
DROP POLICY IF EXISTS etapa_insert ON public.projeto_etapas;
DROP POLICY IF EXISTS etapa_update ON public.projeto_etapas;
DROP POLICY IF EXISTS etapa_delete ON public.projeto_etapas;

-- projetos: leitura aberta a autenticados; escrita restrita por permissão
CREATE POLICY proj_select ON public.projetos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY proj_insert ON public.projetos
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_editar_projetos());

CREATE POLICY proj_update ON public.projetos
  FOR UPDATE TO authenticated
  USING  (public.pode_editar_projetos())
  WITH CHECK (public.pode_editar_projetos());

CREATE POLICY proj_delete ON public.projetos
  FOR DELETE TO authenticated USING (public.is_admin());

-- projeto_etapas: mesma lógica (etapas pertencem ao projeto)
CREATE POLICY etapa_select ON public.projeto_etapas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY etapa_insert ON public.projeto_etapas
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_editar_projetos());

CREATE POLICY etapa_update ON public.projeto_etapas
  FOR UPDATE TO authenticated
  USING  (public.pode_editar_projetos())
  WITH CHECK (public.pode_editar_projetos());

CREATE POLICY etapa_delete ON public.projeto_etapas
  FOR DELETE TO authenticated
  USING (public.pode_editar_projetos());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_etapas TO authenticated;
REVOKE ALL ON public.projetos FROM anon;
REVOKE ALL ON public.projeto_etapas FROM anon;
