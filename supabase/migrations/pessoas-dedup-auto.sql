-- ══════════════════════════════════════════════════════════════════════════════
-- SIPEN — Limpeza automatizada de duplicatas em pessoas
--
-- Estratégia: para cada grupo com nome idêntico (case-insensitive),
-- mantém o registro com maior score de campos preenchidos.
-- Desempate: registro mais antigo (created_at ASC).
--
-- EXECUTE EM ORDEM:
--   FASE 0 → FASE 1 (revisar) → FASE 2 (migrar + remover)
-- ══════════════════════════════════════════════════════════════════════════════

-- Score por campo (maior = mais completo):
--   cpf            +3
--   email          +2
--   celular        +2
--   whatsapp       +2
--   data_nascimento+2
--   rg             +1
--   endereco       +1
--   foto_url       +1
--   telefone       +1
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 0 — BACKUP (executar primeiro, uma única vez)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.pessoas_backup_dedup;
CREATE TABLE public.pessoas_backup_dedup AS SELECT * FROM public.pessoas;
SELECT COUNT(*) AS registros_backup FROM public.pessoas_backup_dedup;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1 — SIMULAÇÃO: preview do que será mantido e removido
--          Apenas SELECT — não altera nada.
-- ─────────────────────────────────────────────────────────────────────────────

WITH base AS (
  SELECT
    p.id,
    p.nome,
    lower(trim(p.nome)) AS nome_norm,
    p.cpf,
    p.email,
    p.celular,
    p.whatsapp,
    p.data_nascimento,
    p.foto_url,
    p.created_at,
    (
      (CASE WHEN p.cpf             IS NOT NULL AND trim(p.cpf)      != '' THEN 3 ELSE 0 END) +
      (CASE WHEN p.email           IS NOT NULL AND trim(p.email)    != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.celular         IS NOT NULL AND trim(p.celular)  != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.whatsapp        IS NOT NULL AND trim(p.whatsapp) != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.data_nascimento IS NOT NULL                            THEN 2 ELSE 0 END) +
      (CASE WHEN p.rg              IS NOT NULL AND trim(p.rg)       != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.endereco        IS NOT NULL AND trim(p.endereco) != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.foto_url        IS NOT NULL AND trim(p.foto_url) != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.telefone        IS NOT NULL AND trim(p.telefone) != '' THEN 1 ELSE 0 END)
    ) AS score
  FROM public.pessoas p
  WHERE p.deleted_at IS NULL
    AND lower(trim(p.nome)) IN (
      SELECT lower(trim(nome))
      FROM public.pessoas
      WHERE deleted_at IS NULL
      GROUP BY lower(trim(nome))
      HAVING COUNT(*) > 1
    )
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY nome_norm
      ORDER BY score DESC, created_at ASC
    ) AS rn
  FROM base
)
SELECT
  nome_norm,
  id,
  nome,
  cpf,
  email,
  celular,
  data_nascimento,
  score,
  created_at,
  CASE WHEN rn = 1 THEN 'MANTER' ELSE 'EXCLUIR' END AS acao
FROM ranked
ORDER BY nome_norm, rn;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2 — MIGRAÇÃO + LIMPEZA
--          Execute APÓS revisar a FASE 1.
--          Roda em transação — em caso de erro: ROLLBACK.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Tabela temporária de mapeamento: dup_id → keeper_id
CREATE TEMP TABLE dedup_map AS
WITH base AS (
  SELECT
    p.id,
    lower(trim(p.nome)) AS nome_norm,
    p.created_at,
    (
      (CASE WHEN p.cpf             IS NOT NULL AND trim(p.cpf)      != '' THEN 3 ELSE 0 END) +
      (CASE WHEN p.email           IS NOT NULL AND trim(p.email)    != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.celular         IS NOT NULL AND trim(p.celular)  != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.whatsapp        IS NOT NULL AND trim(p.whatsapp) != '' THEN 2 ELSE 0 END) +
      (CASE WHEN p.data_nascimento IS NOT NULL                            THEN 2 ELSE 0 END) +
      (CASE WHEN p.rg              IS NOT NULL AND trim(p.rg)       != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.endereco        IS NOT NULL AND trim(p.endereco) != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.foto_url        IS NOT NULL AND trim(p.foto_url) != '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.telefone        IS NOT NULL AND trim(p.telefone) != '' THEN 1 ELSE 0 END)
    ) AS score
  FROM public.pessoas p
  WHERE p.deleted_at IS NULL
    AND lower(trim(p.nome)) IN (
      SELECT lower(trim(nome))
      FROM public.pessoas
      WHERE deleted_at IS NULL
      GROUP BY lower(trim(nome))
      HAVING COUNT(*) > 1
    )
),
ranked AS (
  SELECT
    id,
    nome_norm,
    score,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY nome_norm
      ORDER BY score DESC, created_at ASC
    ) AS rn
  FROM base
),
keepers AS (
  SELECT id AS keeper_id, nome_norm FROM ranked WHERE rn = 1
)
SELECT
  r.id    AS dup_id,
  k.keeper_id
FROM ranked r
JOIN keepers k ON k.nome_norm = r.nome_norm
WHERE r.rn > 1;

-- Quantos registros serão migrados/removidos:
SELECT COUNT(*) AS total_duplicatas FROM dedup_map;

