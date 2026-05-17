-- ════════════════════════════════════════════════════════════════
-- SIPEN — Patch: migração Evolution API → BotConversa
-- Executar no Supabase Dashboard > SQL Editor
--
-- O que faz:
--   1. Torna api_url e instance_name opcionais na whatsapp_config
--      (não são mais necessários — BotConversa usa só a API key no secret)
--   2. Adiciona coluna provider para identificar o provedor ativo
--   3. Mantém toda a estrutura de histórico, templates e módulos intacta
-- ════════════════════════════════════════════════════════════════

-- 1. Torna os campos Evolution-específicos opcionais
ALTER TABLE whatsapp_config
  ALTER COLUMN api_url       DROP NOT NULL,
  ALTER COLUMN instance_name DROP NOT NULL;

-- 2. Adiciona coluna de provedor
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'botconversa';

-- 3. Atualiza registros existentes (se houver) para marcar como legado
UPDATE whatsapp_config
  SET provider = 'evolution_api_legado'
  WHERE api_url IS NOT NULL AND instance_name IS NOT NULL
    AND provider = 'botconversa';

-- 4. Insere linha de configuração BotConversa se não existir nenhuma
INSERT INTO whatsapp_modulo_config (modulo, ativo, descricao)
VALUES
  ('ESTACIONAMENTO', true,  'Notificações do sistema de estacionamento'),
  ('FACIAL',         false, 'Notificações de controle de acesso facial')
ON CONFLICT (modulo) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (execute após o patch para confirmar)
-- ════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'whatsapp_config'
--   ORDER BY ordinal_position;
