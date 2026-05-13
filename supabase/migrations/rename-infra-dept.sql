-- Renomeia o departamento administrativo "Infraestrutura" → "Infraestrutura e Conservação"
-- Slug 'infraestrutura' permanece inalterado (chave técnica interna)

UPDATE dept_adm_setores
SET nome = 'Infraestrutura e Conservação'
WHERE slug = 'infraestrutura'
  AND nome = 'Infraestrutura';
