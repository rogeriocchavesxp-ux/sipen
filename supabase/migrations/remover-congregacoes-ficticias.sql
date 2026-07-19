-- Remove congregações fictícias/demo da base de dados
-- Executar no SQL Editor do Supabase

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

-- Confirmar o que foi removido:
-- SELECT nome FROM congregacoes ORDER BY nome;
