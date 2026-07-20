-- Remove congregações fictícias/demo e seus membros vinculados
-- Executar no SQL Editor do Supabase

-- 1. Excluir membros vinculados a essas congregações
DELETE FROM membros
WHERE congregacao_id IN (
  SELECT id FROM congregacoes
  WHERE nome IN (
    'Belém',
    'Campinas',
    'Domitila',
    'IP Anália Franco',
    'IP Hispana (Cangaíba)',
    'Novo Mundo',
    'Penha 2',
    'Penha 3 - Adolescentes',
    'Ponte Rasa',
    'Tatuapé 1'
  )
);

-- 2. Remover as congregações fictícias
-- (demais FKs têm ON DELETE SET NULL e serão tratadas automaticamente)
DELETE FROM congregacoes
WHERE nome IN (
  'Belém',
  'Campinas',
  'Domitila',
  'IP Anália Franco',
  'IP Hispana (Cangaíba)',
  'Novo Mundo',
  'Penha 2',
  'Penha 3 - Adolescentes',
  'Ponte Rasa',
  'Tatuapé 1'
);

-- Confirmar o que ficou:
-- SELECT nome FROM congregacoes ORDER BY nome;
