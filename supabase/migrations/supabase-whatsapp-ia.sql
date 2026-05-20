-- ═══════════════════════════════════════════════════════════════
-- SIPEN — WhatsApp IA: log de mensagens recebidas e protocolos
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_ia_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo      text        UNIQUE,
  phone          text        NOT NULL,
  nome_remetente text,
  mensagem_raw   text        NOT NULL,
  ia_resultado   jsonb,
  demanda_id     uuid        REFERENCES public.demandas(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'recebido',
  -- recebido | classificado | demanda_criada | nao_classificado | erro
  erro_msg       text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  processado_em  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wail_phone  ON public.whatsapp_ia_log(phone);
CREATE INDEX IF NOT EXISTS idx_wail_status ON public.whatsapp_ia_log(status);
CREATE INDEX IF NOT EXISTS idx_wail_criado ON public.whatsapp_ia_log(criado_em DESC);

ALTER TABLE public.whatsapp_ia_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wail_auth_select" ON public.whatsapp_ia_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wail_service_all" ON public.whatsapp_ia_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. Gerador de protocolo WA-YYYY-NNNN ─────────────────────
CREATE OR REPLACE FUNCTION public.gerar_protocolo_wa()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano text := to_char(now(), 'YYYY');
  seq int;
BEGIN
  SELECT coalesce(count(*), 0) + 1 INTO seq
  FROM whatsapp_ia_log
  WHERE protocolo LIKE 'WA-' || ano || '-%';
  RETURN 'WA-' || ano || '-' || lpad(seq::text, 4, '0');
END;
$$;

-- ── 3. Verificação ────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'whatsapp_ia_log'
ORDER BY ordinal_position;
