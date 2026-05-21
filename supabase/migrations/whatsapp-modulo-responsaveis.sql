-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Responsáveis por módulo WhatsApp
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_modulo_responsaveis (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo    text NOT NULL REFERENCES public.whatsapp_modulo_config(modulo) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modulo, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_wamr_modulo ON public.whatsapp_modulo_responsaveis(modulo) WHERE ativo = true;

ALTER TABLE public.whatsapp_modulo_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wamr_auth_select" ON public.whatsapp_modulo_responsaveis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wamr_admin_all" ON public.whatsapp_modulo_responsaveis
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "wamr_service_all" ON public.whatsapp_modulo_responsaveis
  FOR ALL TO service_role USING (true) WITH CHECK (true);
