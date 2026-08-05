-- Diagnóstico e correção para demandas.status = 'PAGO' não persistir
-- Executar no Supabase SQL Editor

-- 1. Ver as policies de UPDATE na tabela demandas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'demandas' AND cmd = 'UPDATE';

-- 2. Ver se 'PAGO' existe no enum do status (se for enum)
SELECT t.typname, e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_attribute a ON a.atttypid = t.oid
JOIN pg_class c ON c.oid = a.attrelid
WHERE c.relname = 'demandas' AND a.attname = 'status'
ORDER BY e.enumsortorder;

-- 3. Ver o tipo da coluna status
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'demandas' AND column_name = 'status';

-- 4. Verificar status atual de fin-2026-000032
SELECT id, numero_chamado, status, prioridade, data_conclusao
FROM demandas
WHERE numero_chamado = 'fin-2026-000032';

-- ─── CORREÇÃO (executar se o diagnóstico acima confirmar) ───────────────────

-- Se 'PAGO' não estiver no enum → adicionar:
-- ALTER TYPE <nome_do_tipo> ADD VALUE IF NOT EXISTS 'PAGO';

-- Se a policy de UPDATE não tiver WITH CHECK → recriar:
-- DROP POLICY IF EXISTS "demandas_upd" ON public.demandas;
-- CREATE POLICY "demandas_upd" ON public.demandas
--   FOR UPDATE TO authenticated
--   USING (deleted_at IS NULL)
--   WITH CHECK (true);

-- Atualização manual de emergência (só se necessário):
-- UPDATE demandas SET status = 'PAGO', data_conclusao = CURRENT_DATE
-- WHERE numero_chamado = 'fin-2026-000032';
