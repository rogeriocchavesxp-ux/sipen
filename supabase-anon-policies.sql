-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Políticas de acesso para role ANON
-- O SIPEN usa a chave anon do Supabase (não usa Supabase Auth para login).
-- Sem estas policies, o RLS bloqueia todas as consultas do frontend.
-- Executar no SQL Editor do Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════════════

-- Helper: cria policy apenas se não existir
DO $pol$
DECLARE
  tabelas_leitura text[] := ARRAY[
    'pessoas','membros','visitantes','oficiais','nomeados','seminaristas',
    'contratados','congregacoes','demandas','financeiro','contratos','agenda',
    'pgs','pg_participantes','estoque_itens','logs_sistema','pastores','escala_pregacao'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tabelas_leitura LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "anon_select_%I" ON public.%I FOR SELECT TO anon USING (true)',
        t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $pol$;


-- Escrita (INSERT/UPDATE/DELETE) para tabelas de uso comum pelo frontend
DO $pol$
DECLARE
  tabelas_escrita text[] := ARRAY[
    'pessoas','membros','visitantes','demandas','financeiro','agenda',
    'pgs','estoque_itens','contratados','pastores','escala_pregacao'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tabelas_escrita LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "anon_insert_%I" ON public.%I FOR INSERT TO anon WITH CHECK (true)',
        t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY "anon_update_%I" ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)',
        t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY "anon_delete_%I" ON public.%I FOR DELETE TO anon USING (true)',
        t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $pol$;


GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_pregacao TO anon, authenticated;

-- Garantir que as views estejam no search_path do PostgREST
-- (normalmente já estão, mas esta linha confirma)
GRANT SELECT ON public.v_membros       TO anon, authenticated;
GRANT SELECT ON public.v_visitantes    TO anon, authenticated;
GRANT SELECT ON public.v_oficiais      TO anon, authenticated;
GRANT SELECT ON public.v_nomeados      TO anon, authenticated;
GRANT SELECT ON public.v_demandas      TO anon, authenticated;
GRANT SELECT ON public.v_contratos     TO anon, authenticated;
GRANT SELECT ON public.v_seminaristas  TO anon, authenticated;
GRANT SELECT ON public.v_contratados   TO anon, authenticated;
GRANT SELECT ON public.v_pessoas_ativas TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- FIM
-- ══════════════════════════════════════════════════════════════════════
