-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Participantes Externos
-- Pessoas que precisam estar no sistema sem serem membros da igreja.
-- Ex: homeschool, acesso controlado, responsáveis, convidados.
-- Execute no SQL Editor do Supabase Dashboard. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. TABELA ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.participantes_externos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   uuid        NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  tipo        text        NOT NULL CHECK (tipo IN (
                'homeschool','acesso_controlado','responsavel',
                'convidado','operacional','outro')),
  descricao   text,
  observacoes text,
  ativo       boolean     NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pext_pessoa_tipo
  ON public.participantes_externos(pessoa_id, tipo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pext_tipo
  ON public.participantes_externos(tipo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pext_ativo
  ON public.participantes_externos(ativo)
  WHERE deleted_at IS NULL;

-- ── 2. updated_at automático ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._pext_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_pext_updated_at ON public.participantes_externos;
CREATE TRIGGER trg_pext_updated_at
  BEFORE UPDATE ON public.participantes_externos
  FOR EACH ROW EXECUTE FUNCTION public._pext_set_updated_at();

-- ── 3. RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.participantes_externos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pext_authenticated_select" ON public.participantes_externos;
CREATE POLICY "pext_authenticated_select"
  ON public.participantes_externos FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "pext_authenticated_insert" ON public.participantes_externos;
CREATE POLICY "pext_authenticated_insert"
  ON public.participantes_externos FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "pext_authenticated_update" ON public.participantes_externos;
CREATE POLICY "pext_authenticated_update"
  ON public.participantes_externos FOR UPDATE TO authenticated
  USING (deleted_at IS NULL) WITH CHECK (true);

DROP POLICY IF EXISTS "pext_service_all" ON public.participantes_externos;
CREATE POLICY "pext_service_all"
  ON public.participantes_externos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 4. RLS para pessoas (garantir leitura de externos) ─────────────────
-- A tabela pessoas já deve ter policy authenticated SELECT.
-- Verificar se existe; se não, criar:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pessoas' AND policyname = 'pessoas_authenticated_select'
  ) THEN
    EXECUTE 'CREATE POLICY "pessoas_authenticated_select"
      ON public.pessoas FOR SELECT TO authenticated
      USING (deleted_at IS NULL)';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "pessoas_authenticated_insert" ON public.pessoas;
CREATE POLICY "pessoas_authenticated_insert"
  ON public.pessoas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pessoas_authenticated_update" ON public.pessoas;
CREATE POLICY "pessoas_authenticated_update"
  ON public.pessoas FOR UPDATE TO authenticated
  USING (deleted_at IS NULL) WITH CHECK (true);

-- ── 5. VIEW ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_participantes_externos AS
SELECT
  pe.id,
  pe.tipo,
  pe.descricao,
  pe.observacoes,
  pe.ativo,
  pe.criado_em,
  pe.updated_at,
  pe.pessoa_id,
  p.nome,
  p.email,
  p.telefone,
  p.celular,
  p.cpf,
  p.data_nascimento,
  p.endereco,
  p.numero,
  p.complemento,
  p.bairro,
  p.cidade,
  p.estado,
  p.cep,
  p.observacoes AS pessoa_obs
FROM public.participantes_externos pe
JOIN public.pessoas p ON p.id = pe.pessoa_id
WHERE pe.deleted_at IS NULL
  AND p.deleted_at IS NULL;

GRANT SELECT ON public.v_participantes_externos TO authenticated;

-- ── 6. NOTIFY ───────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 7. VERIFICAÇÃO ──────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'participantes_externos' AND table_schema = 'public'
ORDER BY ordinal_position;
