-- Gera cultos de novembro e dezembro de 2026
-- Domingos: domingo_manhã + domingo_noite
-- Quartas:  conexao_com_deus
-- ON CONFLICT DO NOTHING — seguro para rodar mais de uma vez

INSERT INTO public.escala_pregacao (data, culto_tipo, local, status, origem)
SELECT data, culto_tipo, 'Templo Principal', 'PENDENTE', 'automatico'
FROM (

  -- Domingos manhã
  SELECT d::date AS data, 'domingo_manha' AS culto_tipo
  FROM generate_series('2026-11-09'::date, '2026-12-31'::date, '1 day'::interval) d
  WHERE EXTRACT(DOW FROM d) = 0

  UNION ALL

  -- Domingos noite
  SELECT d::date, 'domingo_noite'
  FROM generate_series('2026-11-09'::date, '2026-12-31'::date, '1 day'::interval) d
  WHERE EXTRACT(DOW FROM d) = 0

  UNION ALL

  -- Quartas: Conexão com Deus
  SELECT d::date, 'conexao_com_deus'
  FROM generate_series('2026-11-09'::date, '2026-12-31'::date, '1 day'::interval) d
  WHERE EXTRACT(DOW FROM d) = 3

) sub
ON CONFLICT (data, culto_tipo) DO NOTHING;

-- Resultado esperado:
--   Domingos restantes de nov/dez: 15/11, 22/11, 29/11, 06/12, 13/12, 20/12, 27/12 → 14 slots
--   Quartas restantes de nov/dez:  11/11, 18/11, 25/11, 02/12, 09/12, 16/12, 23/12, 30/12 → 8 slots
--   Total: ~22 cultos novos
