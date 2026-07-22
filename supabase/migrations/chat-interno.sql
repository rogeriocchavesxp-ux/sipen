-- ══════════════════════════════════════════════════════════════════════════════
-- SIPEN — Chat Interno
-- Mensagens em tempo real entre usuários do sistema
-- ══════════════════════════════════════════════════════════════════════════════

-- Conversas (direto = DM, grupo = canal com nome)
CREATE TABLE IF NOT EXISTS public.chat_conversas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          TEXT        NOT NULL DEFAULT 'direto' CHECK (tipo IN ('direto', 'grupo')),
  nome          TEXT,
  criado_por    UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_msg_em TIMESTAMPTZ
);

-- Participantes de cada conversa
CREATE TABLE IF NOT EXISTS public.chat_participantes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     UUID        NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  pessoa_id       UUID        NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  entrou_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_lido_em  TIMESTAMPTZ,
  UNIQUE(conversa_id, pessoa_id)
);

-- Mensagens
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID        NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  pessoa_id   UUID        NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  texto       TEXT        NOT NULL CHECK (char_length(trim(texto)) > 0),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_part_pessoa   ON public.chat_participantes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_chat_part_conversa ON public.chat_participantes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_conversa ON public.chat_mensagens(conversa_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_chat_conv_ultima   ON public.chat_conversas(ultima_msg_em DESC NULLS LAST);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.chat_conversas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens    ENABLE ROW LEVEL SECURITY;

-- chat_conversas: vê apenas conversas em que participa
DROP POLICY IF EXISTS chat_conv_sel ON public.chat_conversas;
CREATE POLICY chat_conv_sel ON public.chat_conversas FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT conversa_id FROM public.chat_participantes
      WHERE pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_conv_ins ON public.chat_conversas;
CREATE POLICY chat_conv_ins ON public.chat_conversas FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS chat_conv_upd ON public.chat_conversas;
CREATE POLICY chat_conv_upd ON public.chat_conversas FOR UPDATE TO authenticated
  USING (true);

-- chat_participantes: qualquer autenticado pode ler (necessário para resolver nomes)
DROP POLICY IF EXISTS chat_part_sel ON public.chat_participantes;
CREATE POLICY chat_part_sel ON public.chat_participantes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS chat_part_ins ON public.chat_participantes;
CREATE POLICY chat_part_ins ON public.chat_participantes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS chat_part_upd ON public.chat_participantes;
CREATE POLICY chat_part_upd ON public.chat_participantes FOR UPDATE TO authenticated
  USING (
    pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
  );

-- chat_mensagens: vê e escreve apenas em conversas em que participa
DROP POLICY IF EXISTS chat_msgs_sel ON public.chat_mensagens;
CREATE POLICY chat_msgs_sel ON public.chat_mensagens FOR SELECT TO authenticated
  USING (
    conversa_id IN (
      SELECT conversa_id FROM public.chat_participantes
      WHERE pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_msgs_ins ON public.chat_mensagens;
CREATE POLICY chat_msgs_ins ON public.chat_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    conversa_id IN (
      SELECT conversa_id FROM public.chat_participantes
      WHERE pessoa_id IN (SELECT id FROM public.pessoas WHERE auth_user_id = auth.uid())
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Executar no Supabase Dashboard > Database > Replication, ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
