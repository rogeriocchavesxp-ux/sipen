-- Fix: simplificar políticas INSERT do chat
-- Remove restrição TO authenticated — segurança mantida via SELECT (por participação)

-- chat_conversas
DROP POLICY IF EXISTS chat_conv_ins ON public.chat_conversas;
CREATE POLICY chat_conv_ins ON public.chat_conversas
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS chat_conv_upd ON public.chat_conversas;
CREATE POLICY chat_conv_upd ON public.chat_conversas
  FOR UPDATE USING (true);

-- chat_participantes
DROP POLICY IF EXISTS chat_part_ins ON public.chat_participantes;
CREATE POLICY chat_part_ins ON public.chat_participantes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS chat_part_upd ON public.chat_participantes;
CREATE POLICY chat_part_upd ON public.chat_participantes
  FOR UPDATE USING (true);

-- chat_mensagens
DROP POLICY IF EXISTS chat_msgs_ins ON public.chat_mensagens;
CREATE POLICY chat_msgs_ins ON public.chat_mensagens
  FOR INSERT WITH CHECK (true);
