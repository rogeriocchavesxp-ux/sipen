-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Migra controle_estacionamento_controles: membro_id → pessoa_id
-- Permite vincular qualquer pessoa (membro ou não) a um controle.
-- Execute no SQL Editor do Supabase. Idempotente.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Adiciona coluna pessoa_id ────────────────────────────────────────
ALTER TABLE public.controle_estacionamento_controles
  ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- ── 2. Migra dados existentes (membro_id → pessoa_id via membros) ───────
UPDATE public.controle_estacionamento_controles c
SET pessoa_id = m.pessoa_id
FROM public.membros m
WHERE c.membro_id = m.id
  AND c.pessoa_id IS NULL;

-- ── 3. Remove índice e coluna antiga ────────────────────────────────────
DROP INDEX IF EXISTS public.idx_ce_controles_membro;

ALTER TABLE public.controle_estacionamento_controles
  DROP COLUMN IF EXISTS membro_id;

-- ── 4. Cria índice na nova coluna ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ce_controles_pessoa
  ON public.controle_estacionamento_controles(pessoa_id);

-- ── 5. Reload schema cache ──────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 6. Verificação ──────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'controle_estacionamento_controles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
