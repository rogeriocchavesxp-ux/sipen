-- ══════════════════════════════════════════════════════════════════════════════
-- SIPEN — Auditoria e Limpeza de Duplicatas em pessoas
-- Arquivo: pessoas-dedup-audit.sql
--
-- INSTRUÇÕES DE USO:
--   FASE 1 — Rodar apenas os blocos marcados como [SIMULAÇÃO] para revisar.
--   FASE 2 — Após revisar, rodar os blocos [MIGRAÇÃO] para transferir vínculos.
--   FASE 3 — Somente após confirmar a migração, rodar os blocos [LIMPEZA].
--
-- NUNCA pule para FASE 3 sem executar e revisar FASE 1 e FASE 2 primeiro.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 0 — BACKUP
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.pessoas_backup_dedup;
CREATE TABLE public.pessoas_backup_dedup AS
  SELECT * FROM public.pessoas;

COMMENT ON TABLE public.pessoas_backup_dedup
  IS 'Backup de pessoas antes da limpeza de duplicatas — gerado por pessoas-dedup-audit.sql';


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1 — SIMULAÇÃO: Identificar candidatos a duplicata
-- ─────────────────────────────────────────────────────────────────────────────

-- 1A) Instala extensão pg_trgm (necessária para similarity)
--     Executar uma vez no banco; não falha se já instalada.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- 1B) Contagem de vínculos por pessoa
--     Útil para priorizar o registro "principal" (mais vínculos = mais importante)
WITH vinculos AS (
  SELECT p.id,
         p.nome,
         p.created_at,
         (
           (SELECT COUNT(*) FROM public.membros              WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.visitantes           WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.oficiais             WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.seminaristas         WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.contratados          WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.nomeados             WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.pgs                  WHERE lider_id  = p.id OR colider_id = p.id) +
           (SELECT COUNT(*) FROM public.pg_participantes     WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.ministerio_membros   WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.ministerio_setores   WHERE lider_setorial = p.id) +
           (SELECT COUNT(*) FROM public.ministerio_setor_membros WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.comissao_membros     WHERE pessoa_id = p.id) +
           (SELECT COUNT(*) FROM public.rede_cuidado         WHERE cuidador_id = p.id OR cuidado_id = p.id) +
           (SELECT COUNT(*) FROM public.demandas             WHERE solicitante_id = p.id OR responsavel_id = p.id OR created_by = p.id) +
           (SELECT COUNT(*) FROM public.agenda               WHERE responsavel_id = p.id OR solicitante_id = p.id OR created_by = p.id) +
           (SELECT COUNT(*) FROM public.ministerios          WHERE supervisor = p.id OR conselheiro = p.id OR coordenador = p.id) +
           (SELECT COUNT(*) FROM public.congregacao_cultos   WHERE pregador_id = p.id) +
           (SELECT COUNT(*) FROM public.estudos_pgs          WHERE autor_id = p.id) +
           (SELECT COUNT(*) FROM public.conselho_reunioes    WHERE created_by = p.id) +
           (SELECT COUNT(*) FROM public.conselho_pautas      WHERE created_by = p.id OR responsaveis::text LIKE '%' || p.id::text || '%')
         ) AS total_vinculos
  FROM public.pessoas p
  WHERE p.deleted_at IS NULL
)
SELECT
  id,
  nome,
  total_vinculos,
  created_at,
  CASE WHEN total_vinculos = 0 THEN 'SEM VÍNCULOS — candidato a remoção' ELSE 'TEM VÍNCULOS' END AS situacao
FROM vinculos
ORDER BY total_vinculos DESC, nome;


-- 1C) Registros com nome incompleto (apenas um token / sem sobrenome)
SELECT
  id,
  nome,
  char_length(nome) AS comprimento,
  created_at
FROM public.pessoas
WHERE deleted_at IS NULL
  AND nome NOT LIKE '% %'          -- sem espaço = apenas um nome
ORDER BY nome;


-- 1D) Registros com título no campo nome (devem ter o título removido)
SELECT
  id,
  nome,
  regexp_replace(nome,
    '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s*',
    '', 'i') AS nome_limpo
FROM public.pessoas
WHERE deleted_at IS NULL
  AND nome ~* '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s+'
ORDER BY nome;


-- 1E) Pares de nomes com alta similaridade (possíveis duplicatas)
--     similarity > 0.6 = provável duplicata; ajuste o limiar conforme necessário.
SELECT
  a.id            AS id_a,
  a.nome          AS nome_a,
  b.id            AS id_b,
  b.nome          AS nome_b,
  round(similarity(
    lower(trim(a.nome)),
    lower(trim(b.nome))
  )::numeric, 3)  AS sim,
  CASE
    WHEN lower(trim(a.nome)) = lower(trim(b.nome)) THEN 'IDENTICO'
    WHEN similarity(lower(trim(a.nome)), lower(trim(b.nome))) >= 0.85 THEN 'MUITO ALTO'
    WHEN similarity(lower(trim(a.nome)), lower(trim(b.nome))) >= 0.70 THEN 'ALTO'
    ELSE 'MEDIO'
  END             AS grau
