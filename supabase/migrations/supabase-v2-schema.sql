-- ══════════════════════════════════════════════════════════════════════
-- SIPEN v2 — Schema PostgreSQL / Supabase
-- Estratégia: renomeia tabelas V1 para _v1, cria V2 do zero
-- Gerado em 2026-04-21
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. EXTENSÕES ──────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ── 2. FUNÇÕES AUXILIARES ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE PROCEDURE public.apply_updated_at(tbl text)
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
     CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
    tbl, tbl, tbl, tbl);
END;
$$;

-- Wrapper IMMUTABLE para unaccent (exigido por índices de expressão)
CREATE OR REPLACE FUNCTION public.imm_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT public.unaccent($1) $$;


-- ── 3. ENUMS ──────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE public.genero_t         AS ENUM ('M','F','outro','nao_informado');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.estado_civil_t   AS ENUM ('solteiro','casado','divorciado','viuvo','uniao_estavel','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cargo_oficial_t  AS ENUM ('pastor','presbitero','diacono');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_oficial_t AS ENUM ('ativo','especial','encerrado','transferido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_membro_t  AS ENUM ('ativo','inativo','transferido','falecido','disciplinado','afastado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.prioridade_t     AS ENUM ('Baixa','Média','Alta','Urgente');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_demanda_t AS ENUM ('Aberta','Em Análise','Em Andamento','Concluída','Cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_contrato_t AS ENUM ('Ativo','A vencer','Vencido','Em negociação','Cancelado','Encerrado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tipo_contrato_t  AS ENUM ('Software','Imóvel','Serviço','Seguro','Fornecimento','Outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════════════
-- 4. RENOMEAR TABELAS V1 → _v1  (preserva dados, libera o nome)
-- ══════════════════════════════════════════════════════════════════════

DO $$ BEGIN ALTER TABLE IF EXISTS public.membros           RENAME TO membros_v1;           EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.visitantes        RENAME TO visitantes_v1;        EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.oficiais          RENAME TO oficiais_v1;          EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.nomeados          RENAME TO nomeados_v1;          EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.seminaristas      RENAME TO seminaristas_v1;      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.contratados       RENAME TO contratados_v1;       EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.congregacoes      RENAME TO congregacoes_v1;      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.pessoas           RENAME TO pessoas_v1;           EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.demandas          RENAME TO demandas_v1;          EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.contratos         RENAME TO contratos_v1;         EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.financeiro        RENAME TO financeiro_v1;        EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.agenda            RENAME TO agenda_v1;            EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.pgs               RENAME TO pgs_v1;               EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.pg_participantes  RENAME TO pg_participantes_v1;  EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.estoque_itens     RENAME TO estoque_itens_v1;     EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.estoque_movimentacoes RENAME TO estoque_movimentacoes_v1; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.logs_sistema      RENAME TO logs_sistema_v1;      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.congregacao_cultos RENAME TO congregacao_cultos_v1; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS public.estudos_pgs       RENAME TO estudos_pgs_v1;       EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════════════
-- 5. CONGREGACOES (antes de pessoas — sem FK para pessoas ainda)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.congregacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  tipo            text NOT NULL DEFAULT 'congregacao'
                  CHECK (tipo IN ('sede','congregacao','ponto_de_pregacao','missao')),
  status          text NOT NULL DEFAULT 'ativa'
                  CHECK (status IN ('ativa','inativa','plantio','encerrada')),
  pastor_id       uuid,
  presbitero_id   uuid,
  endereco        text,
  bairro          text,
  cidade          text DEFAULT 'São Paulo',
  estado          text DEFAULT 'SP',
  cep             text,
  telefone        text,
  data_fundacao   date,
  capacidade      integer,
  obs             text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_congregacoes_status ON public.congregacoes(status) WHERE deleted_at IS NULL;
CALL public.apply_updated_at('congregacoes');


-- ══════════════════════════════════════════════════════════════════════
-- 6. PESSOAS — tabela central
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.pessoas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  nome_social     text,
  cpf             text,
  rg              text,
  data_nascimento date,
  genero          public.genero_t NOT NULL DEFAULT 'nao_informado',
  estado_civil    public.estado_civil_t,
  nacionalidade   text DEFAULT 'Brasileiro(a)',
  telefone        text,
  celular         text,
  whatsapp        text,
  email           text,
  endereco        text,
  numero          text,
  complemento     text,
  bairro          text,
  cidade          text DEFAULT 'São Paulo',
  estado          text DEFAULT 'SP',
  cep             text,
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  foto_url        text,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pessoas_nome_fts    ON public.pessoas USING gin(to_tsvector('portuguese', public.imm_unaccent(nome)));
CREATE INDEX IF NOT EXISTS idx_pessoas_nome_trgm   ON public.pessoas USING gin(nome gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_cpf  ON public.pessoas(cpf)   WHERE cpf   IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_email ON public.pessoas(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pessoas_deleted     ON public.pessoas(deleted_at) WHERE deleted_at IS NULL;

CALL public.apply_updated_at('pessoas');


-- ══════════════════════════════════════════════════════════════════════
-- 7. ESPECIALIZAÇÕES DE PESSOAS
-- ══════════════════════════════════════════════════════════════════════

-- ── MEMBROS ───────────────────────────────────────────────────────────

CREATE TABLE public.membros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  congregacao_id    uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  status            public.status_membro_t NOT NULL DEFAULT 'ativo',
  data_ingresso     date,
  tipo_ingresso     text CHECK (tipo_ingresso IN ('batismo','transferência','profissão de fé','restauração','outro')),
  data_saida        date,
  motivo_saida      text,
  batizado          boolean NOT NULL DEFAULT false,
  data_batismo      date,
  local_batismo     text,
  casado_na_igreja  boolean NOT NULL DEFAULT false,
  data_casamento    date,
  conjuge_id        uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  funcao            text,
  ministerios       text[],
  numero_registro   text UNIQUE,
  ata_ingresso      text,
  ata_saida         text,
  observacoes       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membros_ativo       ON public.membros(pessoa_id) WHERE deleted_at IS NULL AND status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_membros_congregacao        ON public.membros(congregacao_id) WHERE congregacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_membros_status             ON public.membros(status);
CALL public.apply_updated_at('membros');


-- ── VISITANTES ────────────────────────────────────────────────────────

CREATE TABLE public.visitantes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id             uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  congregacao_id        uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  data_primeira_visita  date,
  data_ultima_visita    date,
  num_visitas           integer DEFAULT 1,
  origem                text,
  interesse_nivel       text DEFAULT 'médio' CHECK (interesse_nivel IN ('baixo','médio','alto','convertido')),
  acompanhante_id       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  convertido_em         date,
  membro_desde          date,
  obs                   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitantes_ativo    ON public.visitantes(pessoa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitantes_congregacao     ON public.visitantes(congregacao_id) WHERE congregacao_id IS NOT NULL;
CALL public.apply_updated_at('visitantes');


-- ── OFICIAIS ──────────────────────────────────────────────────────────

CREATE TABLE public.oficiais (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  cargo           public.cargo_oficial_t NOT NULL,
  status          public.status_oficial_t NOT NULL DEFAULT 'ativo',
  posse           date,
  fim_mandato     date,
  ata             text,
  mandato_numero  integer DEFAULT 1,
  emerencia_votos integer,
  area            text,
  obs             text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oficiais_ativo      ON public.oficiais(pessoa_id, cargo) WHERE status IN ('ativo','especial') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oficiais_cargo             ON public.oficiais(cargo);
CREATE INDEX IF NOT EXISTS idx_oficiais_status            ON public.oficiais(status);
CREATE INDEX IF NOT EXISTS idx_oficiais_fim_mandato       ON public.oficiais(fim_mandato) WHERE fim_mandato IS NOT NULL;
CALL public.apply_updated_at('oficiais');


-- ── SEMINARISTAS ──────────────────────────────────────────────────────

CREATE TABLE public.seminaristas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id              uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  seminario              text,
  curso                  text DEFAULT 'Teologia',
  ano_curso              text,
  supervisor_id          uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  tem_estagio            boolean NOT NULL DEFAULT false,
  area_estagio           text,
  congregacao_estagio_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  status                 text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','afastado','transferido')),
  data_inicio            date,
  data_conclusao         date,
  obs                    text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seminaristas_ativo  ON public.seminaristas(pessoa_id) WHERE deleted_at IS NULL AND status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_seminaristas_status        ON public.seminaristas(status);
CALL public.apply_updated_at('seminaristas');


-- ── CONTRATADOS ───────────────────────────────────────────────────────

CREATE TABLE public.contratados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  nome            text NOT NULL,
  tipo_vinculo    text NOT NULL CHECK (tipo_vinculo IN ('clt','pj','terceirizado','voluntario','estagio')),
  empresa         text,
  funcao          text,
  categoria       text,
  area_atendida   text,
  contrato_desde  date,
  contrato_ate    date,
  status          text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','suspenso','encerrado')),
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contratados_pessoa         ON public.contratados(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratados_status         ON public.contratados(status);
CALL public.apply_updated_at('contratados');


-- ── NOMEADOS ──────────────────────────────────────────────────────────

CREATE TABLE public.nomeados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  orgao_tipo  text NOT NULL CHECK (orgao_tipo IN ('governo','comissao','ministerio','sociedade','grupo','congregacao')),
  orgao       text NOT NULL,
  suborgao    text,
  cargo       text,
  data_inicio date,
  data_fim    date,
  ata         text,
  obs         text,
  status      text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nomeados_pessoa     ON public.nomeados(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_nomeados_orgao_tipo ON public.nomeados(orgao_tipo);
CREATE INDEX IF NOT EXISTS idx_nomeados_orgao      ON public.nomeados(orgao);
CREATE INDEX IF NOT EXISTS idx_nomeados_status     ON public.nomeados(status);
CALL public.apply_updated_at('nomeados');


-- ══════════════════════════════════════════════════════════════════════
-- 8. MÓDULOS INSTITUCIONAIS — pgs, cultos, estudos
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.pgs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  congregacao_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  lider_id       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  colider_id     uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  dia_semana     text,
  horario        text,
  endereco       text,
  bairro         text,
  status         text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','encerrado')),
  capacidade     integer,
  obs            text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pgs_congregacao ON public.pgs(congregacao_id) WHERE congregacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_lider       ON public.pgs(lider_id) WHERE lider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_status      ON public.pgs(status);
CALL public.apply_updated_at('pgs');


CREATE TABLE public.pg_participantes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id        uuid NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  pessoa_id    uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  funcao       text DEFAULT 'membro' CHECK (funcao IN ('lider','colider','membro','visitante')),
  data_entrada date,
  data_saida   date,
  status       text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_part_uniq  ON public.pg_participantes(pg_id, pessoa_id) WHERE status = 'ativo' AND data_saida IS NULL;
CREATE INDEX IF NOT EXISTS idx_pg_part_pg           ON public.pg_participantes(pg_id);
CREATE INDEX IF NOT EXISTS idx_pg_part_pessoa       ON public.pg_participantes(pessoa_id);


CREATE TABLE public.congregacao_cultos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregacao_id uuid NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
  data           date NOT NULL,
  tipo           text DEFAULT 'culto_regular',
  pregador_id    uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  tema           text,
  passagem       text,
  presentes      integer,
  visitantes_qt  integer DEFAULT 0,
  decisoes       integer DEFAULT 0,
  oferta         numeric(12,2),
  obs            text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cultos_cong ON public.congregacao_cultos(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_cultos_data ON public.congregacao_cultos(data DESC);
CALL public.apply_updated_at('congregacao_cultos');


CREATE TABLE public.estudos_pgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id       uuid REFERENCES public.pgs(id) ON DELETE SET NULL,
  numero      integer UNIQUE,
  titulo      text NOT NULL,
  tema        text,
  passagem    text,
  conteudo    text,
  data_estudo date,
  autor_id    uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estudos_pg ON public.estudos_pgs(pg_id) WHERE pg_id IS NOT NULL;
CALL public.apply_updated_at('estudos_pgs');


-- ══════════════════════════════════════════════════════════════════════
-- 9. MÓDULOS OPERACIONAIS — agenda, demandas
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.agenda (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         text NOT NULL,
  descricao      text,
  tipo           text,
  status         text NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','confirmado','cancelado','realizado','reagendado')),
  data_inicio    timestamptz NOT NULL,
  data_fim       timestamptz,
  local          text,
  congregacao_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  solicitante_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  recorrente     boolean NOT NULL DEFAULT false,
  recorrencia    text,
  obs            text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  deleted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agenda_data         ON public.agenda(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_status       ON public.agenda(status);
CREATE INDEX IF NOT EXISTS idx_agenda_congregacao  ON public.agenda(congregacao_id) WHERE congregacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_responsavel  ON public.agenda(responsavel_id) WHERE responsavel_id IS NOT NULL;
CALL public.apply_updated_at('agenda');


CREATE TABLE public.demandas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area            text NOT NULL,
  subcategoria    text,
  titulo          text NOT NULL,
  descricao       text,
  solicitante_id  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  solicitante_txt text,
  responsavel_id  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  responsavel_txt text,
  prioridade      public.prioridade_t NOT NULL DEFAULT 'Média',
  status          public.status_demanda_t NOT NULL DEFAULT 'Aberta',
  data_abertura   date NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao  date,
  prazo_previsto  date,
  congregacao_id  uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_demandas_status      ON public.demandas(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_area        ON public.demandas(area);
CREATE INDEX IF NOT EXISTS idx_demandas_responsavel ON public.demandas(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_solicitante ON public.demandas(solicitante_id) WHERE solicitante_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_prioridade  ON public.demandas(prioridade) WHERE status NOT IN ('Concluída','Cancelada') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_created     ON public.demandas(created_at DESC);
CALL public.apply_updated_at('demandas');


-- ══════════════════════════════════════════════════════════════════════
-- 10. MÓDULOS ADMINISTRATIVOS — contratos, financeiro, estoque
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.contratos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                 public.tipo_contrato_t NOT NULL,
  titulo               text NOT NULL,
  descricao            text,
  fornecedor           text,
  contato_fornecedor   text,
  proprietario         text,
  produto              text,
  valor                numeric(12,2),
  periodicidade        text CHECK (periodicidade IN ('Mensal','Trimestral','Semestral','Anual','Único','Sob demanda')),
  valor_segurado       numeric(12,2),
  forma_pagamento      text,
  data_inicio          date,
  data_vencimento      date,
  renovacao_automatica boolean NOT NULL DEFAULT false,
  status               public.status_contrato_t NOT NULL DEFAULT 'Ativo',
  num_licencas         integer,
  tipo_licenca         text,
  endereco             text,
  indice_reajuste      text,
  perc_reajuste        numeric(5,2),
  num_apolice          text,
  tipo_seguro          text,
  responsavel_id       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  responsavel_txt      text,
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  deleted_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contratos_tipo        ON public.contratos(tipo);
CREATE INDEX IF NOT EXISTS idx_contratos_status      ON public.contratos(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_vencimento  ON public.contratos(data_vencimento) WHERE data_vencimento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_responsavel ON public.contratos(responsavel_id) WHERE responsavel_id IS NOT NULL;
CALL public.apply_updated_at('contratos');


CREATE TABLE public.financeiro (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             text NOT NULL CHECK (tipo IN ('receita','despesa','transferencia')),
  categoria        text,
  subcategoria     text,
  descricao        text NOT NULL,
  valor            numeric(12,2) NOT NULL,
  data_lancamento  date NOT NULL DEFAULT CURRENT_DATE,
  data_competencia date,
  data_pagamento   date,
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado','estornado')),
  forma_pagamento  text,
  pessoa_id        uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  congregacao_id   uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  contrato_id      uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  comprovante_url  text,
  obs              text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_financeiro_tipo        ON public.financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_data        ON public.financeiro(data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_status      ON public.financeiro(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_congregacao ON public.financeiro(congregacao_id) WHERE congregacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_contrato    ON public.financeiro(contrato_id) WHERE contrato_id IS NOT NULL;
CALL public.apply_updated_at('financeiro');


CREATE TABLE public.estoque_itens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  categoria      text,
  descricao      text,
  unidade        text NOT NULL DEFAULT 'un',
  quantidade     numeric(10,3) NOT NULL DEFAULT 0,
  quantidade_min numeric(10,3) NOT NULL DEFAULT 0,
  localizacao    text,
  congregacao_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  valor_unitario numeric(12,2),
  fornecedor     text,
  ativo          boolean NOT NULL DEFAULT true,
  obs            text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estoque_nome        ON public.estoque_itens(nome);
CREATE INDEX IF NOT EXISTS idx_estoque_congregacao ON public.estoque_itens(congregacao_id) WHERE congregacao_id IS NOT NULL;
CALL public.apply_updated_at('estoque_itens');


CREATE TABLE public.estoque_movimentacoes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                uuid NOT NULL REFERENCES public.estoque_itens(id) ON DELETE RESTRICT,
  tipo                   text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','transferencia','perda')),
  quantidade             numeric(10,3) NOT NULL,
  motivo                 text,
  documento              text,
  responsavel_id         uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  congregacao_destino_id uuid REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES public.pessoas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_estmov_item    ON public.estoque_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_estmov_tipo    ON public.estoque_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_estmov_created ON public.estoque_movimentacoes(created_at DESC);

CREATE OR REPLACE FUNCTION public.atualizar_estoque()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.estoque_itens SET
    quantidade = quantidade + CASE
      WHEN NEW.tipo IN ('entrada','ajuste') THEN NEW.quantidade
      WHEN NEW.tipo IN ('saida','perda','transferencia') THEN -NEW.quantidade
      ELSE 0 END,
    updated_at = now()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_estoque_mov_atualizar
  AFTER INSERT ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque();


-- ══════════════════════════════════════════════════════════════════════
-- 11. AUDITORIA
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.logs_sistema (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela       text NOT NULL,
  operacao     text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','ERROR','ACESSO')),
  registro_id  uuid,
  dados_antes  jsonb,
  dados_depois jsonb,
  pessoa_id    uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  auth_user_id uuid,
  ip           text,
  user_agent   text,
  descricao    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_tabela    ON public.logs_sistema(tabela);
CREATE INDEX IF NOT EXISTS idx_logs_operacao  ON public.logs_sistema(operacao);
CREATE INDEX IF NOT EXISTS idx_logs_pessoa    ON public.logs_sistema(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_created   ON public.logs_sistema(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_registro  ON public.logs_sistema(registro_id) WHERE registro_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pessoa_id uuid; v_auth_id uuid;
BEGIN
  BEGIN v_pessoa_id := current_setting('app.pessoa_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_pessoa_id := NULL; END;
  BEGIN v_auth_id   := auth.uid();                                    EXCEPTION WHEN OTHERS THEN v_auth_id   := NULL; END;
  INSERT INTO public.logs_sistema (tabela, operacao, registro_id, dados_antes, dados_depois, pessoa_id, auth_user_id)
  VALUES (TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_pessoa_id, v_auth_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_pessoas   AFTER INSERT OR UPDATE OR DELETE ON public.pessoas   FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
CREATE TRIGGER trg_audit_membros   AFTER INSERT OR UPDATE OR DELETE ON public.membros   FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
CREATE TRIGGER trg_audit_financeiro AFTER INSERT OR UPDATE OR DELETE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
CREATE TRIGGER trg_audit_contratos AFTER INSERT OR UPDATE OR DELETE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
CREATE TRIGGER trg_audit_demandas  AFTER INSERT OR UPDATE OR DELETE ON public.demandas  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();


-- ══════════════════════════════════════════════════════════════════════
-- 12. FKs CIRCULARES
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.congregacoes
  ADD CONSTRAINT fk_cong_pastor     FOREIGN KEY (pastor_id)     REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_cong_presbitero FOREIGN KEY (presbitero_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;

ALTER TABLE public.pessoas
  ADD CONSTRAINT fk_pessoas_created_by FOREIGN KEY (created_by) REFERENCES public.pessoas(id) ON DELETE SET NULL;


-- ══════════════════════════════════════════════════════════════════════
-- 13. RLS
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.pessoas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oficiais          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomeados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seminaristas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sistema      ENABLE ROW LEVEL SECURITY;

DO $pol$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pessoas','membros','visitantes','oficiais','nomeados','seminaristas','contratados',
    'demandas','financeiro','contratos','agenda','pgs','congregacoes','estoque_itens',
    'congregacao_cultos','estudos_pgs','logs_sistema'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "auth_select_%I"  ON public.%I FOR SELECT  TO authenticated USING (true);
       CREATE POLICY "auth_insert_%I"  ON public.%I FOR INSERT  TO authenticated WITH CHECK (true);
       CREATE POLICY "auth_update_%I"  ON public.%I FOR UPDATE  TO authenticated USING (true) WITH CHECK (true);
       CREATE POLICY "auth_delete_%I"  ON public.%I FOR DELETE  TO authenticated USING (true);
       CREATE POLICY "service_all_%I"  ON public.%I FOR ALL     TO service_role  USING (true) WITH CHECK (true);',
      t,t, t,t, t,t, t,t, t,t);
  END LOOP;
END $pol$;


-- ══════════════════════════════════════════════════════════════════════
-- 14. VIEWS DE COMPATIBILIDADE COM V1
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_membros AS
SELECT m.id, m.pessoa_id, p.nome, p.telefone, p.celular, p.email, p.data_nascimento,
  p.genero::text AS genero, p.estado_civil::text AS estado_civil,
  p.endereco, p.bairro, p.cidade, p.estado, p.cep,
  m.status::text AS status, m.data_ingresso, m.tipo_ingresso, m.data_saida, m.motivo_saida,
  m.batizado, m.data_batismo, m.casado_na_igreja, m.data_casamento,
  m.funcao, m.ministerios, m.numero_registro,
  c.nome AS congregacao, m.congregacao_id, p.foto_url, p.observacoes,
  m.created_at AS criado_em, m.updated_at AS atualizado_em
FROM public.membros m
JOIN public.pessoas p ON p.id = m.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = m.congregacao_id
WHERE m.deleted_at IS NULL AND p.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_visitantes AS
SELECT v.id, v.pessoa_id, p.nome, p.telefone, p.email,
  v.data_primeira_visita, v.data_ultima_visita, v.num_visitas, v.origem, v.interesse_nivel,
  c.nome AS congregacao, v.congregacao_id, v.obs, v.created_at AS criado_em
FROM public.visitantes v
JOIN public.pessoas p ON p.id = v.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = v.congregacao_id
WHERE v.deleted_at IS NULL AND p.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_oficiais AS
SELECT o.id, o.pessoa_id, p.nome,
  o.cargo::text AS cargo, o.status::text AS status,
  o.posse, o.fim_mandato, o.ata, o.mandato_numero, o.emerencia_votos, o.area, o.obs,
  o.created_at AS criado_em
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
WHERE o.deleted_at IS NULL AND p.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_nomeados AS
SELECT n.id, n.pessoa_id, p.nome,
  n.orgao_tipo, n.orgao, n.suborgao, n.cargo, n.data_inicio, n.data_fim, n.status,
  n.created_at AS criado_em
FROM public.nomeados n
JOIN public.pessoas p ON p.id = n.pessoa_id;


CREATE OR REPLACE VIEW public.v_demandas AS
SELECT d.id, d.area, d.subcategoria, d.titulo, d.descricao,
  COALESCE(ps.nome, d.solicitante_txt) AS solicitante, d.solicitante_id,
  COALESCE(pr.nome, d.responsavel_txt) AS responsavel, d.responsavel_id,
  d.prioridade::text AS prioridade, d.status::text AS status,
  d.data_abertura, d.data_conclusao, d.prazo_previsto, d.congregacao_id,
  d.created_at AS criado_em, d.updated_at AS atualizado_em, d.id AS _row
FROM public.demandas d
LEFT JOIN public.pessoas ps ON ps.id = d.solicitante_id
LEFT JOIN public.pessoas pr ON pr.id = d.responsavel_id
WHERE d.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_contratos AS
SELECT c.id, c.tipo::text AS tipo, c.titulo, c.descricao,
  c.fornecedor, c.contato_fornecedor, c.proprietario, c.produto,
  c.valor, c.periodicidade, c.valor_segurado, c.forma_pagamento,
  c.data_inicio, c.data_vencimento, c.renovacao_automatica, c.status::text AS status,
  c.num_licencas, c.tipo_licenca, c.endereco, c.indice_reajuste, c.perc_reajuste,
  c.num_apolice, c.tipo_seguro,
  COALESCE(p.nome, c.responsavel_txt) AS responsavel, c.responsavel_id,
  c.observacoes, c.created_at AS criado_em, c.updated_at AS atualizado_em
FROM public.contratos c
LEFT JOIN public.pessoas p ON p.id = c.responsavel_id
WHERE c.deleted_at IS NULL;


CREATE OR REPLACE VIEW public.v_pessoas_ativas AS
SELECT p.id, p.nome, p.telefone, p.celular, p.email, p.foto_url,
  CASE
    WHEN o.id  IS NOT NULL THEN o.cargo::text
    WHEN m.id  IS NOT NULL THEN 'membro'
    WHEN s.id  IS NOT NULL THEN 'seminarista'
    WHEN ct.id IS NOT NULL THEN 'contratado'
    WHEN v.id  IS NOT NULL THEN 'visitante'
    ELSE 'pessoa'
  END AS vinculo_principal
FROM public.pessoas p
LEFT JOIN public.oficiais     o  ON o.pessoa_id  = p.id AND o.status  IN ('ativo','especial') AND o.deleted_at  IS NULL
LEFT JOIN public.membros      m  ON m.pessoa_id  = p.id AND m.status  = 'ativo'               AND m.deleted_at  IS NULL
LEFT JOIN public.seminaristas s  ON s.pessoa_id  = p.id AND s.status  = 'ativo'               AND s.deleted_at  IS NULL
LEFT JOIN public.contratados  ct ON ct.pessoa_id = p.id AND ct.status = 'ativo'               AND ct.deleted_at IS NULL
LEFT JOIN public.visitantes   v  ON v.pessoa_id  = p.id                                        AND v.deleted_at  IS NULL
WHERE p.deleted_at IS NULL
ORDER BY p.nome;


-- ══════════════════════════════════════════════════════════════════════
-- 15. MIGRAÇÃO DE DADOS DAS TABELAS _v1
--     Execute este bloco DEPOIS de validar que as tabelas V2 estão OK.
--     Descomente quando estiver pronto para migrar os dados.
-- ══════════════════════════════════════════════════════════════════════

/*

-- Migrar membros_v1 → pessoas + membros
INSERT INTO public.pessoas (id, nome, email, telefone, data_nascimento, created_at, updated_at)
SELECT id, nome, email, telefone, data_nascimento, created_at, updated_at
FROM public.membros_v1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.membros (pessoa_id, congregacao_id, status, data_batismo, created_at)
SELECT id, congregacao_id,
  CASE WHEN status IN ('ativo','inativo','transferido','falecido','disciplinado','afastado')
       THEN status::public.status_membro_t ELSE 'ativo'::public.status_membro_t END,
  data_batismo, created_at
FROM public.membros_v1;

-- Migrar oficiais_v1 → pessoas + oficiais
INSERT INTO public.pessoas (id, nome, created_at, updated_at)
SELECT gen_random_uuid(), nome, now(), now()
FROM public.oficiais_v1
ON CONFLICT DO NOTHING;

INSERT INTO public.oficiais (pessoa_id, cargo, status, posse, fim_mandato, ata, created_at)
SELECT p.id,
  o.cargo::public.cargo_oficial_t,
  o.status::public.status_oficial_t,
  o.posse, o.fim_mandato, o.ata, o.created_at
FROM public.oficiais_v1 o
JOIN public.pessoas p ON p.nome = o.nome;

-- Migrar nomeados_v1 → pessoas + nomeados (se nomeados_v1 tiver coluna nome)
-- Adaptar conforme estrutura real da tabela nomeados_v1.

*/
