-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Seed de perfis e permissões
-- Execute no SQL Editor do Supabase Dashboard.
-- Apenas INSERTs/UPSERTs — não recria tabelas nem constraints.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Corrige constraints (uma por vez para evitar erro de sintaxe) ───

ALTER TABLE public.perfis_permissoes DROP CONSTRAINT IF EXISTS nivel_acesso_check;
ALTER TABLE public.perfis_permissoes DROP CONSTRAINT IF EXISTS modulo_check;
ALTER TABLE public.perfis_permissoes DROP CONSTRAINT IF EXISTS perfis_permissoes_nivel_check;
ALTER TABLE public.perfis_permissoes DROP CONSTRAINT IF EXISTS perfis_permissoes_modulo_check;

ALTER TABLE public.perfis_permissoes
  ADD CONSTRAINT nivel_acesso_check
  CHECK (nivel_acesso IN ('SEM_ACESSO','LEITURA','EDICAO','COMPLETO'));

ALTER TABLE public.perfis_permissoes
  ADD CONSTRAINT modulo_check
  CHECK (modulo IN (
    'ADMINISTRATIVO','FINANCEIRO','JURIDICO','PASTORAL','CONSELHO',
    'MINISTERIAL','AGENDA','PGS','INFRAESTRUTURA','DEMANDAS',
    'RELATORIOS','MEMBRESIA','ESTOQUE','CONFIGURACOES','AREA_MEMBRO',
    'JUNTA_DIACONAL','CONGREGACOES','PROJETOS'
  ));

-- ── 2. Seed de perfis ──────────────────────────────────────────────────

INSERT INTO public.perfis (nome, descricao) VALUES
  ('ADMINISTRADOR_GERAL',  'Acesso total ao sistema'),
  ('CONSELHO',             'Panorâmico, sem alterações'),
  ('PASTORAL',             'Módulos pastorais e membresia'),
  ('ADM_OPERACIONAL',      'Administrativo e financeiro'),
  ('LIDER_MINISTERIO',     'Restrito ao ministério e agenda'),
  ('LIDER_AREA',           'Líder setorial'),
  ('MEMBRO_MINISTERIO',    'Operacional do setor ministerial'),
  ('OPERACIONAL_SERVICOS', 'Infraestrutura e demandas do setor'),
  ('MEMBRO_IGREJA',        'Membro comum sem função ativa')
ON CONFLICT (nome) DO NOTHING;

-- ── 3. Seed de permissões ─────────────────────────────────────────────

