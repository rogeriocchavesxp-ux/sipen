-- ═══════════════════════════════════════════════════════════
-- SIPEN — Limpeza de duplicatas na tabela agenda
-- Auditoria: 2026-07-17
--
-- ESTRATÉGIA: soft-delete (deleted_at = now())
--   Mantém o registro mais antigo de cada grupo.
--   Reversível: UPDATE deleted_at = NULL se necessário.
--
-- EVENTOS TRATADOS:
--   Grupo A — duplicatas exatas (mesmo título, data NULL, ativos)
--   Grupo B — variantes de grafia (mesmo evento, nome diferente)
--
-- EVENTOS NÃO TOCADOS (recorrentes, podem ter datas diferentes):
--   Ensaio de Banda de Sopro, Ensaio Coral JC, Coral Intersinodal,
--   Orquestra, Hispano, Louvor, Coral Jovem, Conexão com Deus,
--   SOS, ETEP, Culto Movimento, Projeto Esperança, etc.
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → Cole e execute.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── Grupo A: duplicatas de nome exato ───────────────────────
-- Mantém o id mais antigo (menor created_at) de cada título.
-- Soft-deleta os demais ativos.

UPDATE public.agenda
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND titulo IN (
    'Café Integração com novos membros',
    'Chá das Mulheres',
    'Culto de Ano Novo',
    'III Workshop da Família',
    'Jantar de Casais',
    'Jantar Beneficente Assoc. Hebron',
    'MAD - Junta Panela',
    'Plenária da SAF',
    'Reunião da SAF',
    'Curso CONFECAP'
  )
  AND id NOT IN (
    SELECT DISTINCT ON (titulo) id
    FROM public.agenda
    WHERE deleted_at IS NULL
      AND titulo IN (
        'Café Integração com novos membros',
        'Chá das Mulheres',
        'Culto de Ano Novo',
        'III Workshop da Família',
        'Jantar de Casais',
        'Jantar Beneficente Assoc. Hebron',
        'MAD - Junta Panela',
        'Plenária da SAF',
        'Reunião da SAF',
        'Curso CONFECAP'
      )
    ORDER BY titulo, created_at ASC
  );

-- ── Grupo B1: Conferência MAD (grafias diferentes) ──────────
-- "Conferência MAD" e "CONFERÊNCIA MAD" são o mesmo evento.
-- Mantém o registro mais antigo entre todos os 5 ativos.
-- Padroniza o título do sobrevivente para 'Conferência MAD'.

WITH mais_antigo AS (
  SELECT id
  FROM public.agenda
  WHERE deleted_at IS NULL
    AND titulo IN ('Conferência MAD', 'CONFERÊNCIA MAD')
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.agenda
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND titulo IN ('Conferência MAD', 'CONFERÊNCIA MAD')
  AND id NOT IN (SELECT id FROM mais_antigo);

-- Padroniza o título do sobrevivente
UPDATE public.agenda
SET titulo = 'Conferência MAD'
WHERE deleted_at IS NULL
  AND titulo = 'CONFERÊNCIA MAD';

-- ── Grupo B2: PG Essência — Alvos (grafias diferentes) ──────
-- "PG Essência - Alvos" e "PG Essencia e Alvos" são o mesmo evento.
-- Mantém o mais antigo, padroniza o título.

WITH mais_antigo AS (
  SELECT id
  FROM public.agenda
  WHERE deleted_at IS NULL
    AND titulo IN ('PG Essência - Alvos', 'PG Essencia e Alvos')
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.agenda
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND titulo IN ('PG Essência - Alvos', 'PG Essencia e Alvos')
  AND id NOT IN (SELECT id FROM mais_antigo);

-- Padroniza o título do sobrevivente
UPDATE public.agenda
SET titulo = 'PG Essência - Alvos'
WHERE deleted_at IS NULL
  AND titulo = 'PG Essencia e Alvos';

-- ── Verificação pós-limpeza ──────────────────────────────────
-- Rode após o COMMIT para confirmar:
--
-- SELECT titulo, COUNT(*) FILTER (WHERE deleted_at IS NULL) AS ativos
-- FROM public.agenda
-- WHERE titulo IN (
--   'Café Integração com novos membros','Chá das Mulheres',
--   'Culto de Ano Novo','III Workshop da Família','Jantar de Casais',
--   'Jantar Beneficente Assoc. Hebron','MAD - Junta Panela',
--   'Plenária da SAF','Reunião da SAF','Curso CONFECAP',
--   'Conferência MAD','CONFERÊNCIA MAD',
--   'PG Essência - Alvos','PG Essencia e Alvos'
-- )
-- GROUP BY titulo ORDER BY titulo;
--
-- Resultado esperado: cada título com ativos = 1.

COMMIT;
