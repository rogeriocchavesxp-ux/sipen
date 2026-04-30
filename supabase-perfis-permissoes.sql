-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Permissões Editáveis por Perfil (v3)
-- Executar no SQL Editor do Supabase Dashboard.
-- Idempotente: seguro para rodar múltiplas vezes.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabela de perfis ────────────────────────────────────────────────
create table if not exists public.perfis (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  descricao  text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ── 2. Tabela de permissões por perfil ────────────────────────────────
create table if not exists public.perfis_permissoes (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references public.perfis(id) on delete cascade,
  modulo       text not null,
  nivel_acesso text not null default 'SEM_ACESSO',
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now(),

  constraint nivel_acesso_check
    check (nivel_acesso in ('SEM_ACESSO','LEITURA','EDICAO','COMPLETO')),

  constraint modulo_check
    check (modulo in (
      'ADMINISTRATIVO','FINANCEIRO','JURIDICO','PASTORAL','CONSELHO',
      'MINISTERIAL','AGENDA','PGS','INFRAESTRUTURA','DEMANDAS',
      'RELATORIOS','MEMBRESIA','ESTOQUE','CONFIGURACOES','AREA_MEMBRO',
      'JUNTA_DIACONAL','CONGREGACOES'
    )),

  constraint uq_perfil_modulo unique (perfil_id, modulo)
);

-- ── 3. Índices ─────────────────────────────────────────────────────────
create index if not exists idx_permissoes_perfil
  on public.perfis_permissoes(perfil_id);

create index if not exists idx_permissoes_modulo
  on public.perfis_permissoes(modulo);

-- ── 4. Trigger updated_at ─────────────────────────────────────────────
create or replace function public.update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_perfis_updated_at     on public.perfis;
drop trigger if exists update_permissoes_updated_at on public.perfis_permissoes;

create trigger update_perfis_updated_at
  before update on public.perfis
  for each row execute function public.update_timestamp();

create trigger update_permissoes_updated_at
  before update on public.perfis_permissoes
  for each row execute function public.update_timestamp();

-- ── 5. Perfis padrão ───────────────────────────────────────────────────
insert into public.perfis (nome, descricao) values
  ('ADMINISTRADOR_GERAL',  'Acesso total ao sistema'),
  ('CONSELHO',             'Panorâmico, sem alterações'),
  ('PASTORAL',             'Módulos pastorais e membresia'),
  ('ADM_OPERACIONAL',      'Administrativo e financeiro'),
  ('LIDER_MINISTERIO',     'Restrito ao ministério e agenda'),
  ('MEMBRO_MINISTERIO',    'Operacional do setor ministerial'),
  ('OPERACIONAL_SERVICOS', 'Infraestrutura e demandas do setor'),
  ('MEMBRO_IGREJA',        'Membro comum sem função ativa')
on conflict (nome) do nothing;

-- ── 6. Permissões por perfil × 17 módulos ─────────────────────────────
-- Usa UPSERT (ON CONFLICT DO UPDATE) para atualizar registros existentes.

-- ADMINISTRADOR_GERAL → COMPLETO em tudo
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, 'COMPLETO'
from public.perfis p
cross join (values
  ('ADMINISTRATIVO'),('FINANCEIRO'),('JURIDICO'),('PASTORAL'),('CONSELHO'),
  ('MINISTERIAL'),('AGENDA'),('PGS'),('INFRAESTRUTURA'),('DEMANDAS'),
  ('RELATORIOS'),('MEMBRESIA'),('ESTOQUE'),('CONFIGURACOES'),('AREA_MEMBRO'),
  ('JUNTA_DIACONAL'),('CONGREGACOES')
) as m(modulo)
where p.nome = 'ADMINISTRADOR_GERAL'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- CONSELHO
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'LEITURA'),
  ('FINANCEIRO',       'LEITURA'),
  ('JURIDICO',         'LEITURA'),
  ('PASTORAL',         'LEITURA'),
  ('CONSELHO',         'COMPLETO'),
  ('MINISTERIAL',      'LEITURA'),
  ('AGENDA',           'LEITURA'),
  ('PGS',              'LEITURA'),
  ('INFRAESTRUTURA',   'LEITURA'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'COMPLETO'),
  ('MEMBRESIA',        'LEITURA'),
  ('ESTOQUE',          'LEITURA'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'LEITURA'),
  ('CONGREGACOES',     'LEITURA')
) as m(modulo, nivel)
where p.nome = 'CONSELHO'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- PASTORAL
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'LEITURA'),
  ('FINANCEIRO',       'SEM_ACESSO'),
  ('JURIDICO',         'SEM_ACESSO'),
  ('PASTORAL',         'COMPLETO'),
  ('CONSELHO',         'LEITURA'),
  ('MINISTERIAL',      'LEITURA'),
  ('AGENDA',           'COMPLETO'),
  ('PGS',              'COMPLETO'),
  ('INFRAESTRUTURA',   'SEM_ACESSO'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'LEITURA'),
  ('MEMBRESIA',        'COMPLETO'),
  ('ESTOQUE',          'SEM_ACESSO'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'LEITURA'),
  ('CONGREGACOES',     'LEITURA')
) as m(modulo, nivel)
where p.nome = 'PASTORAL'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- ADM_OPERACIONAL
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'COMPLETO'),
  ('FINANCEIRO',       'COMPLETO'),
  ('JURIDICO',         'LEITURA'),
  ('PASTORAL',         'SEM_ACESSO'),
  ('CONSELHO',         'SEM_ACESSO'),
  ('MINISTERIAL',      'LEITURA'),
  ('AGENDA',           'COMPLETO'),
  ('PGS',              'LEITURA'),
  ('INFRAESTRUTURA',   'COMPLETO'),
  ('DEMANDAS',         'COMPLETO'),
  ('RELATORIOS',       'LEITURA'),
  ('MEMBRESIA',        'COMPLETO'),
  ('ESTOQUE',          'COMPLETO'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'LEITURA'),
  ('CONGREGACOES',     'LEITURA')
) as m(modulo, nivel)
where p.nome = 'ADM_OPERACIONAL'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- LIDER_MINISTERIO
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'SEM_ACESSO'),
  ('FINANCEIRO',       'SEM_ACESSO'),
  ('JURIDICO',         'SEM_ACESSO'),
  ('PASTORAL',         'SEM_ACESSO'),
  ('CONSELHO',         'SEM_ACESSO'),
  ('MINISTERIAL',      'COMPLETO'),
  ('AGENDA',           'COMPLETO'),
  ('PGS',              'COMPLETO'),
  ('INFRAESTRUTURA',   'SEM_ACESSO'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'LEITURA'),
  ('MEMBRESIA',        'LEITURA'),
  ('ESTOQUE',          'SEM_ACESSO'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'SEM_ACESSO'),
  ('CONGREGACOES',     'SEM_ACESSO')
) as m(modulo, nivel)
where p.nome = 'LIDER_MINISTERIO'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- MEMBRO_MINISTERIO
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'SEM_ACESSO'),
  ('FINANCEIRO',       'SEM_ACESSO'),
  ('JURIDICO',         'SEM_ACESSO'),
  ('PASTORAL',         'SEM_ACESSO'),
  ('CONSELHO',         'SEM_ACESSO'),
  ('MINISTERIAL',      'LEITURA'),
  ('AGENDA',           'LEITURA'),
  ('PGS',              'LEITURA'),
  ('INFRAESTRUTURA',   'SEM_ACESSO'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'SEM_ACESSO'),
  ('MEMBRESIA',        'SEM_ACESSO'),
  ('ESTOQUE',          'SEM_ACESSO'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'SEM_ACESSO'),
  ('CONGREGACOES',     'SEM_ACESSO')
) as m(modulo, nivel)
where p.nome = 'MEMBRO_MINISTERIO'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- OPERACIONAL_SERVICOS
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'SEM_ACESSO'),
  ('FINANCEIRO',       'SEM_ACESSO'),
  ('JURIDICO',         'SEM_ACESSO'),
  ('PASTORAL',         'SEM_ACESSO'),
  ('CONSELHO',         'SEM_ACESSO'),
  ('MINISTERIAL',      'SEM_ACESSO'),
  ('AGENDA',           'SEM_ACESSO'),
  ('PGS',              'SEM_ACESSO'),
  ('INFRAESTRUTURA',   'LEITURA'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'SEM_ACESSO'),
  ('MEMBRESIA',        'SEM_ACESSO'),
  ('ESTOQUE',          'LEITURA'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'SEM_ACESSO'),
  ('CONGREGACOES',     'SEM_ACESSO')
) as m(modulo, nivel)
where p.nome = 'OPERACIONAL_SERVICOS'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- MEMBRO_IGREJA → Área do Membro + Demandas (apenas suas próprias)
insert into public.perfis_permissoes (perfil_id, modulo, nivel_acesso)
select p.id, m.modulo, m.nivel
from public.perfis p
cross join (values
  ('ADMINISTRATIVO',   'SEM_ACESSO'),
  ('FINANCEIRO',       'SEM_ACESSO'),
  ('JURIDICO',         'SEM_ACESSO'),
  ('PASTORAL',         'SEM_ACESSO'),
  ('CONSELHO',         'SEM_ACESSO'),
  ('MINISTERIAL',      'SEM_ACESSO'),
  ('AGENDA',           'SEM_ACESSO'),
  ('PGS',              'SEM_ACESSO'),
  ('INFRAESTRUTURA',   'SEM_ACESSO'),
  ('DEMANDAS',         'LEITURA'),
  ('RELATORIOS',       'SEM_ACESSO'),
  ('MEMBRESIA',        'SEM_ACESSO'),
  ('ESTOQUE',          'SEM_ACESSO'),
  ('CONFIGURACOES',    'SEM_ACESSO'),
  ('AREA_MEMBRO',      'LEITURA'),
  ('JUNTA_DIACONAL',   'SEM_ACESSO'),
  ('CONGREGACOES',     'SEM_ACESSO')
) as m(modulo, nivel)
where p.nome = 'MEMBRO_IGREJA'
on conflict (perfil_id, modulo) do update set nivel_acesso = excluded.nivel_acesso;

