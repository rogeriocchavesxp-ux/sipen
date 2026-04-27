-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Perfis e Permissões Editáveis
-- Executar no SQL Editor do Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════════════

-- 1. ENUM de níveis de acesso
DO $$ BEGIN
  CREATE TYPE public.nivel_acesso_t AS ENUM ('SEM_ACESSO','LEITURA','EDICAO','COMPLETO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela de perfis
CREATE TABLE IF NOT EXISTS public.perfis (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  icone      TEXT,
  cor        TEXT,
  nivel      INTEGER NOT NULL DEFAULT 0,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de permissões por perfil × módulo
CREATE TABLE IF NOT EXISTS public.perfis_permissoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id    TEXT NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL,
  nivel_acesso public.nivel_acesso_t NOT NULL DEFAULT 'SEM_ACESSO',
  UNIQUE(perfil_id, modulo)
);

-- 4. Seed: perfis base
INSERT INTO public.perfis (id, nome, descricao, icone, cor, nivel) VALUES
  ('admin_geral',          'Administrativo Geral', 'Acesso total ao sistema',                   '👑', '#D4A843', 7),
  ('conselho',             'Conselho',             'Panorâmico, sem alterações',                '🏛', '#4A9CF5', 6),
  ('pastoral',             'Pastoral',             'Módulos pastorais e membresia',             '✝️', '#3AACA5', 5),
  ('adm_operacional',      'Adm. Operacional',     'Administrativo e financeiro',               '💼', '#E08A2A', 4),
  ('lider_ministerio',     'Líder de Ministério',  'Restrito ao ministério e agenda',           '🎯', '#8B6FD4', 3),
  ('membro_ministerio',    'Membro de Ministério', 'Operacional do setor ministerial',          '🙌', '#3AAA5C', 2),
  ('operacional_servicos', 'Operacional Serviços', 'Infraestrutura e demandas do setor',        '🔧', '#888899', 1),
  ('membro_igreja',        'Membro Igreja',        'Membro comum sem função ativa',             '⛪', '#5898D4', 0)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed: permissões (mapeadas de PERMISSOES_MATRIZ)
--    full → COMPLETO | read → LEITURA | restricted → LEITURA | false → SEM_ACESSO
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso) VALUES
-- Administrativo
  ('admin_geral','Administrativo','COMPLETO'),('conselho','Administrativo','LEITURA'),('pastoral','Administrativo','LEITURA'),('adm_operacional','Administrativo','COMPLETO'),
  ('lider_ministerio','Administrativo','SEM_ACESSO'),('membro_ministerio','Administrativo','SEM_ACESSO'),('operacional_servicos','Administrativo','SEM_ACESSO'),('membro_igreja','Administrativo','SEM_ACESSO'),
-- Financeiro
  ('admin_geral','Financeiro','COMPLETO'),('conselho','Financeiro','LEITURA'),('pastoral','Financeiro','SEM_ACESSO'),('adm_operacional','Financeiro','COMPLETO'),
  ('lider_ministerio','Financeiro','SEM_ACESSO'),('membro_ministerio','Financeiro','SEM_ACESSO'),('operacional_servicos','Financeiro','SEM_ACESSO'),('membro_igreja','Financeiro','SEM_ACESSO'),
-- Jurídico
  ('admin_geral','Jurídico','COMPLETO'),('conselho','Jurídico','LEITURA'),('pastoral','Jurídico','SEM_ACESSO'),('adm_operacional','Jurídico','LEITURA'),
  ('lider_ministerio','Jurídico','SEM_ACESSO'),('membro_ministerio','Jurídico','SEM_ACESSO'),('operacional_servicos','Jurídico','SEM_ACESSO'),('membro_igreja','Jurídico','SEM_ACESSO'),
-- Pastoral
  ('admin_geral','Pastoral','COMPLETO'),('conselho','Pastoral','LEITURA'),('pastoral','Pastoral','COMPLETO'),('adm_operacional','Pastoral','SEM_ACESSO'),
  ('lider_ministerio','Pastoral','SEM_ACESSO'),('membro_ministerio','Pastoral','SEM_ACESSO'),('operacional_servicos','Pastoral','SEM_ACESSO'),('membro_igreja','Pastoral','SEM_ACESSO'),
-- Conselho/Gov.
  ('admin_geral','Conselho/Gov.','COMPLETO'),('conselho','Conselho/Gov.','COMPLETO'),('pastoral','Conselho/Gov.','LEITURA'),('adm_operacional','Conselho/Gov.','SEM_ACESSO'),
  ('lider_ministerio','Conselho/Gov.','SEM_ACESSO'),('membro_ministerio','Conselho/Gov.','SEM_ACESSO'),('operacional_servicos','Conselho/Gov.','SEM_ACESSO'),('membro_igreja','Conselho/Gov.','SEM_ACESSO'),
-- Ministerial
  ('admin_geral','Ministerial','COMPLETO'),('conselho','Ministerial','LEITURA'),('pastoral','Ministerial','LEITURA'),('adm_operacional','Ministerial','LEITURA'),
  ('lider_ministerio','Ministerial','COMPLETO'),('membro_ministerio','Ministerial','LEITURA'),('operacional_servicos','Ministerial','SEM_ACESSO'),('membro_igreja','Ministerial','SEM_ACESSO'),
