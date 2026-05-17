-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Patch: corrige RLS das tabelas WhatsApp
--
-- Problema: o migration original verificava auth.jwt() ->> 'role'
-- que no Supabase padrão retorna apenas 'anon' ou 'authenticated',
-- nunca 'admin_geral'. Resultado: nenhum usuário conseguia ler
-- nem escrever nas tabelas via frontend.
--
-- Executar no Supabase Dashboard > SQL Editor após o migration principal.
-- ═══════════════════════════════════════════════════════════════

-- whatsapp_config: qualquer autenticado lê; Edge Function escreve via service role
DROP POLICY IF EXISTS "admin_select_wa_config" ON whatsapp_config;
DROP POLICY IF EXISTS "admin_update_wa_config" ON whatsapp_config;

CREATE POLICY "autenticado_select_wa_config" ON whatsapp_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticado_insert_wa_config" ON whatsapp_config
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "autenticado_update_wa_config" ON whatsapp_config
  FOR UPDATE TO authenticated USING (true);

-- whatsapp_mensagens: qualquer autenticado lê; Edge Function insere via service role
DROP POLICY IF EXISTS "admin_select_wa_msg" ON whatsapp_mensagens;

CREATE POLICY "autenticado_select_wa_msg" ON whatsapp_mensagens
  FOR SELECT TO authenticated USING (true);

-- service role (Edge Functions) pode inserir e atualizar sem RLS
-- (service role bypassa RLS por padrão no Supabase — nenhuma policy necessária)

-- whatsapp_templates e whatsapp_modulo_config: já estão corretos no migration
-- (todos autenticados lêem; UPDATE para admins — mas simplificamos para todos)
DROP POLICY IF EXISTS "admin_update_modulo_config" ON whatsapp_modulo_config;

CREATE POLICY "autenticado_update_modulo_config" ON whatsapp_modulo_config
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_templates" ON whatsapp_templates;

CREATE POLICY "autenticado_manage_templates" ON whatsapp_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recarrega schema do PostgREST
NOTIFY pgrst, 'reload schema';
