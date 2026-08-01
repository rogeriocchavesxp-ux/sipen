-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Auditoria: Migrar dept_membros → nomeados
-- audit-02-dept-membros-nomeados.sql
-- Idempotente. Executar no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════
-- OBJETIVO: garantir que todos os membros de departamentos que
-- estão em dept_membros estejam também em nomeados com dept_id.
-- O código dep-adm/index.js passará a ler nomeados (após C2).
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Verificar estado atual ──────────────────────────────
-- Execute antes de rodar o resto:
--
-- SELECT COUNT(*) FROM public.dept_membros WHERE status = 'ativo';
-- SELECT COUNT(*) FROM public.nomeados WHERE dept_id IS NOT NULL AND deleted_at IS NULL;

-- ── PASSO 2: Adicionar dept_id em nomeados (se não existe) ───────

ALTER TABLE public.nomeados
  ADD COLUMN IF NOT EXISTS dept_id UUID
  REFERENCES public.departamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_dept_id
  ON public.nomeados(dept_id)
  WHERE dept_id IS NOT NULL AND deleted_at IS NULL;

-- ── PASSO 3: Migrar de dept_membros → nomeados ───────────────────
-- Insere cada membro ativo de dept_membros em nomeados,
-- caso ainda não esteja lá (checa por pessoa_id + dept_id).
-- Usa ON CONFLICT DO NOTHING se houver unique constraint.

INSERT INTO public.nomeados (
  id,
  pessoa_id,
  dept_id,
  cargo,
  status,
  data_inicio,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  dm.pessoa_id,
  dm.departamento_id,
  COALESCE(dm.cargo, 'Membro'),
  'ativo',
  COALESCE(dm.created_at::date, CURRENT_DATE),
  NOW(),
  NOW()
FROM public.dept_membros dm
WHERE dm.status = 'ativo'
  AND dm.pessoa_id IS NOT NULL
  AND dm.departamento_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.nomeados n
    WHERE n.pessoa_id = dm.pessoa_id
      AND n.dept_id = dm.departamento_id
      AND n.deleted_at IS NULL
  );

-- ── PASSO 4: Verificar resultado ─────────────────────────────────
-- Execute estes SELECTs para confirmar a migração:
--
-- SELECT COUNT(*) AS dept_membros_ativos FROM public.dept_membros WHERE status = 'ativo';
-- SELECT COUNT(*) AS nomeados_em_dept    FROM public.nomeados WHERE dept_id IS NOT NULL AND deleted_at IS NULL;
--
-- Os dois valores devem ser iguais (ou nomeados >= dept_membros).
-- Se houver divergência, verifique:
-- SELECT dm.pessoa_id, dm.departamento_id FROM public.dept_membros dm
-- WHERE dm.status = 'ativo'
--   AND NOT EXISTS (SELECT 1 FROM public.nomeados n
--                   WHERE n.pessoa_id = dm.pessoa_id AND n.dept_id = dm.departamento_id AND n.deleted_at IS NULL);

NOTIFY pgrst, 'reload schema';