FROM public.pessoas a
JOIN public.pessoas b ON a.id < b.id
WHERE a.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND similarity(
        lower(trim(a.nome)),
        lower(trim(b.nome))
      ) >= 0.60
ORDER BY sim DESC, a.nome;


-- 1F) Nomes idênticos (ignorando maiúsculas/minúsculas e espaços extras)
SELECT
  lower(trim(nome))        AS nome_normalizado,
  count(*)                 AS qtd,
  array_agg(id ORDER BY created_at) AS ids_por_data,
  array_agg(nome)          AS nomes,
  min(created_at)          AS mais_antigo
FROM public.pessoas
WHERE deleted_at IS NULL
GROUP BY lower(trim(nome))
HAVING count(*) > 1
ORDER BY qtd DESC, nome_normalizado;


-- 1G) Para cada par suspeito, mostrar todos os vínculos lado a lado
--     Substitua os UUIDs abaixo pelos pares encontrados na query 1E/1F.
--
--     Exemplo de uso:
--       SELECT * FROM public.v_pessoa_vinculos WHERE pessoa_id IN ('uuid-a', 'uuid-b');
--
-- View auxiliar de vínculos (criar para facilitar a análise):
CREATE OR REPLACE VIEW public.v_pessoa_vinculos AS
SELECT
  p.id         AS pessoa_id,
  p.nome,
  'membros'                  AS tabela, m.id AS registro_id FROM public.membros m JOIN public.pessoas p ON p.id = m.pessoa_id WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'visitantes',               v.id  FROM public.visitantes v          JOIN public.pessoas p ON p.id = v.pessoa_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'oficiais',                 o.id  FROM public.oficiais o            JOIN public.pessoas p ON p.id = o.pessoa_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'seminaristas',             s.id  FROM public.seminaristas s        JOIN public.pessoas p ON p.id = s.pessoa_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'contratados',              c.id  FROM public.contratados c         JOIN public.pessoas p ON p.id = c.pessoa_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'nomeados',                 n.id  FROM public.nomeados n            JOIN public.pessoas p ON p.id = n.pessoa_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'pgs (lider)',              g.id  FROM public.pgs g                 JOIN public.pessoas p ON p.id = g.lider_id           WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'pgs (colider)',            g.id  FROM public.pgs g                 JOIN public.pessoas p ON p.id = g.colider_id         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'pg_participantes',         pp.id FROM public.pg_participantes pp   JOIN public.pessoas p ON p.id = pp.pessoa_id         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerio_membros',       mm.id FROM public.ministerio_membros mm JOIN public.pessoas p ON p.id = mm.pessoa_id         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerio_setores',       ms.id FROM public.ministerio_setores ms JOIN public.pessoas p ON p.id = ms.lider_setorial    WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerio_setor_membros', sm.id FROM public.ministerio_setor_membros sm JOIN public.pessoas p ON p.id = sm.pessoa_id   WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'comissao_membros',         cm.id FROM public.comissao_membros cm   JOIN public.pessoas p ON p.id = cm.pessoa_id         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'rede_cuidado (cuidador)',  rc.id FROM public.rede_cuidado rc       JOIN public.pessoas p ON p.id = rc.cuidador_id       WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'rede_cuidado (cuidado)',   rc.id FROM public.rede_cuidado rc       JOIN public.pessoas p ON p.id = rc.cuidado_id        WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'demandas (solicitante)',   d.id  FROM public.demandas d            JOIN public.pessoas p ON p.id = d.solicitante_id     WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'demandas (responsavel)',   d.id  FROM public.demandas d            JOIN public.pessoas p ON p.id = d.responsavel_id     WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'demandas (created_by)',    d.id  FROM public.demandas d            JOIN public.pessoas p ON p.id = d.created_by         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'agenda (responsavel)',     a.id  FROM public.agenda a              JOIN public.pessoas p ON p.id = a.responsavel_id     WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'agenda (solicitante)',     a.id  FROM public.agenda a              JOIN public.pessoas p ON p.id = a.solicitante_id     WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'agenda (created_by)',      a.id  FROM public.agenda a              JOIN public.pessoas p ON p.id = a.created_by         WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerios (supervisor)', mi.id FROM public.ministerios mi        JOIN public.pessoas p ON p.id = mi.supervisor        WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerios (conselheiro)',mi.id FROM public.ministerios mi        JOIN public.pessoas p ON p.id = mi.conselheiro       WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'ministerios (coordenador)',mi.id FROM public.ministerios mi        JOIN public.pessoas p ON p.id = mi.coordenador       WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'congregacao_cultos',       cc.id FROM public.congregacao_cultos cc JOIN public.pessoas p ON p.id = cc.pregador_id       WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'estudos_pgs',              ep.id FROM public.estudos_pgs ep        JOIN public.pessoas p ON p.id = ep.autor_id          WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'conselho_reunioes',        cr.id FROM public.conselho_reunioes cr  JOIN public.pessoas p ON p.id = cr.created_by        WHERE p.deleted_at IS NULL
