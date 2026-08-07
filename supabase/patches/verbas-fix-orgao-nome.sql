-- Corrige o campo orgao de verbas_aprovadas para usar o nome completo
-- (sem prefixo de sigla), alinhando com o valor que o dropdown de demandas usa.
-- Executar UMA VEZ no Supabase SQL Editor.

UPDATE verbas_aprovadas
SET orgao = 'Sociedade Auxiliadora Feminina'
WHERE orgao = 'SAF – Sociedade Auxiliadora Feminina';

UPDATE verbas_aprovadas
SET orgao = 'União da Mocidade Presbiteriana'
WHERE orgao = 'UMP – União da Mocidade Presbiteriana';

UPDATE verbas_aprovadas
SET orgao = 'União das Crianças Presbiterianas'
WHERE orgao = 'UCP – União das Crianças Presbiterianas';

-- Verificar resultado:
SELECT orgao, ano, valor FROM verbas_aprovadas ORDER BY orgao, ano;
