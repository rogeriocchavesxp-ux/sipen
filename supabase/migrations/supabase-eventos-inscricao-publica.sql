-- ═══════════════════════════════════════════════════════════════
-- SIPEN — RLS para inscrição pública de eventos (role anon)
-- Permite que visitantes não autenticados:
--   · Visualizem eventos com inscrições abertas
--   · Verifiquem se já estão inscritos (por email)
--   · Criem inscrições em eventos abertos
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 0. GRANT de tabela para o role anon ─────────────────────
--    RLS policies controlam as linhas; o GRANT libera o acesso à tabela.
--    Sem o GRANT o PostgREST retorna 42501 (permission denied) mesmo com policy.
GRANT SELECT ON public.eventos TO anon;
GRANT SELECT, INSERT ON public.evento_inscricoes TO anon;

-- ── 1. SELECT público em eventos (somente status abertos) ────
CREATE POLICY "eve_anon_select"
  ON public.eventos
  FOR SELECT
  TO anon
  USING (status IN ('publicado', 'inscricoes_abertas'));

-- ── 2. INSERT anon em evento_inscricoes ──────────────────────
--    Só permite inscrever em eventos com status abertos
CREATE POLICY "eve_inscr_anon_insert"
  ON public.evento_inscricoes
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos
      WHERE id = evento_id
        AND status IN ('publicado', 'inscricoes_abertas')
    )
  );

-- ── 3. SELECT anon em evento_inscricoes ──────────────────────
--    Permite que o visitante veja a contagem de inscritos
--    (usado para checar vagas disponíveis na inscricao.html)
CREATE POLICY "eve_inscr_anon_select"
  ON public.evento_inscricoes
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.eventos
      WHERE id = evento_id
        AND status IN ('publicado', 'inscricoes_abertas')
    )
  );

-- ── 4. Verificação ────────────────────────────────────────────
SELECT policyname, tablename, roles, cmd
FROM pg_policies
WHERE tablename IN ('eventos', 'evento_inscricoes')
  AND 'anon' = ANY(roles::text[]);
