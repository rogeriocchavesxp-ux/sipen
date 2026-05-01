-- ============================================================
-- SIPEN — Migração de Segurança e Auditoria
-- Padrão: criado_por, criado_em, igreja_id em todas as tabelas
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 0. Adicionar igreja_id em pessoas ────────────────────────
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS igreja_id UUID;

-- ── 1. Tabela ministerios ─────────────────────────────────────
ALTER TABLE public.ministerios
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.ministerios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública ministerios"     ON public.ministerios;
DROP POLICY IF EXISTS "Escrita autenticada ministerios" ON public.ministerios;
DROP POLICY IF EXISTS ministerios_insert ON public.ministerios;
DROP POLICY IF EXISTS ministerios_select ON public.ministerios;
DROP POLICY IF EXISTS ministerios_update ON public.ministerios;
DROP POLICY IF EXISTS ministerios_delete ON public.ministerios;

CREATE POLICY ministerios_insert ON public.ministerios
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY ministerios_select ON public.ministerios
  FOR SELECT TO authenticated
  USING (
    igreja_id IS NULL  -- registros sem igreja_id visíveis a todos (migração)
    OR igreja_id IN (
      SELECT igreja_id FROM public.pessoas
      WHERE auth_user_id = auth.uid() AND igreja_id IS NOT NULL
    )
  );

CREATE POLICY ministerios_update ON public.ministerios
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

CREATE POLICY ministerios_delete ON public.ministerios
  FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

-- ── 2. Tabela ministerio_membros ──────────────────────────────
ALTER TABLE public.ministerio_membros
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.ministerio_membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública ministerio_membros"     ON public.ministerio_membros;
DROP POLICY IF EXISTS "Escrita autenticada ministerio_membros" ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_insert ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_select ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_update ON public.ministerio_membros;
DROP POLICY IF EXISTS ministerio_membros_delete ON public.ministerio_membros;

CREATE POLICY ministerio_membros_insert ON public.ministerio_membros
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY ministerio_membros_select ON public.ministerio_membros
  FOR SELECT TO authenticated
  USING (
    igreja_id IS NULL
    OR igreja_id IN (
      SELECT igreja_id FROM public.pessoas
      WHERE auth_user_id = auth.uid() AND igreja_id IS NOT NULL
    )
  );

CREATE POLICY ministerio_membros_update ON public.ministerio_membros
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

CREATE POLICY ministerio_membros_delete ON public.ministerio_membros
  FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR criado_por IS NULL);

-- ── 3. Demais tabelas: colunas de auditoria (sem RLS ainda) ──
-- Execute DEPOIS de atualizar o frontend para enviar o JWT do
-- usuário autenticado, caso contrário as queries existentes falham.

ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

ALTER TABLE public.atas
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS igreja_id  UUID;

-- ============================================================
-- FASE 2 (aplicar após migrar frontend de todos os módulos)
-- ============================================================
-- Para cada tabela acima, adicionar:
--
--   ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY <tabela>_select ON public.<tabela>
--     FOR SELECT TO authenticated
--     USING (
--       igreja_id IS NULL
--       OR igreja_id IN (SELECT igreja_id FROM public.pessoas WHERE auth_user_id = auth.uid())
--     );
--   CREATE POLICY <tabela>_insert ON public.<tabela>
--     FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());
--   CREATE POLICY <tabela>_update ON public.<tabela>
--     FOR UPDATE TO authenticated USING (criado_por = auth.uid() OR criado_por IS NULL);
--   CREATE POLICY <tabela>_delete ON public.<tabela>
--     FOR DELETE TO authenticated USING (criado_por = auth.uid() OR criado_por IS NULL);
-- ============================================================
