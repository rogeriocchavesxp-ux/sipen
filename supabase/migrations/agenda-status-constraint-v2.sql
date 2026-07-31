-- Atualiza constraint de status da agenda para incluir todos os valores do sistema
DO $$
DECLARE v_con TEXT;
BEGIN
  FOR v_con IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'agenda'
      AND constraint_type = 'CHECK'
  LOOP
    EXECUTE 'ALTER TABLE public.agenda DROP CONSTRAINT IF EXISTS ' || quote_ident(v_con);
  END LOOP;
END $$;

ALTER TABLE public.agenda ADD CONSTRAINT agenda_status_ch
  CHECK (status IN (
    'pendente',
    'aguardando_aprovacao',
    'em_analise',
    'ajuste_solicitado',
    'confirmado',
    'realizado',
    'reagendado',
    'cancelado',
    'recusado',
    'arquivado'
  ));
