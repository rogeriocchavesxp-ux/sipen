-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Normalização de Membresia
-- Ações: diagnóstico, view v_membresia, backfill tipo_membro
-- Executar no SQL Editor do Supabase em ordem
-- ══════════════════════════════════════════════════════════════════════


-- ── BLOCO 1: DIAGNÓSTICO (executar antes de qualquer alteração) ────────

-- 1a. Distribuição atual de tipo_membro
SELECT tipo_membro, COUNT(*) AS total
FROM public.membros
WHERE deleted_at IS NULL
GROUP BY tipo_membro
ORDER BY tipo_membro;

-- 1b. Pastores que também estão em membros ativos (não devem estar na contagem)
SELECT p.nome, o.cargo
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
JOIN public.membros m ON m.pessoa_id = p.id
WHERE o.cargo = 'pastor'
  AND o.status = 'ativo'
  AND o.deleted_at IS NULL
  AND m.deleted_at IS NULL
  AND m.status = 'ativo';

-- 1c. Presbíteros e diáconos que NÃO estão em membros (deveriam estar)
SELECT p.nome, o.cargo
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
WHERE o.cargo IN ('presbitero', 'diacono')
  AND o.status IN ('ativo', 'especial')
  AND o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.membros m
    WHERE m.pessoa_id = p.id
      AND m.status = 'ativo'
      AND m.deleted_at IS NULL
  );


-- ── BLOCO 2: NORMALIZAR tipo_membro EXISTENTE ─────────────────────────
-- Converte variações maiúsculas/mistas para o padrão canônico minúsculo

UPDATE public.membros SET tipo_membro = 'comungante'
WHERE tipo_membro IN ('COMUNGANTE','Comungante','membro_comungante','Membro Comungante','MEMBRO')
  AND deleted_at IS NULL;

UPDATE public.membros SET tipo_membro = 'nao_comungante'
WHERE tipo_membro IN (
  'NAO_COMUNGANTE','Não Comungante','Nao Comungante',
  'não_comungante','nao-comungante','Não-Comungante',
  'membro_nao_comungante'
)
  AND deleted_at IS NULL;


-- ── BLOCO 3: BACKFILL — membros sem tipo_membro ───────────────────────
-- Regra: membros com data_nascimento < 14 anos = nao_comungante
-- Todos os demais (incluindo sem data) = comungante

UPDATE public.membros SET tipo_membro = 'nao_comungante'
WHERE tipo_membro IS NULL
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.pessoas p
    WHERE p.id = membros.pessoa_id
      AND p.data_nascimento IS NOT NULL
      AND EXTRACT(YEAR FROM age(p.data_nascimento)) < 14
  );

UPDATE public.membros SET tipo_membro = 'comungante'
WHERE tipo_membro IS NULL
  AND deleted_at IS NULL;

-- Verificação pós-backfill
SELECT tipo_membro, COUNT(*) AS total
FROM public.membros
WHERE deleted_at IS NULL
GROUP BY tipo_membro
ORDER BY tipo_membro;


-- ── BLOCO 4: VIEW v_membresia (substitui v_membros para contagens) ─────
-- Exclui pastores ativos. Presbíteros e diáconos são membros e entram.

CREATE OR REPLACE VIEW public.v_membresia AS
SELECT
  m.id,
  m.pessoa_id,
  p.nome,
  p.data_nascimento,
  p.telefone,
  p.celular,
  p.email,
  p.genero::text        AS genero,
  p.foto_url,
  m.tipo_membro,
  m.status::text        AS status,
  m.data_ingresso,
  m.tipo_ingresso,
  m.data_saida,
  m.motivo_saida,
  m.batizado,
  m.data_batismo,
  m.funcao,
  m.numero_registro,
  m.congregacao_id,
  c.nome                AS congregacao,
  m.created_at          AS criado_em,
  m.updated_at          AS atualizado_em
FROM public.membros m
JOIN public.pessoas p ON p.id = m.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = m.congregacao_id
WHERE m.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.oficiais o
    WHERE o.pessoa_id = m.pessoa_id
      AND o.cargo = 'pastor'
      AND o.status IN ('ativo','especial')
      AND o.deleted_at IS NULL
  );

GRANT SELECT ON public.v_membresia TO authenticated;
GRANT SELECT ON public.v_membresia TO service_role;


-- ── BLOCO 5: VERIFICAÇÃO FINAL ────────────────────────────────────────

-- Total de membros pela nova view (exclui pastores)
SELECT
  COUNT(*)                                              AS total_membros,
  COUNT(*) FILTER (WHERE status = 'ativo')              AS ativos,
  COUNT(*) FILTER (WHERE tipo_membro = 'comungante')    AS comungantes,
  COUNT(*) FILTER (WHERE tipo_membro = 'nao_comungante') AS nao_comungantes
FROM public.v_membresia;
