-- Acesso anon para o formulário público de Nomeações 2027
-- (sipen.com.br/suporte e sipen.com.br/chamado)

-- 1. ministerios: leitura pública (dropdown de seleção)
GRANT SELECT ON public.ministerios TO anon;

-- Policy de SELECT para anon (sipen-security-migration.sql só definiu TO authenticated)
DROP POLICY IF EXISTS ministerios_select_anon ON public.ministerios;
CREATE POLICY ministerios_select_anon ON public.ministerios
  FOR SELECT TO anon
  USING (ativo = true);

-- 2. v_membros: leitura pública (autocomplete de nomes no formulário)
--    Apenas nome e pessoa_id — suficiente para o autocomplete
GRANT SELECT ON public.v_membros TO anon;

-- 3. nomeados: INSERT público restrito a indicações 2027
GRANT INSERT ON public.nomeados TO anon;

-- Policy: anon só pode inserir com status='indicado' e ano=2027
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nomeados' AND policyname = 'Insert público nomeações indicadas'
  ) THEN
    CREATE POLICY "Insert público nomeações indicadas"
      ON public.nomeados
      FOR INSERT
      TO anon
      WITH CHECK (status = 'indicado' AND ano = 2027);
  END IF;
END $$;
