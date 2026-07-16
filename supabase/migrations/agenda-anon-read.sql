-- ══════════════════════════════════════════════════════════════
-- SIPEN — Leitura pública da agenda (segura, colunas restritas)
-- Rode no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Remove policies anon existentes
DROP POLICY IF EXISTS "agenda_anon_select"   ON public.agenda;
DROP POLICY IF EXISTS "agenda_public_select" ON public.agenda;
DROP POLICY IF EXISTS "anon_read_agenda"     ON public.agenda;

-- 2. Policy RLS: anon só enxerga confirmados e não deletados
CREATE POLICY "anon_read_agenda" ON public.agenda
  FOR SELECT TO anon
  USING (status = 'confirmado' AND deleted_at IS NULL);

-- 3. Restrição de colunas: anon só acessa campos públicos
--    Colunas sensíveis (solicitante_tel, token_termo, notif_historico,
--    solicitante_txt, obs, motivo_rejeicao, aprovado_por_nome, etc.)
--    ficam invisíveis mesmo com select=*
REVOKE SELECT ON public.agenda FROM anon;
GRANT SELECT (
  id, titulo, data, hora_inicio, hora_fim,
  espaco, organizador, descricao, recorrencia,
  tipo, mes, dia_semana, status, participantes
) ON public.agenda TO anon;

-- 4. Autenticados mantêm acesso completo
DROP POLICY IF EXISTS "agenda_auth_all" ON public.agenda;
CREATE POLICY "agenda_auth_all" ON public.agenda
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- 5. Verificação
SELECT COUNT(*) AS confirmados_visiveis
FROM public.agenda
WHERE status = 'confirmado' AND deleted_at IS NULL;