-- Agenda
  ('admin_geral','Agenda','COMPLETO'),('conselho','Agenda','LEITURA'),('pastoral','Agenda','COMPLETO'),('adm_operacional','Agenda','COMPLETO'),
  ('lider_ministerio','Agenda','COMPLETO'),('membro_ministerio','Agenda','LEITURA'),('operacional_servicos','Agenda','SEM_ACESSO'),('membro_igreja','Agenda','SEM_ACESSO'),
-- Pequenos Grupos
  ('admin_geral','Pequenos Grupos','COMPLETO'),('conselho','Pequenos Grupos','LEITURA'),('pastoral','Pequenos Grupos','COMPLETO'),('adm_operacional','Pequenos Grupos','LEITURA'),
  ('lider_ministerio','Pequenos Grupos','COMPLETO'),('membro_ministerio','Pequenos Grupos','LEITURA'),('operacional_servicos','Pequenos Grupos','SEM_ACESSO'),('membro_igreja','Pequenos Grupos','SEM_ACESSO'),
-- Infraestrutura
  ('admin_geral','Infraestrutura','COMPLETO'),('conselho','Infraestrutura','LEITURA'),('pastoral','Infraestrutura','SEM_ACESSO'),('adm_operacional','Infraestrutura','COMPLETO'),
  ('lider_ministerio','Infraestrutura','SEM_ACESSO'),('membro_ministerio','Infraestrutura','SEM_ACESSO'),('operacional_servicos','Infraestrutura','LEITURA'),('membro_igreja','Infraestrutura','SEM_ACESSO'),
-- Demandas
  ('admin_geral','Demandas','COMPLETO'),('conselho','Demandas','LEITURA'),('pastoral','Demandas','LEITURA'),('adm_operacional','Demandas','COMPLETO'),
  ('lider_ministerio','Demandas','LEITURA'),('membro_ministerio','Demandas','LEITURA'),('operacional_servicos','Demandas','LEITURA'),('membro_igreja','Demandas','SEM_ACESSO'),
-- Relatórios
  ('admin_geral','Relatórios','COMPLETO'),('conselho','Relatórios','COMPLETO'),('pastoral','Relatórios','LEITURA'),('adm_operacional','Relatórios','LEITURA'),
  ('lider_ministerio','Relatórios','LEITURA'),('membro_ministerio','Relatórios','SEM_ACESSO'),('operacional_servicos','Relatórios','SEM_ACESSO'),('membro_igreja','Relatórios','SEM_ACESSO'),
-- Membresia
  ('admin_geral','Membresia','COMPLETO'),('conselho','Membresia','LEITURA'),('pastoral','Membresia','COMPLETO'),('adm_operacional','Membresia','COMPLETO'),
  ('lider_ministerio','Membresia','LEITURA'),('membro_ministerio','Membresia','SEM_ACESSO'),('operacional_servicos','Membresia','SEM_ACESSO'),('membro_igreja','Membresia','SEM_ACESSO'),
-- Estoque
  ('admin_geral','Estoque','COMPLETO'),('conselho','Estoque','LEITURA'),('pastoral','Estoque','SEM_ACESSO'),('adm_operacional','Estoque','COMPLETO'),
  ('lider_ministerio','Estoque','SEM_ACESSO'),('membro_ministerio','Estoque','SEM_ACESSO'),('operacional_servicos','Estoque','LEITURA'),('membro_igreja','Estoque','SEM_ACESSO'),
-- Configurações
  ('admin_geral','Configurações','COMPLETO'),('conselho','Configurações','SEM_ACESSO'),('pastoral','Configurações','SEM_ACESSO'),('adm_operacional','Configurações','SEM_ACESSO'),
  ('lider_ministerio','Configurações','SEM_ACESSO'),('membro_ministerio','Configurações','SEM_ACESSO'),('operacional_servicos','Configurações','SEM_ACESSO'),('membro_igreja','Configurações','SEM_ACESSO'),
-- Área do Membro
  ('admin_geral','Área do Membro','COMPLETO'),('conselho','Área do Membro','LEITURA'),('pastoral','Área do Membro','LEITURA'),('adm_operacional','Área do Membro','LEITURA'),
  ('lider_ministerio','Área do Membro','LEITURA'),('membro_ministerio','Área do Membro','LEITURA'),('operacional_servicos','Área do Membro','LEITURA'),('membro_igreja','Área do Membro','LEITURA')
ON CONFLICT (perfil_id, modulo) DO NOTHING;

-- 6. RLS: acesso anon (leitura e escrita)
ALTER TABLE public.perfis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_permissoes ENABLE ROW LEVEL SECURITY;

DO $pol$ BEGIN
  BEGIN CREATE POLICY "anon_select_perfis" ON public.perfis FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "anon_select_perfis_permissoes" ON public.perfis_permissoes FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "anon_insert_perfis_permissoes" ON public.perfis_permissoes FOR INSERT TO anon WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "anon_update_perfis_permissoes" ON public.perfis_permissoes FOR UPDATE TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "anon_delete_perfis_permissoes" ON public.perfis_permissoes FOR DELETE TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $pol$;

GRANT SELECT ON public.perfis            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_permissoes TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- FIM — Execute no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════════════
