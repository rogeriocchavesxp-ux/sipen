-- ═══════════════════════════════════════════════════════════════
-- DISPONIBILIDADE PREGAÇÃO — Script de criação da tabela
-- SIPEN v6.8.0 · IPPenha
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Criar tabela
create table if not exists public.disponibilidade_pregacao (
  id           uuid primary key default gen_random_uuid(),
  pastor_id    uuid not null references public.pastores(id) on delete cascade,
  data         date not null,
  culto_tipo   text not null check (culto_tipo in (
                 'domingo_manha',
                 'domingo_noite',
                 'conexao_com_deus',
                 'tarde_da_esperanca'
               )),
  disponivel   boolean not null default true,
  observacoes  text,
  status       text not null default 'ENVIADA' check (status in (
                 'ENVIADA',
                 'EDITADA',
                 'CONFIRMADA',
                 'EXPIRADA',
                 'CANCELADA'
               )),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Unicidade: um pastor só pode ter um registro por data+culto
  constraint uq_disp_pastor_data_culto unique (pastor_id, data, culto_tipo)
);

-- 2. Índices para performance
create index if not exists idx_disp_data        on public.disponibilidade_pregacao (data);
create index if not exists idx_disp_pastor_id   on public.disponibilidade_pregacao (pastor_id);
create index if not exists idx_disp_culto_tipo  on public.disponibilidade_pregacao (culto_tipo);
create index if not exists idx_disp_status      on public.disponibilidade_pregacao (status);

-- 3. Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_disp_updated_at on public.disponibilidade_pregacao;
create trigger trg_disp_updated_at
  before update on public.disponibilidade_pregacao
  for each row execute function public.set_updated_at();

-- 4. Row Level Security
alter table public.disponibilidade_pregacao enable row level security;

-- Política: leitura para todos autenticados
create policy "disp_read_authenticated"
  on public.disponibilidade_pregacao
  for select
  using (auth.role() = 'authenticated');

-- Política: insert/update apenas para o próprio pastor (via auth.uid = pastor_id)
-- ou para admin_geral
create policy "disp_write_own"
  on public.disponibilidade_pregacao
  for insert
  with check (
    auth.uid()::text = pastor_id::text
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
      and (u.raw_user_meta_data->>'perfil') in ('admin_geral', 'pastoral')
    )
  );

create policy "disp_update_own"
  on public.disponibilidade_pregacao
  for update
  using (
    auth.uid()::text = pastor_id::text
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
      and (u.raw_user_meta_data->>'perfil') in ('admin_geral', 'pastoral')
    )
  );

create policy "disp_delete_admin"
  on public.disponibilidade_pregacao
  for delete
  using (
    exists (
      select 1 from auth.users u
      where u.id = auth.uid()
      and (u.raw_user_meta_data->>'perfil') in ('admin_geral', 'pastoral')
    )
  );

-- 5. Permissão para anon (leitura pública opcional — remover se não quiser)
-- Se o SIPEN usa anon key sem autenticação, descomente:
-- grant select on public.disponibilidade_pregacao to anon;
grant all on public.disponibilidade_pregacao to authenticated;
grant select on public.disponibilidade_pregacao to anon;

-- 6. Verificação
select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_name = 'disponibilidade_pregacao'
order by ordinal_position;
