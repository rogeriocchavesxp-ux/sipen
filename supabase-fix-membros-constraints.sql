-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: constraints CHECK da tabela membros
-- Execute no SQL Editor do Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════

-- ── 1. AUDITORIA: ver TODAS as constraints e o que elas verificam ───────
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
     AND tc.constraint_catalog = cc.constraint_catalog
     AND tc.constraint_schema  = cc.constraint_schema
WHERE tc.table_name    = 'membros'
  AND tc.table_schema  = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- ── 2. AUDITORIA: colunas da tabela (sem referenciar colunas inexistentes)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'membros' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ══════════════════════════════════════════════════════════════
-- EXECUTE os dois SELECTs acima e cole os resultados aqui
-- antes de prosseguir — ou continue diretamente com a correção.
-- ══════════════════════════════════════════════════════════════

-- ── 3. CORREÇÃO: remover constraint problemática (pelo nome) ────────────
-- O constraint "membros_tipo_propriedade_check" existe mas a coluna
-- tipo_propriedade não existe — foi criado com nome manual.
-- Removemos pelo nome sem precisar saber qual coluna ele checa.
ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_propriedade_check;

-- ── 4. CORREÇÃO: tipo_membro ────────────────────────────────────────────
ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_membro_check;

UPDATE public.membros SET tipo_membro = 'comungante'
WHERE tipo_membro IN ('Comungante','COMUNGANTE','membro_comungante','Membro Comungante','MEMBRO')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_membro = 'nao_comungante'
WHERE tipo_membro IN (
  'Não Comungante','Nao Comungante','não_comungante','NAO_COMUNGANTE',
  'membro_nao_comungante','Não-Comungante','nao-comungante'
)
  AND deleted_at IS NULL;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_tipo_membro_check
  CHECK (tipo_membro IS NULL OR tipo_membro IN ('comungante','nao_comungante'));

-- ── 5. CORREÇÃO: tipo_ingresso ──────────────────────────────────────────
ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_ingresso_check;

UPDATE public.membros SET tipo_ingresso = 'transferencia'
WHERE tipo_ingresso IN ('transferência','Transferência','Transferencia') AND deleted_at IS NULL;

UPDATE public.membros SET tipo_ingresso = 'profissao_de_fe'
WHERE tipo_ingresso IN ('profissão de fé','Profissão de Fé','profissão_de_fé','profissao de fe') AND deleted_at IS NULL;

UPDATE public.membros SET tipo_ingresso = 'restauracao'
WHERE tipo_ingresso IN ('restauração','Restauração','Restauracao') AND deleted_at IS NULL;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_tipo_ingresso_check
  CHECK (tipo_ingresso IS NULL OR tipo_ingresso IN ('batismo','profissao_de_fe','transferencia','restauracao','outro'));

-- ── 6. VERIFICAÇÃO FINAL ────────────────────────────────────────────────
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
     AND tc.constraint_catalog = cc.constraint_catalog
     AND tc.constraint_schema  = cc.constraint_schema
WHERE tc.table_name = 'membros' AND tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;
