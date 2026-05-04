-- ═══════════════════════════════════════════════════════
-- SIPEN — Fix: GRANT UPDATE na tabela demandas
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- Garante que as roles anon e authenticated possam fazer UPDATE em demandas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO anon, authenticated;

-- Garante acesso à sequência do ID (necessário para INSERT retornar o ID)
GRANT USAGE, SELECT ON SEQUENCE demandas_id_seq TO anon, authenticated;
