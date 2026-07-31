-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Phase 4: wa_listas derivadas de nomeados
-- wa-listas-nomeados.sql
-- ═══════════════════════════════════════════════════════════════
-- Substitui a abordagem legada (fonte='funcao' + filtro_funcoes
-- consultando pessoas.funcao) pela fonte autoritativa: nomeados.nivel
--
-- Escopo:
--   fonte='nomeados'  → nomeados WHERE nivel = ANY(filtro_nivel)
--   fonte='manual'    → wa_lista_membros (mantido para Conselho, Diáconos, etc.
--                        que são oficiais ordenados — ficam em `oficiais`, não nomeados)
--   fonte='funcao'    → legado, mantido para não quebrar queries antigas

-- 1. Nova coluna: filtro por nivel de nomeados
ALTER TABLE wa_listas
  ADD COLUMN IF NOT EXISTS filtro_nivel TEXT[];

-- 2. Atualizar listas que derivam naturalmente de nomeados
--    (apenas líderes ministeriais — supervisores, coordenadores, líderes de área)

UPDATE wa_listas SET
  fonte        = 'nomeados',
  filtro_nivel = ARRAY['supervisor','coordenador','lider_area']
WHERE nome ILIKE '%líder%' OR nome ILIKE '%lider%';

UPDATE wa_listas SET
  fonte        = 'nomeados',
  filtro_nivel = ARRAY['supervisor','coordenador']
WHERE nome ILIKE '%administra%';

-- Conselho e Diáconos ficam como 'manual': são oficiais ordenados
-- (pastores, presbíteros, diáconos) — fonte é `oficiais`, não `nomeados`
-- A lista manual garante controle explícito da comunicação nesses grupos.

NOTIFY pgrst, 'reload schema';
