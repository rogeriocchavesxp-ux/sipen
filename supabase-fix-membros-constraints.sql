-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: todas as constraints CHECK da tabela membros
-- Corrige incompatibilidades entre colunas adicionadas via Supabase
-- e os valores enviados pelo frontend.
-- Execute no SQL Editor do Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════

-- ── 1. AUDITORIA: ver todas as constraints CHECK ativas ─────────────────
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name    = 'membros'
  AND tc.table_schema  = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- ── 2. AUDITORIA: ver todas as colunas da tabela membros ───────────────
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name   = 'membros'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ── 3. AUDITORIA: valores distintos em colunas com constraint ──────────
SELECT
  tipo_membro,
  tipo_ingresso,
  tipo_propriedade,
  COUNT(*) AS total
FROM public.membros
WHERE deleted_at IS NULL
GROUP BY tipo_membro, tipo_ingresso, tipo_propriedade
ORDER BY tipo_membro, tipo_ingresso, tipo_propriedade NULLS FIRST;

-- ══════════════════════════════════════════════════════════════
-- EXECUTE o bloco acima primeiro. Leia os resultados.
-- Depois execute o bloco de CORREÇÃO abaixo.
-- ══════════════════════════════════════════════════════════════

-- ── 4. CORREÇÃO: tipo_propriedade ───────────────────────────────────────
-- O frontend não envia tipo_propriedade. Precisamos de um DEFAULT
-- e de tornar a constraint permissiva com NULL.

-- 4a. Remover a constraint que bloqueia NULL
ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_propriedade_check;

-- 4b. Garantir que a coluna aceita NULL (caso seja NOT NULL)
ALTER TABLE public.membros ALTER COLUMN tipo_propriedade DROP NOT NULL;

-- 4c. Definir DEFAULT para que novos INSERTs sem esse campo não falhem
--     Substitua 'proprio' pelo valor que faz sentido no seu contexto,
--     ou mantenha NULL se o campo for opcional.
ALTER TABLE public.membros ALTER COLUMN tipo_propriedade SET DEFAULT NULL;

-- 4d. Recriar a constraint permitindo NULL (coluna opcional no frontend)
--     Ajuste os valores IN() conforme os valores válidos do seu banco.
--     (descomente e ajuste após ver os resultados do passo 1)
-- ALTER TABLE public.membros
--   ADD CONSTRAINT membros_tipo_propriedade_check
--   CHECK (tipo_propriedade IS NULL OR tipo_propriedade IN ('proprio','alugado','cedido','outro'));

-- ── 5. CORREÇÃO: tipo_membro ────────────────────────────────────────────
ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_membro_check;

-- Normalizar valores capitalizados existentes
UPDATE public.membros SET tipo_membro = 'comungante'
WHERE tipo_membro IN ('Comungante','COMUNGANTE','membro_comungante','Membro Comungante')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_membro = 'nao_comungante'
WHERE tipo_membro IN (
  'Não Comungante','Nao Comungante','não_comungante','NAO_COMUNGANTE',
  'membro_nao_comungante','Não-Comungante','nao-comungante'
)
  AND deleted_at IS NULL;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_tipo_membro_check
  CHECK (tipo_membro IS NULL OR tipo_membro IN ('comungante', 'nao_comungante'));

-- ── 6. CORREÇÃO: tipo_ingresso ──────────────────────────────────────────
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

-- ── 7. VERIFICAÇÃO FINAL ────────────────────────────────────────────────
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'membros' AND tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;
