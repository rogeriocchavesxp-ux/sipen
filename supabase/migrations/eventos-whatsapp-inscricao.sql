-- ════════════════════════════════════════════════════════════════════════
-- SIPEN — Notificação WhatsApp para novas inscrições em Eventos
-- Data: 2026-06-29
--
-- O QUE ESTE SCRIPT FAZ:
--   1. Registra o módulo EVENTOS em whatsapp_modulo_config
--   2. Cria trigger AFTER INSERT em evento_inscricoes que chama a edge
--      function evento-inscricao-notificar via pg_net — funciona tanto
--      para inscrições feitas pela página pública (inscricao.html, sem
--      login) quanto pelo modal interno do SIPEN.
--
-- PRÉ-REQUISITOS:
--   A. Deploy da edge function `evento-inscricao-notificar` no Supabase
--   B. Extensão pg_net habilitada (Database → Extensions → pg_net)
--   C. Secret CRON_SECRET já configurado (reaproveitado do cron de escala)
--
-- COMO EXECUTAR:
--   SQL Editor do Supabase Dashboard → cole e execute todo o bloco.
--   Substitua <PROJECT_REF> e <CRON_SECRET> antes de executar.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_evento_inscricao_notificar ON public.evento_inscricoes;
--   DROP FUNCTION IF EXISTS public.fn_evento_inscricao_notificar();
--   DELETE FROM whatsapp_modulo_config WHERE modulo = 'EVENTOS';
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 1: Módulo EVENTOS no config de WhatsApp
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO public.whatsapp_modulo_config (modulo, ativo, descricao) VALUES
  ('EVENTOS', true, 'Notificação de novas inscrições em eventos')
ON CONFLICT (modulo) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 2: Trigger AFTER INSERT em evento_inscricoes
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_evento_inscricao_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/evento-inscricao-notificar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body    := jsonb_build_object('inscricao_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evento_inscricao_notificar ON public.evento_inscricoes;
CREATE TRIGGER trg_evento_inscricao_notificar
  AFTER INSERT ON public.evento_inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_evento_inscricao_notificar();


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 3: Verificação
-- ════════════════════════════════════════════════════════════════════════

SELECT * FROM whatsapp_modulo_config WHERE modulo = 'EVENTOS';

SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_evento_inscricao_notificar';
