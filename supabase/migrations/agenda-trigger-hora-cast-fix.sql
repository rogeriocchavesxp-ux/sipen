-- Fix: agenda_auto_programacao falhava ao inserir hora_inicio (text) em eventos.hora_inicio (TIME)
-- Solução: cast explícito com NULLIF para tratar string vazia como NULL

CREATE OR REPLACE FUNCTION public.agenda_auto_programacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      NULLIF(NEW.hora_inicio, '')::TIME,
      NULLIF(NEW.hora_fim,    '')::TIME,
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
