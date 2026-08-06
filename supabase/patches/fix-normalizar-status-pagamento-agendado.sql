-- Adiciona PAGAMENTO_AGENDADO ao trigger e check constraint de demandas
-- Executar no Supabase SQL Editor

-- 1. Atualizar a função normalizadora
CREATE OR REPLACE FUNCTION public.normalizar_status_demanda()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status IS NULL OR trim(NEW.status) = '' THEN
    NEW.status := 'PENDENTE';
  END IF;

  NEW.status :=
    CASE
      WHEN NEW.status IN (
        'ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'PENDENTE',
        'CONCLUIDA', 'CANCELADA', 'PAGO',
        'AGUARDANDO_PAGAMENTO', 'PAGAMENTO_AGENDADO'
      ) THEN NEW.status

      WHEN NEW.status IN ('Aberta', 'aberta') THEN 'ABERTA'
      WHEN NEW.status IN ('Em Análise', 'Em Analise', 'em análise', 'em analise') THEN 'EM_ANALISE'
      WHEN NEW.status IN ('Em Andamento', 'em andamento') THEN 'EM_ANDAMENTO'
      WHEN NEW.status IN ('Pendente', 'pendente') THEN 'PENDENTE'
      WHEN NEW.status IN ('Concluída', 'Concluida', 'concluída', 'concluida') THEN 'CONCLUIDA'
      WHEN NEW.status IN ('Cancelada', 'cancelada') THEN 'CANCELADA'
      WHEN NEW.status IN ('Pago', 'pago') THEN 'PAGO'
      WHEN NEW.status IN ('Aguardando Pagamento', 'aguardando pagamento') THEN 'AGUARDANDO_PAGAMENTO'
      WHEN NEW.status IN ('Pagamento Agendado', 'pagamento agendado') THEN 'PAGAMENTO_AGENDADO'

      ELSE 'PENDENTE'
    END;

  RETURN NEW;
END;
$function$;

-- 2. Atualizar o check constraint
ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_status_check;

ALTER TABLE public.demandas ADD CONSTRAINT demandas_status_check
CHECK (status = ANY (ARRAY[
  'ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'PENDENTE',
  'CONCLUIDA', 'CANCELADA', 'PAGO',
  'AGUARDANDO_PAGAMENTO', 'PAGAMENTO_AGENDADO'
]));