UNION ALL
SELECT p.id, p.nome, 'conselho_pautas (created)',cp.id FROM public.conselho_pautas cp    JOIN public.pessoas p ON p.id = cp.created_by        WHERE p.deleted_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1G — Relatório final de auditoria (resumo por pessoa)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Execute esta query para ver o panorama completo antes de tomar decisões.
--
WITH vinculos_count AS (
  SELECT pessoa_id, count(*) AS qtd FROM public.v_pessoa_vinculos GROUP BY pessoa_id
),
nomes_norm AS (
  SELECT
    p.id,
    p.nome,
    p.created_at,
    lower(trim(regexp_replace(p.nome,
      '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s*',
      '', 'i'
    ))) AS nome_sem_titulo,
    COALESCE(v.qtd, 0) AS vinculos
  FROM public.pessoas p
  LEFT JOIN vinculos_count v ON v.pessoa_id = p.id
  WHERE p.deleted_at IS NULL
)
SELECT
  a.id,
  a.nome,
  a.vinculos,
  a.created_at,
  CASE
    WHEN a.nome ~* '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s+' THEN 'TEM TÍTULO'
    WHEN a.nome NOT LIKE '% %' THEN 'NOME INCOMPLETO'
    WHEN EXISTS (
      SELECT 1 FROM nomes_norm b WHERE b.id <> a.id AND b.nome_sem_titulo = a.nome_sem_titulo
    ) THEN 'POSSÍVEL DUPLICATA'
    ELSE 'OK'
  END AS situacao,
  a.vinculos = 0 AS sem_vinculos
FROM nomes_norm a
ORDER BY situacao, a.nome;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2 — MIGRAÇÃO DE VÍNCULOS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ANTES de rodar: substitua os UUIDs de exemplo pelos IDs reais identificados
-- na FASE 1. Para cada par (duplicata → principal):
--
--   :id_duplicata  = UUID do registro a ser descartado
--   :id_principal  = UUID do registro a ser mantido
--
-- Execute um par por vez dentro de uma transação para poder reverter em caso
-- de erro. Após migração bem-sucedida, o :id_duplicata ficará sem vínculos e
-- poderá ser removido na FASE 3.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Substitua os valores abaixo:
DO $$
DECLARE
  id_duplicata UUID := '00000000-0000-0000-0000-000000000000'; -- TROCAR
  id_principal UUID := '00000000-0000-0000-0000-111111111111'; -- TROCAR
BEGIN

  UPDATE public.membros              SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.visitantes           SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.oficiais             SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.seminaristas         SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.contratados          SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.nomeados             SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.pgs                  SET lider_id      = id_principal WHERE lider_id      = id_duplicata;
  UPDATE public.pgs                  SET colider_id    = id_principal WHERE colider_id    = id_duplicata;
  UPDATE public.pg_participantes     SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.ministerio_membros   SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.ministerio_setores   SET lider_setorial= id_principal WHERE lider_setorial= id_duplicata;
  UPDATE public.ministerio_setor_membros SET pessoa_id = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.comissao_membros     SET pessoa_id     = id_principal WHERE pessoa_id     = id_duplicata;
  UPDATE public.rede_cuidado         SET cuidador_id   = id_principal WHERE cuidador_id   = id_duplicata;
  UPDATE public.rede_cuidado         SET cuidado_id    = id_principal WHERE cuidado_id    = id_duplicata;
  UPDATE public.demandas             SET solicitante_id= id_principal WHERE solicitante_id= id_duplicata;
  UPDATE public.demandas             SET responsavel_id= id_principal WHERE responsavel_id= id_duplicata;
  UPDATE public.demandas             SET created_by    = id_principal WHERE created_by    = id_duplicata;
  UPDATE public.agenda               SET responsavel_id= id_principal WHERE responsavel_id= id_duplicata;
  UPDATE public.agenda               SET solicitante_id= id_principal WHERE solicitante_id= id_duplicata;
  UPDATE public.agenda               SET created_by    = id_principal WHERE created_by    = id_duplicata;
  UPDATE public.ministerios          SET supervisor    = id_principal WHERE supervisor    = id_duplicata;
  UPDATE public.ministerios          SET conselheiro   = id_principal WHERE conselheiro   = id_duplicata;
  UPDATE public.ministerios          SET coordenador   = id_principal WHERE coordenador   = id_duplicata;
  UPDATE public.congregacao_cultos   SET pregador_id   = id_principal WHERE pregador_id   = id_duplicata;
  UPDATE public.estudos_pgs          SET autor_id      = id_principal WHERE autor_id      = id_duplicata;
  UPDATE public.conselho_reunioes    SET created_by    = id_principal WHERE created_by    = id_duplicata;
  UPDATE public.conselho_pautas      SET created_by    = id_principal WHERE created_by    = id_duplicata;

  RAISE NOTICE 'Migração concluída: % → %', id_duplicata, id_principal;