-- ── Migrar vínculos ──────────────────────────────────────────────────────────

UPDATE public.membros
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE membros.pessoa_id = m.dup_id;

UPDATE public.visitantes
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE visitantes.pessoa_id = m.dup_id;

UPDATE public.oficiais
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE oficiais.pessoa_id = m.dup_id;

UPDATE public.seminaristas
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE seminaristas.pessoa_id = m.dup_id;

UPDATE public.contratados
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE contratados.pessoa_id = m.dup_id;

UPDATE public.nomeados
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE nomeados.pessoa_id = m.dup_id;

UPDATE public.pgs
  SET lider_id = m.keeper_id
  FROM dedup_map m WHERE pgs.lider_id = m.dup_id;

UPDATE public.pgs
  SET colider_id = m.keeper_id
  FROM dedup_map m WHERE pgs.colider_id = m.dup_id;

UPDATE public.pg_participantes
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE pg_participantes.pessoa_id = m.dup_id;

UPDATE public.ministerio_membros
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE ministerio_membros.pessoa_id = m.dup_id;

UPDATE public.ministerio_setores
  SET lider_setorial = m.keeper_id
  FROM dedup_map m WHERE ministerio_setores.lider_setorial = m.dup_id;

UPDATE public.ministerio_setor_membros
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE ministerio_setor_membros.pessoa_id = m.dup_id;

UPDATE public.comissao_membros
  SET pessoa_id = m.keeper_id
  FROM dedup_map m WHERE comissao_membros.pessoa_id = m.dup_id;

UPDATE public.rede_cuidado
  SET cuidador_id = m.keeper_id
  FROM dedup_map m WHERE rede_cuidado.cuidador_id = m.dup_id;

UPDATE public.rede_cuidado
  SET cuidado_id = m.keeper_id
  FROM dedup_map m WHERE rede_cuidado.cuidado_id = m.dup_id;

UPDATE public.demandas
  SET solicitante_id = m.keeper_id
  FROM dedup_map m WHERE demandas.solicitante_id = m.dup_id;

UPDATE public.demandas
  SET responsavel_id = m.keeper_id
  FROM dedup_map m WHERE demandas.responsavel_id = m.dup_id;

UPDATE public.demandas
  SET created_by = m.keeper_id
  FROM dedup_map m WHERE demandas.created_by = m.dup_id;

UPDATE public.agenda
  SET responsavel_id = m.keeper_id
  FROM dedup_map m WHERE agenda.responsavel_id = m.dup_id;

UPDATE public.agenda
  SET solicitante_id = m.keeper_id
  FROM dedup_map m WHERE agenda.solicitante_id = m.dup_id;

UPDATE public.agenda
  SET created_by = m.keeper_id
  FROM dedup_map m WHERE agenda.created_by = m.dup_id;

UPDATE public.ministerios
  SET supervisor = m.keeper_id
  FROM dedup_map m WHERE ministerios.supervisor = m.dup_id;

UPDATE public.ministerios
  SET conselheiro = m.keeper_id
  FROM dedup_map m WHERE ministerios.conselheiro = m.dup_id;

UPDATE public.ministerios
  SET coordenador = m.keeper_id
  FROM dedup_map m WHERE ministerios.coordenador = m.dup_id;

UPDATE public.congregacao_cultos
  SET pregador = m.keeper_id::text
  FROM dedup_map m WHERE congregacao_cultos.pregador = m.dup_id::text;

UPDATE public.estudos_pgs
  SET autor_id = m.keeper_id
  FROM dedup_map m WHERE estudos_pgs.autor_id = m.dup_id;

UPDATE public.conselho_reunioes
  SET created_by = m.keeper_id
  FROM dedup_map m WHERE conselho_reunioes.created_by = m.dup_id;

UPDATE public.conselho_pautas
  SET created_by = m.keeper_id
  FROM dedup_map m WHERE conselho_pautas.created_by = m.dup_id;

-- ── Soft-delete das duplicatas ───────────────────────────────────────────────

UPDATE public.pessoas
SET deleted_at = now()
WHERE id IN (SELECT dup_id FROM dedup_map)
  AND deleted_at IS NULL;

-- Conferência antes de confirmar:
SELECT
  COUNT(*) AS removidos,
  (SELECT COUNT(*) FROM public.pessoas WHERE deleted_at IS NULL) AS ativos_restantes
FROM public.pessoas
WHERE id IN (SELECT dup_id FROM dedup_map) AND deleted_at IS NOT NULL;

COMMIT;
-- Em caso de erro: ROLLBACK;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 3 — VALIDAÇÃO PÓS-LIMPEZA (rodar após o COMMIT)
-- ─────────────────────────────────────────────────────────────────────────────

-- Confirmar que não sobrou nenhum par com nome idêntico (case-insensitive):
SELECT
  lower(trim(nome)) AS nome_normalizado,
  COUNT(*)          AS qtd,
  array_agg(id)     AS ids
FROM public.pessoas
WHERE deleted_at IS NULL
GROUP BY lower(trim(nome))
HAVING COUNT(*) > 1
ORDER BY qtd DESC;

-- Contagem final:
SELECT
  COUNT(*) FILTER (WHERE deleted_at IS NULL)     AS total_ativo,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS total_removidos_soft
FROM public.pessoas;
