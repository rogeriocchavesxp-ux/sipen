-- ================================================================
-- SIPEN — Vincula Rafael Franco à IP Jardim Piratininga em nomeados
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- Preview: confirmar pessoa e congregação
SELECT p.id AS pessoa_id, p.nome
FROM pessoas p
WHERE p.nome ILIKE '%rafael%franco%';

-- Inserir vínculo
INSERT INTO public.nomeados (pessoa_id, orgao_tipo, orgao, congregacao_id, cargo, status)
SELECT
  p.id,
  'congregacao',
  c.nome,
  c.id,
  'Diácono',
  'ativo'
FROM pessoas p, congregacoes c
WHERE p.nome ILIKE '%rafael%franco%'
  AND c.nome = 'IP Jardim Piratininga'
  AND c.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Verificar
SELECT n.id, p.nome, n.orgao, n.cargo, n.congregacao_id, c.nome AS congregacao
FROM nomeados n
JOIN pessoas p ON p.id = n.pessoa_id
JOIN congregacoes c ON c.id = n.congregacao_id
WHERE p.nome ILIKE '%rafael%franco%';
