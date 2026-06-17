-- ══════════════════════════════════════════════════════════════════
-- SIPEN — Limpeza de Demandas Duplicadas
-- Executar no Supabase SQL Editor (Dashboard > SQL Editor)
-- ══════════════════════════════════════════════════════════════════

-- ── PASSO 1: Diagnóstico — listar duplicatas existentes ──────────
-- Execute este bloco PRIMEIRO para verificar o que existe antes de apagar.

SELECT
  titulo,
  area,
  solicitante,
  data_abertura::date,
  COUNT(*)  AS total_duplicatas,
  MIN(id)   AS manter_id,
  ARRAY_AGG(id ORDER BY id) AS todos_ids
FROM demandas
GROUP BY titulo, area, solicitante, data_abertura::date
HAVING COUNT(*) > 1
ORDER BY total_duplicatas DESC, data_abertura DESC;


-- ── PASSO 2: Preview dos registros a excluir ────────────────────
-- Mostra quais IDs serão removidos (os mais recentes de cada grupo).
-- NÃO apaga nada ainda.

WITH grupos AS (
  SELECT
    id,
    titulo,
    area,
    solicitante,
    data_abertura::date AS dt,
    ROW_NUMBER() OVER (
      PARTITION BY titulo, area, solicitante, data_abertura::date
      ORDER BY id ASC          -- mantém o mais antigo (menor id)
    ) AS rn
  FROM demandas
)
SELECT id, titulo, area, solicitante, dt
FROM grupos
WHERE rn > 1
ORDER BY titulo, dt;


-- ── PASSO 3: Migrar andamentos dos registros a excluir ──────────
-- Reatribui os andamentos dos duplicados para o registro canônico
-- (o de menor ID), preservando o histórico completo.

WITH grupos AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY titulo, area, solicitante, data_abertura::date
    ) AS id_canonico
  FROM demandas
),
duplicados AS (
  SELECT id, id_canonico FROM grupos WHERE id <> id_canonico
)
UPDATE demanda_andamentos a
SET demanda_id = d.id_canonico
FROM duplicados d
WHERE a.demanda_id = d.id;


-- ── PASSO 4: Excluir os registros duplicados ────────────────────
-- Só execute após confirmar o PASSO 2 e rodar o PASSO 3.

WITH grupos AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY titulo, area, solicitante, data_abertura::date
      ORDER BY id ASC
    ) AS rn
  FROM demandas
)
DELETE FROM demandas
WHERE id IN (SELECT id FROM grupos WHERE rn > 1);


-- ── PASSO 5: Verificação final ──────────────────────────────────
-- Deve retornar 0 linhas após a limpeza.

SELECT
  titulo, area, solicitante, data_abertura::date, COUNT(*) AS duplicatas
FROM demandas
GROUP BY titulo, area, solicitante, data_abertura::date
HAVING COUNT(*) > 1;
