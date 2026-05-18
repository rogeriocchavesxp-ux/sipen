-- ================================================================
-- SIPEN — RLS: permite LIDER_CONGREGACAO editar e excluir cultos
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- UPDATE: LIDER pode editar cultos da sua congregação
CREATE POLICY "lider_update_cultos_propria_cong"
  ON congregacao_cultos
  FOR UPDATE
  TO authenticated
  USING (
    cong_id = (
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

-- DELETE: LIDER pode excluir cultos da sua congregação
CREATE POLICY "lider_delete_cultos_propria_cong"
  ON congregacao_cultos
  FOR DELETE
  TO authenticated
  USING (
    cong_id = (
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

-- Verificar políticas ativas
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'congregacao_cultos'
ORDER BY cmd, policyname;
