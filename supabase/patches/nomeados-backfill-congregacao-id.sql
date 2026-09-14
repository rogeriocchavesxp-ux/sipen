-- ================================================================
-- SIPEN — Backfill congregacao_id em nomeados
-- Preenche congregacao_id onde está NULL, cruzando pelo nome do órgão
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Preview: ver o que será atualizado
SELECT
  n.id,
  p.nome AS pessoa,
  n.orgao,
  n.cargo,
  n.congregacao_id AS id_antes,
  c.id             AS id_que_sera_preenchido,
  c.nome           AS congregacao_encontrada
FROM nomeados n
JOIN pessoas p ON p.id = n.pessoa_id
LEFT JOIN congregacoes c
  ON LOWER(TRIM(c.nome)) = LOWER(TRIM(n.orgao))
  AND c.deleted_at IS NULL
WHERE n.orgao_tipo = 'congregacao'
  AND n.congregacao_id IS NULL
  AND n.status = 'ativo'
ORDER BY p.nome;

-- 2. Executar o backfill
UPDATE public.nomeados n
SET congregacao_id = c.id
FROM public.congregacoes c
WHERE n.orgao_tipo      = 'congregacao'
  AND n.congregacao_id  IS NULL
  AND n.status          = 'ativo'
  AND c.deleted_at      IS NULL
  AND LOWER(TRIM(c.nome)) = LOWER(TRIM(n.orgao));

-- 3. Verificar resultado
SELECT
  n.id,
  p.nome AS pessoa,
  n.orgao,
  n.cargo,
  n.congregacao_id,
  c.nome AS congregacao_vinculada
FROM nomeados n
JOIN pessoas p ON p.id = n.pessoa_id
LEFT JOIN congregacoes c ON c.id = n.congregacao_id
WHERE n.orgao_tipo = 'congregacao'
  AND n.status = 'ativo'
ORDER BY p.nome;