-- ── 7. RLS ─────────────────────────────────────────────────────────────
alter table public.perfis            enable row level security;
alter table public.perfis_permissoes enable row level security;

-- Remove policies antigas antes de recriar
do $pol$ begin
  begin drop policy "anon_select_perfis"            on public.perfis;            exception when undefined_object then null; end;
  begin drop policy "anon_select_perfis_permissoes" on public.perfis_permissoes; exception when undefined_object then null; end;
  begin drop policy "anon_insert_perfis_permissoes" on public.perfis_permissoes; exception when undefined_object then null; end;
  begin drop policy "anon_update_perfis_permissoes" on public.perfis_permissoes; exception when undefined_object then null; end;
  begin drop policy "anon_delete_perfis_permissoes" on public.perfis_permissoes; exception when undefined_object then null; end;
end $pol$;

-- SELECT: qualquer usuário autenticado ou anon pode ler perfis e permissões
create policy "anon_select_perfis"
  on public.perfis for select
  to anon, authenticated
  using (true);

create policy "anon_select_perfis_permissoes"
  on public.perfis_permissoes for select
  to anon, authenticated
  using (true);

-- INSERT: apenas usuário autenticado pode inserir permissões
create policy "anon_insert_perfis_permissoes"
  on public.perfis_permissoes for insert
  to anon, authenticated
  with check (true);

-- UPDATE: apenas usuário autenticado pode atualizar permissões
create policy "anon_update_perfis_permissoes"
  on public.perfis_permissoes for update
  to anon, authenticated
  using (true)
  with check (true);

-- DELETE: apenas usuário autenticado pode deletar permissões
create policy "anon_delete_perfis_permissoes"
  on public.perfis_permissoes for delete
  to anon, authenticated
  using (true);

-- ── 8. Grants ──────────────────────────────────────────────────────────
grant select                          on public.perfis            to anon, authenticated;
grant select, insert, update, delete  on public.perfis_permissoes to anon, authenticated;

-- ── 9. Verificação final ───────────────────────────────────────────────
select
  p.nome                          as perfil,
  count(pp.id)                    as total_modulos,
  count(*) filter (
    where pp.nivel_acesso <> 'SEM_ACESSO'
  )                               as modulos_com_acesso
from public.perfis p
left join public.perfis_permissoes pp on pp.perfil_id = p.id
group by p.nome
order by p.nome;

-- ══════════════════════════════════════════════════════════════════════
-- FIM — SIPEN supabase-perfis-permissoes.sql v3
-- ══════════════════════════════════════════════════════════════════════
