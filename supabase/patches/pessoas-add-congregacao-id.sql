-- ================================================================
-- SIPEN — Adiciona congregacao_id em pessoas
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Adicionar coluna
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS congregacao_id uuid
  REFERENCES public.congregacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pessoas_congregacao
  ON public.pessoas(congregacao_id) WHERE congregacao_id IS NOT NULL;

-- 2. Backfill a partir de nomeados (usa congregacao_id já preenchido)
UPDATE public.pessoas p
SET congregacao_id = n.congregacao_id
FROM public.nomeados n
WHERE n.pessoa_id      = p.id
  AND n.orgao_tipo     = 'congregacao'
  AND n.status         = 'ativo'
  AND n.congregacao_id IS NOT NULL
  AND p.congregacao_id IS NULL;

-- 3. Verificar resultado
SELECT
  p.id,
  p.nome,
  p.congregacao_id,
  c.nome AS congregacao
FROM pessoas p
LEFT JOIN congregacoes c ON c.id = p.congregacao_id
WHERE p.congregacao_id IS NOT NULL
ORDER BY p.nome;
