-- ================================================================
-- SIPEN — RLS completo para congregacao_cultos
-- Data: 2026-05-18
-- Problema: cultos salvos no browser desaparecem após refresh porque
--   INSERT falha (sem política) e/ou SELECT retorna vazio no sync.
-- Solução: habilitar RLS + políticas para todos os autenticados.
-- ================================================================

-- 1. Habilitar RLS (seguro se já estiver ativo)
ALTER TABLE public.congregacao_cultos ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: qualquer autenticado pode ler cultos
DROP POLICY IF EXISTS "cultos_select_auth" ON public.congregacao_cultos;
CREATE POLICY "cultos_select_auth"
  ON public.congregacao_cultos FOR SELECT
  TO authenticated
  USING (true);

-- 3. INSERT: qualquer autenticado pode registrar culto
DROP POLICY IF EXISTS "cultos_insert_auth" ON public.congregacao_cultos;
CREATE POLICY "cultos_insert_auth"
  ON public.congregacao_cultos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. UPDATE: mantém a política específica de LIDER (já existe)
--    Se não existir ainda, cria uma geral para autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'congregacao_cultos' AND policyname = 'lider_update_cultos_propria_cong'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "cultos_update_auth"
        ON public.congregacao_cultos FOR UPDATE
        TO authenticated
        USING (true);
    $p$;
  END IF;
END $$;

-- 5. DELETE: mantém a política específica de LIDER (já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'congregacao_cultos' AND policyname = 'lider_delete_cultos_propria_cong'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "cultos_delete_auth"
        ON public.congregacao_cultos FOR DELETE
        TO authenticated
        USING (true);
    $p$;
  END IF;
END $$;

-- 6. Garantir permissão de acesso ao role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregacao_cultos TO authenticated;

-- 7. Diagnóstico: cultos do Guilherme (IP Jardim Piratininga)
SELECT
  cc.id,
  cc.data,
  cc.pregador,
  cc.tipo,
  cc.participantes,
  cc.cong_id,
  c.nome AS congregacao
FROM congregacao_cultos cc
JOIN congregacoes c ON c.id = cc.cong_id
WHERE c.nome ILIKE '%piratininga%'
ORDER BY cc.data DESC, cc.criado_em DESC
LIMIT 20;
