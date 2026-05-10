-- ══════════════════════════════════════════════════════════════
-- SIPEN — Fix: membros_tipo_membro_check + tipo_ingresso_check
-- Alinha constraints do banco com os valores enviados pelo frontend.
-- Valores canônicos do frontend:
--   tipo_membro  : 'comungante' | 'nao_comungante'
--   tipo_ingresso: 'batismo' | 'profissao_de_fe' | 'transferencia' | 'restauracao' | 'outro'
-- Execute no SQL Editor do Supabase Dashboard. Idempotente.
-- ══════════════════════════════════════════════════════════════

-- ── 1. DIAGNÓSTICO ──────────────────────────────────────────────────────

-- Constraints CHECK ativas na tabela membros
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'membros'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- Valores distintos atualmente na coluna
SELECT 'tipo_membro'   AS coluna, tipo_membro   AS valor, COUNT(*) AS total FROM public.membros WHERE deleted_at IS NULL GROUP BY tipo_membro
UNION ALL
SELECT 'tipo_ingresso' AS coluna, tipo_ingresso AS valor, COUNT(*) AS total FROM public.membros WHERE deleted_at IS NULL GROUP BY tipo_ingresso
ORDER BY coluna, valor;

-- ── 2. NORMALIZAR DADOS EXISTENTES ─────────────────────────────────────

-- tipo_membro
UPDATE public.membros SET tipo_membro = 'comungante'
WHERE tipo_membro IN ('Comungante','COMUNGANTE','membro_comungante','Membro Comungante')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_membro = 'nao_comungante'
WHERE tipo_membro IN (
  'Não Comungante','Nao Comungante','não_comungante','NAO_COMUNGANTE',
  'membro_nao_comungante','Não-Comungante','nao-comungante'
)
  AND deleted_at IS NULL;

-- tipo_ingresso (valores com acento → sem acento)
UPDATE public.membros SET tipo_ingresso = 'transferencia'
WHERE tipo_ingresso IN ('transferência','Transferência','Transferencia')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_ingresso = 'profissao_de_fe'
WHERE tipo_ingresso IN ('profissão de fé','Profissão de Fé','profissão_de_fé','profissao de fe')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_ingresso = 'restauracao'
WHERE tipo_ingresso IN ('restauração','Restauração','Restauracao')
  AND deleted_at IS NULL;

-- ── 3. RECRIAR CONSTRAINT tipo_membro ──────────────────────────────────

ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_membro_check;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_tipo_membro_check
  CHECK (tipo_membro IN ('comungante', 'nao_comungante'));

-- ── 4. RECRIAR CONSTRAINT tipo_ingresso ────────────────────────────────
-- (só executa se a constraint atual usar valores com acento)

ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_tipo_ingresso_check;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_tipo_ingresso_check
  CHECK (tipo_ingresso IN ('batismo','profissao_de_fe','transferencia','restauracao','outro'));

-- ── 5. VERIFICAÇÃO FINAL ────────────────────────────────────────────────

SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'membros'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

SELECT tipo_membro, tipo_ingresso, COUNT(*) FROM public.membros
WHERE deleted_at IS NULL
GROUP BY tipo_membro, tipo_ingresso
ORDER BY tipo_membro, tipo_ingresso;
