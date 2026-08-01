-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Auditoria: Vincular pastores → pessoas
-- audit-03-pastores-pessoa-id.sql
-- Idempotente. Executar no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════
-- OBJETIVO: adicionar pessoa_id à tabela pastores para vincular
-- o registro de pregação ao cadastro central de pessoas.
-- NÃO remove a tabela pastores — escala_pregacao.pastor_id ainda
-- depende dessa FK.
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Adicionar pessoa_id ─────────────────────────────────

ALTER TABLE public.pastores
  ADD COLUMN IF NOT EXISTS pessoa_id UUID
  REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pastores_pessoa_id
  ON public.pastores(pessoa_id)
  WHERE pessoa_id IS NOT NULL;

-- ── PASSO 2: Backfill via oficiais (cargo = pastor) ──────────────
-- Relaciona pastor → oficial → pessoa pelo nome.
-- Tenta primeiro via oficiais (mais preciso).

UPDATE public.pastores p
SET pessoa_id = o.pessoa_id
FROM public.oficiais o
JOIN public.pessoas ps ON ps.id = o.pessoa_id
WHERE p.pessoa_id IS NULL
  AND o.deleted_at IS NULL
  AND ps.deleted_at IS NULL
  AND o.cargo = 'pastor'
  AND (
    public.imm_unaccent(lower(trim(p.nome_completo)))
      = public.imm_unaccent(lower(trim(ps.nome)))
    OR
    public.imm_unaccent(lower(trim(p.nome_completo)))
      LIKE '%' || public.imm_unaccent(lower(split_part(trim(ps.nome), ' ', 1))) || '%'
  );

-- ── PASSO 3: Backfill direto de pessoas (fallback) ───────────────
-- Para pastores que não cruzaram via oficiais.

UPDATE public.pastores p
SET pessoa_id = (
  SELECT ps.id FROM public.pessoas ps
  WHERE ps.deleted_at IS NULL
    AND public.imm_unaccent(lower(trim(ps.nome)))
        = public.imm_unaccent(lower(trim(p.nome_completo)))
  LIMIT 1
)
WHERE p.pessoa_id IS NULL
  AND p.nome_completo IS NOT NULL;

-- ── PASSO 4: Auditoria pós-execução ──────────────────────────────
-- Execute para verificar quais pastores ainda não têm pessoa_id:
--
-- SELECT nome_completo, pessoa_id FROM public.pastores
-- WHERE deleted_at IS NULL
-- ORDER BY pessoa_id NULLS LAST, nome_completo;
--
-- Pastores sem pessoa_id precisam de vinculação manual.
-- Acesse o SIPEN → Escalas → Pastores e vincule individualmente.

NOTIFY pgrst, 'reload schema';
