-- ═══════════════════════════════════════════════════════
-- SIPEN — WhatsApp: Listas com fonte dinâmica
-- wa-listas-fonte.sql
-- ═══════════════════════════════════════════════════════
-- Princípio da Integridade Sistêmica: listas de WhatsApp
-- derivadas do cadastro (pessoas.funcao), não duplicadas manualmente.

ALTER TABLE wa_listas
  ADD COLUMN IF NOT EXISTS fonte          TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS filtro_funcoes TEXT[];

-- fonte: 'manual'  → usa wa_lista_membros (listas customizadas)
--        'funcao'  → busca pessoas WHERE funcao = ANY(filtro_funcoes) AND status = 'ativo'

UPDATE wa_listas SET
  fonte = 'funcao',
  filtro_funcoes = ARRAY['presbitero', 'pastor']
WHERE nome = 'Conselho';

UPDATE wa_listas SET
  fonte = 'funcao',
  filtro_funcoes = ARRAY['diacono']
WHERE nome = 'Diáconos';

UPDATE wa_listas SET
  fonte = 'funcao',
  filtro_funcoes = ARRAY['pastor', 'presbitero', 'diacono', 'lider_ministerio', 'lider_pg', 'supervisor', 'coordenador']
WHERE nome = 'Líderes';

UPDATE wa_listas SET
  fonte = 'funcao',
  filtro_funcoes = ARRAY['lider_pg']
WHERE nome = 'Pequenos Grupos';

UPDATE wa_listas SET
  fonte = 'funcao',
  filtro_funcoes = ARRAY['secretario', 'tesoureiro', 'coordenador']
WHERE nome = 'Administração';

-- 'Professores', 'Ministério Infantil' e 'Voluntários' permanecem
-- como 'manual' até que haja um campo específico no cadastro.

NOTIFY pgrst, 'reload schema';
