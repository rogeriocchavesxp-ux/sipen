-- ══════════════════════════════════════════════════════════════
-- SIPEN — Cron para despacho de mensagens agendadas
--
-- ANTES DE EXECUTAR:
--   1. Deploy da Edge Function:
--      supabase functions deploy dispatch-scheduled
--
--   2. Substitua as duas variáveis abaixo:
--      PROJECT_REF  → Settings → General → Reference ID
--      SERVICE_KEY  → Settings → API → service_role key
--
--   3. Execute este SQL no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Extensões necessárias (já habilitadas na maioria dos projetos Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agendamento anterior se existir
SELECT cron.unschedule('sipen-dispatch-scheduled')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sipen-dispatch-scheduled');

-- Agenda execução a cada minuto
SELECT cron.schedule(
  'sipen-dispatch-scheduled',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://PROJECT_REF.supabase.co/functions/v1/dispatch-scheduled',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer SERVICE_KEY',
                 'Content-Type',  'application/json'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verificar se foi criado:
-- SELECT * FROM cron.job WHERE jobname = 'sipen-dispatch-scheduled';
