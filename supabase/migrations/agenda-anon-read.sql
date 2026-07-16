-- ══════════════════════════════════════════════════════════════
-- SIPEN — Libera leitura anon na tabela agenda
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- Remove todas as policies anon existentes
DROP POLICY IF EXISTS "agenda_anon_select"   ON public.agenda;
DROP POLICY IF EXISTS "agenda_public_select" ON public.agenda;
DROP POLICY IF EXISTS "anon_read_agenda"     ON public.agenda;

-- Cria policy simples: anon lê eventos confirmados e não deletados
CREATE POLICY "anon_read_agenda" ON public.agenda
  FOR SELECT TO anon
  USING (status = 'confirmado' AND deleted_at IS NULL);

-- Confirma que RLS está ativo (sem policy = bloqueio total)
-- Autenticados continuam com acesso completo
DROP POLICY IF EXISTS "agenda_auth_all" ON public.agenda;
CREATE POLICY "agenda_auth_all" ON public.agenda
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Verificação: a query direta deve retornar linhas
SELECT COUNT(*) AS confirmados_visiveis
FROM public.agenda
WHERE status = 'confirmado' AND deleted_at IS NULL;