END;
$$;

-- Verificar se o duplicata ficou sem vínculos antes de confirmar:
-- SELECT * FROM public.v_pessoa_vinculos WHERE pessoa_id = 'id_duplicata_aqui';

COMMIT;
-- Se algo errou: ROLLBACK;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2B — Remover títulos dos nomes (UPDATE seguro)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Simulação (não altera nada):
SELECT
  id,
  nome AS nome_atual,
  trim(regexp_replace(nome,
    '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s*',
    '', 'i')) AS nome_novo
FROM public.pessoas
WHERE deleted_at IS NULL
  AND nome ~* '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s+'
ORDER BY nome;

-- Execução (descomentar quando pronto):
/*
UPDATE public.pessoas
SET nome = trim(regexp_replace(nome,
  '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s*',
  '', 'i'))
WHERE deleted_at IS NULL
  AND nome ~* '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s+';
*/


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 3 — LIMPEZA: Remover duplicatas sem vínculos
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Somente execute após confirmar que os registros abaixo têm 0 vínculos.
-- Soft-delete: marca deleted_at em vez de remover fisicamente.
-- Para hard-delete, substitua o UPDATE pelo DELETE.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3A) Ver o que seria removido (simulação):
WITH vinculos_count AS (
  SELECT pessoa_id, count(*) AS qtd FROM public.v_pessoa_vinculos GROUP BY pessoa_id
)
SELECT
  p.id,
  p.nome,
  p.created_at,
  COALESCE(v.qtd, 0) AS vinculos_restantes
FROM public.pessoas p
LEFT JOIN vinculos_count v ON v.pessoa_id = p.id
WHERE p.deleted_at IS NULL
  AND COALESCE(v.qtd, 0) = 0
ORDER BY p.nome;


-- 3B) Soft-delete de pessoas sem vínculos (descomentar quando pronto):
/*
WITH vinculos_count AS (
  SELECT pessoa_id FROM public.v_pessoa_vinculos GROUP BY pessoa_id
)
UPDATE public.pessoas
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT pessoa_id FROM vinculos_count);
*/


-- 3C) Hard-delete específico — para IDs confirmados individualmente (descomentar):
/*
DELETE FROM public.pessoas
WHERE id IN (
  'uuid-duplicata-1',
  'uuid-duplicata-2'
  -- adicionar apenas IDs sem vínculos confirmados na FASE 1
)
AND deleted_at IS NULL;
*/


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 4 — VALIDAÇÃO PÓS-LIMPEZA
-- ─────────────────────────────────────────────────────────────────────────────

-- Confirmar que não sobrou nenhum par com nome idêntico:
SELECT
  lower(trim(nome)) AS nome_normalizado,
  count(*)          AS qtd,
  array_agg(id)     AS ids
FROM public.pessoas
WHERE deleted_at IS NULL
GROUP BY lower(trim(nome))
HAVING count(*) > 1
ORDER BY qtd DESC;

-- Confirmar que não sobrou nenhum registro com título no nome:
SELECT id, nome FROM public.pessoas
WHERE deleted_at IS NULL
  AND nome ~* '^\s*(Presb\.|Pr\.|Rev\.|Diác\.|Diac\.|Miss\.|Dr\.|Dra\.)\s+'
ORDER BY nome;

-- Contagem final:
SELECT
  count(*)                                            AS total_ativo,
  count(*) FILTER (WHERE deleted_at IS NOT NULL)      AS total_deletados_soft,
  count(*) FILTER (WHERE nome NOT LIKE '% %')         AS incompletos_restantes
FROM public.pessoas;

-- ─────────────────────────────────────────────────────────────────────────────
-- Limpeza de objetos auxiliares (rodar ao final de tudo)
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP VIEW IF EXISTS public.v_pessoa_vinculos;
-- DROP TABLE IF EXISTS public.pessoas_backup_dedup;
