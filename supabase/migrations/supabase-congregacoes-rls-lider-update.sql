-- ================================================================
-- SIPEN — RLS: permite LIDER_CONGREGACAO atualizar a própria congregação
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- Política de UPDATE: LIDER pode atualizar a congregação vinculada ao seu membro
CREATE POLICY "lider_congregacao_update_propria_cong"
  ON congregacoes
  FOR UPDATE
  TO authenticated
  USING (
    id = (
      SELECT m.congregacao_id
      FROM membros m
      INNER JOIN pessoas p ON p.id = m.pessoa_id
      WHERE p.auth_user_id = auth.uid()
        AND m.congregacao_id IS NOT NULL
        AND m.status = 'ativo'
        AND (m.deleted_at IS NULL OR m.deleted_at > now())
      LIMIT 1
    )
  );

-- Verificar políticas ativas na tabela congregacoes
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'congregacoes'
ORDER BY cmd, policyname;
