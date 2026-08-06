-- Corrige fn_normalizar_status_demanda para reconhecer PAGO e AGUARDANDO_PAGAMENTO
-- Problema: ELSE 'PENDENTE' capturava qualquer valor não mapeado,
-- incluindo 'PAGO' e 'AGUARDANDO_PAGAMENTO', revertendo silenciosamente para PENDENTE.

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
        'CONCLUIDA', 'CANCELADA', 'PAGO', 'AGUARDANDO_PAGAMENTO'
      ) THEN NEW.status

      WHEN NEW.status IN ('Aberta', 'aberta') THEN 'ABERTA'
      WHEN NEW.status IN ('Em Análise', 'Em Analise', 'em análise', 'em analise') THEN 'EM_ANALISE'
      WHEN NEW.status IN ('Em Andamento', 'em andamento') THEN 'EM_ANDAMENTO'
      WHEN NEW.status IN ('Pendente', 'pendente') THEN 'PENDENTE'
      WHEN NEW.status IN ('Concluída', 'Concluida', 'concluída', 'concluida') THEN 'CONCLUIDA'
      WHEN NEW.status IN ('Cancelada', 'cancelada') THEN 'CANCELADA'
      WHEN NEW.status IN ('Pago', 'pago') THEN 'PAGO'
      WHEN NEW.status IN ('Aguardando Pagamento', 'aguardando pagamento') THEN 'AGUARDANDO_PAGAMENTO'

      ELSE 'PENDENTE'
    END;

  RETURN NEW;
END;
$function$;

-- Verificar resultado:
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'normalizar_status_demanda';
