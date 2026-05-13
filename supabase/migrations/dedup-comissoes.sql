-- Remove comissões duplicadas, mantendo a mais antiga por nome
-- Execute ANTES de comissoes-seed.sql se o seed já foi rodado mais de uma vez

DELETE FROM comissoes
WHERE id NOT IN (
  SELECT DISTINCT ON (nome) id
  FROM comissoes
  ORDER BY nome, created_at ASC NULLS LAST, id ASC
);

-- Garante unicidade futura por nome
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_nome_key'
      AND conrelid = 'comissoes'::regclass
  ) THEN
    ALTER TABLE comissoes ADD CONSTRAINT comissoes_nome_key UNIQUE (nome);
  END IF;
END $$;
