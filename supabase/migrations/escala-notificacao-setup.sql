-- ════════════════════════════════════════════════════════════════════════
-- SIPEN — Escala de Pregação: Notificações WhatsApp Automáticas
-- Data: 2026-05-21
--
-- O QUE ESTE SCRIPT FAZ:
--   1. Adiciona coluna `telefone` na tabela `pastores`
--   2. Configura dois cron jobs via pg_cron:
--      - Dia 25 às 8h: lembrete para todos os pastores
--      - Dia 27 às 8h: resumo para quem preencheu + follow-up para quem não preencheu
--
-- PRÉ-REQUISITOS:
--   A. Deploy da edge function `escala-notificacao` no Supabase
--   B. Secrets configurados via `supabase secrets set`:
--        BOTCONVERSA_API_KEY=<chave>
--        CRON_SECRET=<senha-livre>
--   C. Extensões habilitadas no Supabase Dashboard:
--        pg_cron   → Database → Extensions → pg_cron
--        pg_net    → Database → Extensions → pg_net (normalmente já ativo)
--
-- COMO EXECUTAR:
--   SQL Editor do Supabase Dashboard → cole e execute todo o bloco.
--   As linhas com SUBSTITUIR abaixo precisam ser editadas antes.
--
-- ROLLBACK:
--   SELECT cron.unschedule('escala-lembrete-dia25');
--   SELECT cron.unschedule('escala-followup-dia27');
--   ALTER TABLE public.pastores DROP COLUMN IF EXISTS telefone;
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 1: Coluna telefone em pastores
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pastores
  ADD COLUMN IF NOT EXISTS telefone text;

COMMENT ON COLUMN public.pastores.telefone
  IS 'Telefone WhatsApp do pastor — usado para notificações automáticas de escala. Formato: (11) 99999-9999 ou +5511999999999';


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 2: Cron jobs (pg_cron)
--
-- ⚠️  ATENÇÃO: substitua os valores abaixo ANTES de executar:
--
--   <PROJECT_REF>      → Project Settings → General → Reference ID
--                        Exemplo: abcdefghijklmnop
--
--   <SERVICE_ROLE_KEY> → Project Settings → API → service_role key
--                        (a chave longa com prefixo eyJ...)
--
--   <CRON_SECRET>      → qualquer senha que você definiu em:
--                        supabase secrets set CRON_SECRET=sua-senha
-- ════════════════════════════════════════════════════════════════════════

-- Remove crons anteriores (idempotente)
SELECT cron.unschedule('escala-lembrete-dia25')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escala-lembrete-dia25');
SELECT cron.unschedule('escala-followup-dia27')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escala-followup-dia27');


-- Dia 25 às 11h UTC (= 8h BRT) — lembrete para todos
SELECT cron.schedule(
  'escala-lembrete-dia25',
  '0 11 25 * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/escala-notificacao',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer <CRON_SECRET>'
    ),
    body    := '{"tipo":"lembrete_dia25"}'::jsonb
  ) AS request_id;
  $$
);

-- Dia 27 às 11h UTC (= 8h BRT) — resumo (preencheu) + follow-up (não preencheu)
SELECT cron.schedule(
  'escala-followup-dia27',
  '0 11 27 * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/escala-notificacao',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer <CRON_SECRET>'
    ),
    body    := '{"tipo":"followup_dia27"}'::jsonb
  ) AS request_id;
  $$
);


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 3: Verificação
-- ════════════════════════════════════════════════════════════════════════

-- Confirmar que os crons foram criados:
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname IN ('escala-lembrete-dia25', 'escala-followup-dia27');

-- Verificar pastores com telefone cadastrado:
SELECT id, nome_completo, nome_exibicao, telefone, ativo
FROM public.pastores
ORDER BY nome_completo;


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 4: Cadastrar telefones dos pastores
--
-- Execute depois que os crons estiverem criados.
-- Substitua os números conforme a agenda da liderança.
-- ════════════════════════════════════════════════════════════════════════

/*
UPDATE public.pastores SET telefone = '11999990001' WHERE nome_completo ILIKE '%Amauri%';
UPDATE public.pastores SET telefone = '11999990002' WHERE nome_completo ILIKE '%Carlos Henrique%';
UPDATE public.pastores SET telefone = '11999990003' WHERE nome_completo ILIKE '%Carlos Lima%';
UPDATE public.pastores SET telefone = '11999990004' WHERE nome_completo ILIKE '%Cornélio%';
UPDATE public.pastores SET telefone = '11999990005' WHERE nome_completo ILIKE '%Fábio%';
UPDATE public.pastores SET telefone = '11999990006' WHERE nome_completo ILIKE '%Flávio%';
*/


-- ════════════════════════════════════════════════════════════════════════
-- BLOCO 5: Teste manual (opcional — executa a função imediatamente)
--
-- Substitua <PROJECT_REF> e <CRON_SECRET> antes de executar.
-- Útil para validar antes do dia 25.
-- ════════════════════════════════════════════════════════════════════════

/*
-- Teste do lembrete do dia 25:
SELECT net.http_post(
  url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/escala-notificacao',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <CRON_SECRET>'
  ),
  body    := '{"tipo":"lembrete_dia25"}'::jsonb
) AS request_id;

-- Ver resultado do teste (espere 2-3 segundos e consulte):
SELECT id, status, response_status_code, response_body
FROM net._http_response
ORDER BY id DESC
LIMIT 5;
*/