-- ADMINISTRADOR_GERAL → COMPLETO em tudo
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, 'COMPLETO'
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO'),('FINANCEIRO'),('JURIDICO'),('PASTORAL'),('CONSELHO'),
  ('MINISTERIAL'),('AGENDA'),('PGS'),('INFRAESTRUTURA'),('DEMANDAS'),
  ('RELATORIOS'),('MEMBRESIA'),('ESTOQUE'),('CONFIGURACOES'),('AREA_MEMBRO'),
  ('JUNTA_DIACONAL'),('CONGREGACOES'),('PROJETOS')
) AS m(modulo)
WHERE p.nome = 'ADMINISTRADOR_GERAL'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- CONSELHO
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','LEITURA'),('FINANCEIRO','LEITURA'),('JURIDICO','LEITURA'),
  ('PASTORAL','LEITURA'),('CONSELHO','COMPLETO'),('MINISTERIAL','LEITURA'),
  ('AGENDA','LEITURA'),('PGS','LEITURA'),('INFRAESTRUTURA','LEITURA'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','COMPLETO'),('MEMBRESIA','LEITURA'),
  ('ESTOQUE','LEITURA'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','LEITURA'),('CONGREGACOES','LEITURA'),('PROJETOS','LEITURA')
) AS m(modulo, nivel)
WHERE p.nome = 'CONSELHO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- PASTORAL
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','LEITURA'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','COMPLETO'),('CONSELHO','LEITURA'),('MINISTERIAL','LEITURA'),
  ('AGENDA','COMPLETO'),('PGS','COMPLETO'),('INFRAESTRUTURA','SEM_ACESSO'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','LEITURA'),('MEMBRESIA','COMPLETO'),
  ('ESTOQUE','SEM_ACESSO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','LEITURA'),('CONGREGACOES','LEITURA'),('PROJETOS','LEITURA')
) AS m(modulo, nivel)
WHERE p.nome = 'PASTORAL'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- ADM_OPERACIONAL
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','COMPLETO'),('FINANCEIRO','COMPLETO'),('JURIDICO','LEITURA'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','LEITURA'),
  ('AGENDA','COMPLETO'),('PGS','LEITURA'),('INFRAESTRUTURA','COMPLETO'),
  ('DEMANDAS','COMPLETO'),('RELATORIOS','LEITURA'),('MEMBRESIA','COMPLETO'),
  ('ESTOQUE','COMPLETO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','LEITURA'),('CONGREGACOES','LEITURA'),('PROJETOS','COMPLETO')
) AS m(modulo, nivel)
WHERE p.nome = 'ADM_OPERACIONAL'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- LIDER_MINISTERIO
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','SEM_ACESSO'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','COMPLETO'),
  ('AGENDA','COMPLETO'),('PGS','COMPLETO'),('INFRAESTRUTURA','SEM_ACESSO'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','LEITURA'),('MEMBRESIA','LEITURA'),
  ('ESTOQUE','SEM_ACESSO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','SEM_ACESSO'),('CONGREGACOES','SEM_ACESSO'),('PROJETOS','LEITURA')
) AS m(modulo, nivel)
WHERE p.nome = 'LIDER_MINISTERIO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- LIDER_AREA (mesmo escopo que LIDER_MINISTERIO)
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','SEM_ACESSO'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','COMPLETO'),
  ('AGENDA','COMPLETO'),('PGS','COMPLETO'),('INFRAESTRUTURA','SEM_ACESSO'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','LEITURA'),('MEMBRESIA','LEITURA'),
  ('ESTOQUE','SEM_ACESSO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','SEM_ACESSO'),('CONGREGACOES','SEM_ACESSO'),('PROJETOS','LEITURA')
) AS m(modulo, nivel)
WHERE p.nome = 'LIDER_AREA'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- MEMBRO_MINISTERIO
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','SEM_ACESSO'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','LEITURA'),
  ('AGENDA','LEITURA'),('PGS','LEITURA'),('INFRAESTRUTURA','SEM_ACESSO'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','SEM_ACESSO'),('MEMBRESIA','SEM_ACESSO'),
  ('ESTOQUE','SEM_ACESSO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','SEM_ACESSO'),('CONGREGACOES','SEM_ACESSO'),('PROJETOS','SEM_ACESSO')
) AS m(modulo, nivel)
WHERE p.nome = 'MEMBRO_MINISTERIO'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- OPERACIONAL_SERVICOS
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','SEM_ACESSO'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','SEM_ACESSO'),
  ('AGENDA','SEM_ACESSO'),('PGS','SEM_ACESSO'),('INFRAESTRUTURA','LEITURA'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','SEM_ACESSO'),('MEMBRESIA','SEM_ACESSO'),
  ('ESTOQUE','LEITURA'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','SEM_ACESSO'),('CONGREGACOES','SEM_ACESSO'),('PROJETOS','SEM_ACESSO')
) AS m(modulo, nivel)
WHERE p.nome = 'OPERACIONAL_SERVICOS'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- MEMBRO_IGREJA
INSERT INTO public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
SELECT p.id, m.modulo, m.nivel
FROM public.perfis p
CROSS JOIN (VALUES
  ('ADMINISTRATIVO','SEM_ACESSO'),('FINANCEIRO','SEM_ACESSO'),('JURIDICO','SEM_ACESSO'),
  ('PASTORAL','SEM_ACESSO'),('CONSELHO','SEM_ACESSO'),('MINISTERIAL','SEM_ACESSO'),
  ('AGENDA','SEM_ACESSO'),('PGS','SEM_ACESSO'),('INFRAESTRUTURA','SEM_ACESSO'),
  ('DEMANDAS','LEITURA'),('RELATORIOS','SEM_ACESSO'),('MEMBRESIA','SEM_ACESSO'),
  ('ESTOQUE','SEM_ACESSO'),('CONFIGURACOES','SEM_ACESSO'),('AREA_MEMBRO','LEITURA'),
  ('JUNTA_DIACONAL','SEM_ACESSO'),('CONGREGACOES','SEM_ACESSO'),('PROJETOS','SEM_ACESSO')
) AS m(modulo, nivel)
WHERE p.nome = 'MEMBRO_IGREJA'
ON CONFLICT (perfil_id, modulo) DO UPDATE SET nivel_acesso = EXCLUDED.nivel_acesso;

-- ── 4. Verificação ────────────────────────────────────────────────────

SELECT
  p.nome                                                        AS perfil,
  COUNT(pp.id)                                                  AS total_modulos,
  COUNT(*) FILTER (WHERE pp.nivel_acesso <> 'SEM_ACESSO')      AS modulos_com_acesso
FROM public.perfis p
LEFT JOIN public.perfis_permissoes pp ON pp.perfil_id = p.id
GROUP BY p.nome
ORDER BY p.nome;
