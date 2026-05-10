-- SIPEN — Correção de RLS e seed real para Pastores / Escala de Pregação
-- Execute este arquivo no SQL Editor do Supabase.
-- Não cria tabela nova. Apenas libera as tabelas existentes para o frontend
-- e popula public.pastores se os nomes ainda não existirem.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

ALTER TABLE public.pastores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_pregacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_insert_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_update_pastores" ON public.pastores;
DROP POLICY IF EXISTS "anon_delete_pastores" ON public.pastores;

CREATE POLICY "anon_select_pastores"
  ON public.pastores FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_pastores"
  ON public.pastores FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_pastores"
  ON public.pastores FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_pastores"
  ON public.pastores FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_insert_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_update_escala_pregacao" ON public.escala_pregacao;
DROP POLICY IF EXISTS "anon_delete_escala_pregacao" ON public.escala_pregacao;

CREATE POLICY "anon_select_escala_pregacao"
  ON public.escala_pregacao FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_escala_pregacao"
  ON public.escala_pregacao FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_escala_pregacao"
  ON public.escala_pregacao FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_escala_pregacao"
  ON public.escala_pregacao FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_pregacao TO anon, authenticated;

WITH seed(nome_completo, nome_exibicao, funcao, ativo) AS (
  VALUES
    ('Rev. Amauri Oliveira', 'Rev. Amauri', 'Pastor Presidente', true),
    ('Rev. Carlos Henrique', 'Rev. C. Henrique', 'Pastor', true),
    ('Rev. Carlos Lima', 'Rev. C. Lima', 'Pastor', true),
    ('Rev. Cornélio Castro', 'Rev. Cornélio', 'Pastor', true),
    ('Rev. Fábio Carvalho', 'Rev. Fábio', 'Pastor', true),
    ('Rev. Flávio Ramos', 'Rev. Flávio', 'Pastor', true)
)
INSERT INTO public.pastores (nome_completo, nome_exibicao, funcao, ativo)
SELECT s.nome_completo, s.nome_exibicao, s.funcao, s.ativo
FROM seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pastores p
  WHERE lower(p.nome_completo) = lower(s.nome_completo)
);

SELECT id, nome_completo, nome_exibicao, ativo
FROM public.pastores
ORDER BY nome_completo;
