-- ═══════════════════════════════════════════════════════
-- SIPEN — WhatsApp: Listas de oficiais usando tabela oficiais
-- wa-listas-oficiais.sql
-- ═══════════════════════════════════════════════════════
-- Migra fonte='funcao' (legado, pessoas.funcao) para
-- fonte='oficiais' (autoritativo, tabela oficiais).

UPDATE wa_listas SET
  fonte = 'oficiais',
  filtro_funcoes = ARRAY['pastor', 'presbitero']
WHERE nome = 'Conselho';

UPDATE wa_listas SET
  fonte = 'oficiais',
  filtro_funcoes = ARRAY['diacono']
WHERE nome = 'Diáconos';

NOTIFY pgrst, 'reload schema';
