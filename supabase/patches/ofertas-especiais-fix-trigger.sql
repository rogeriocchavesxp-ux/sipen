-- Fix: remove triggers updated_at gerados por apply_updated_at
-- A tabela usa `atualizado_em`, não `updated_at`. O JS já atualiza o campo manualmente.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table IN ('ofertas_especiais', 'oe_contribuicoes')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table);
    RAISE NOTICE 'Trigger removido: % em %', r.trigger_name, r.event_object_table;
  END LOOP;
END $$;
