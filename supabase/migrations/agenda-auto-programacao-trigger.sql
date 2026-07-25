-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Trigger: agenda → eventos (Programações)
-- Toda inserção em agenda cria automaticamente uma entrada em
-- eventos com status 'pendente' (Aguardando Aprovação).
-- Cobre todas as origens: formulário admin, chamado público, RPC.
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Adiciona 'pendente' à constraint de status de eventos ──
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_status_check;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_status_check
  CHECK (status IN (
    'rascunho', 'publicado', 'inscricoes_abertas',
    'inscricoes_encerradas', 'em_andamento',
    'concluido', 'cancelado', 'pendente'
  ));

-- ── 2. Função do trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.agenda_auto_programacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cria entrada em eventos somente se ainda não existe vínculo
  IF NOT EXISTS (SELECT 1 FROM public.eventos WHERE agenda_id = NEW.id) THEN
    INSERT INTO public.eventos (
      titulo,
      descricao,
      data_inicio,
      hora_inicio,
      hora_fim,
      local_nome,
      status,
      agenda_id,
      criado_em,
      atualizado_em
    ) VALUES (
      NEW.titulo,
      NEW.observacao,
      COALESCE(NEW.data, CURRENT_DATE),
      NEW.hora_inicio,
      NEW.hora_fim,
      NEW.espaco,
      'pendente',
      NEW.id,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Trigger após INSERT em agenda ──────────────────────────
DROP TRIGGER IF EXISTS trg_agenda_auto_programacao ON public.agenda;
CREATE TRIGGER trg_agenda_auto_programacao
  AFTER INSERT ON public.agenda
  FOR EACH ROW
  EXECUTE FUNCTION public.agenda_auto_programacao();

-- ── 4. Verificação ────────────────────────────────────────────
SELECT 'Trigger criado' AS resultado, tgname
FROM pg_trigger
WHERE tgname = 'trg_agenda_auto_programacao';
