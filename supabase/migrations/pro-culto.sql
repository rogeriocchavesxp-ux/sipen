-- ══════════════════════════════════════════════════════════════════
-- SIPEN — Pró-Culto: Central Operacional dos Cultos da IPPenha
-- ══════════════════════════════════════════════════════════════════

-- ── 1. TIPOS DE CULTO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_tipos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text        NOT NULL,
  descricao    text,
  cor          text        NOT NULL DEFAULT '#4a9cf5',
  duracao_min  integer     NOT NULL DEFAULT 90,
  ativo        boolean     NOT NULL DEFAULT true,
  ordem        integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 2. CULTOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cultos (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  congregacao_id      uuid        REFERENCES public.congregacoes(id) ON DELETE SET NULL,
  tipo_culto_id       uuid        REFERENCES public.culto_tipos(id) ON DELETE SET NULL,
  titulo              text,
  tema                text,
  tema_do_mes         text,
  texto_biblico       text,
  pregador_id         uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  pregador_nome       text,
  dirigente_id        uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  dirigente_nome      text,
  data_inicio         timestamptz NOT NULL,
  data_encerramento   timestamptz,
  duracao_prevista    integer,
  local_nome          text,
  status              text        NOT NULL DEFAULT 'em_preparacao'
    CHECK (status IN ('em_preparacao','aguardando_info','escalas_incompletas','liturgia_revisao','pronto','em_andamento','encerrado','cancelado','arquivado')),
  eventos_especiais   text[]      NOT NULL DEFAULT '{}',
  observacoes         text,
  escala_preg_id      uuid,
  created_by          uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

-- ── 3. BLOCOS LITÚRGICOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_liturgia_blocos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id   uuid        NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  ordem      integer     NOT NULL DEFAULT 0,
  cor        text        DEFAULT '#4a9cf5',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. CATÁLOGO DE MÚSICAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_musicas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text        NOT NULL,
  versao        text,
  compositor    text,
  interprete    text,
  tom           text,
  duracao_min   integer,
  letra         text,
  cifra         text,
  arquivo_url   text,
  link_externo  text,
  tags          text[]      NOT NULL DEFAULT '{}',
  ativo         boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 5. ITENS DA LITURGIA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_liturgia_itens (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id             uuid        NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  bloco_id             uuid        REFERENCES public.culto_liturgia_blocos(id) ON DELETE SET NULL,
  ordem                integer     NOT NULL DEFAULT 0,
  horario_previsto     time,
  duracao_prevista     integer,
  titulo               text        NOT NULL,
  tipo                 text        NOT NULL DEFAULT 'item'
    CHECK (tipo IN ('item','musica','leitura','oracao','pregacao','anuncio','oferta','ceia','batismo','outro')),
  descricao            text,
  responsavel_id       uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  responsavel_nome     text,
  texto_biblico        text,
  observacoes_tecnicas text,
  status               text        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','concluido','pulado')),
  horario_real_inicio  timestamptz,
  horario_real_fim     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 6. MÚSICAS DOS ITENS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_item_musicas (
  id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id   uuid    NOT NULL REFERENCES public.culto_liturgia_itens(id) ON DELETE CASCADE,
  musica_id uuid    REFERENCES public.culto_musicas(id) ON DELETE SET NULL,
  titulo    text    NOT NULL,
  versao    text,
  tom       text,
  ordem     integer NOT NULL DEFAULT 0
);

-- ── 7. CHECKLISTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_checklists (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id        uuid        NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  departamento    text        NOT NULL,
  titulo          text        NOT NULL,
  responsavel_id  uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  prazo           timestamptz,
  status          text        NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado','em_andamento','concluido','bloqueado','nao_aplicavel')),
  observacao      text,
  concluido_em    timestamptz,
  concluido_por   uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ordem           integer     NOT NULL DEFAULT 0,
  gerado_auto     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 8. PÓS-CULTO ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_pos_culto (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id              uuid        NOT NULL UNIQUE REFERENCES public.cultos(id) ON DELETE CASCADE,
  horario_inicio_real   timestamptz,
  horario_fim_real      timestamptz,
  adultos               integer,
  criancas              integer,
  visitantes            integer,
  decisoes              integer     NOT NULL DEFAULT 0,
  reconciliacoes        integer     NOT NULL DEFAULT 0,
  batismos_realizados   integer     NOT NULL DEFAULT 0,
  membros_recebidos     integer     NOT NULL DEFAULT 0,
  ofertas_especiais     text,
  problemas_tecnicos    text,
  observacoes_pastorais text,
  relatorio             text,
  registrado_por        uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 9. REUNIÃO DE ALINHAMENTO ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_reuniao (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id         uuid        NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  horario_previsto timestamptz,
  coordenador_id   uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  realizada        boolean     NOT NULL DEFAULT false,
  presentes        text,
  ausentes         text,
  observacoes      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 10. ARQUIVOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.culto_arquivos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culto_id   uuid        NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  item_id    uuid        REFERENCES public.culto_liturgia_itens(id) ON DELETE SET NULL,
  nome       text        NOT NULL,
  tipo       text,
  url        text,
  tamanho    bigint,
  created_by uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── TRIGGERS updated_at ───────────────────────────────────────────
CALL public.apply_updated_at('cultos');
CALL public.apply_updated_at('culto_musicas');
CALL public.apply_updated_at('culto_pos_culto');

-- ── ÍNDICES ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cultos_data          ON public.cultos(data_inicio) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cultos_status        ON public.cultos(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cultos_tipo          ON public.cultos(tipo_culto_id);
CREATE INDEX IF NOT EXISTS idx_cultos_congregacao   ON public.cultos(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_cultos_deleted       ON public.cultos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_culto_itens_culto    ON public.culto_liturgia_itens(culto_id);
CREATE INDEX IF NOT EXISTS idx_culto_itens_ordem    ON public.culto_liturgia_itens(culto_id, ordem);
CREATE INDEX IF NOT EXISTS idx_culto_checks_culto   ON public.culto_checklists(culto_id);
CREATE INDEX IF NOT EXISTS idx_culto_arquivos_culto ON public.culto_arquivos(culto_id);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.culto_tipos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_liturgia_blocos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_musicas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_liturgia_itens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_item_musicas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_checklists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_pos_culto         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_reuniao           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culto_arquivos          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_sel" ON public.culto_tipos           FOR SELECT TO authenticated USING (true);
CREATE POLICY "ct_ins" ON public.culto_tipos           FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ct_upd" ON public.culto_tipos           FOR UPDATE TO authenticated USING (true);

CREATE POLICY "cu_sel" ON public.cultos                FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "cu_ins" ON public.cultos                FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cu_upd" ON public.cultos                FOR UPDATE TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "cu_del" ON public.cultos                FOR DELETE TO authenticated USING (true);

CREATE POLICY "clb_sel" ON public.culto_liturgia_blocos FOR SELECT TO authenticated USING (true);
CREATE POLICY "clb_ins" ON public.culto_liturgia_blocos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clb_upd" ON public.culto_liturgia_blocos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "clb_del" ON public.culto_liturgia_blocos FOR DELETE TO authenticated USING (true);

CREATE POLICY "cm_sel"  ON public.culto_musicas        FOR SELECT TO authenticated USING (true);
CREATE POLICY "cm_ins"  ON public.culto_musicas        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cm_upd"  ON public.culto_musicas        FOR UPDATE TO authenticated USING (true);

CREATE POLICY "cli_sel" ON public.culto_liturgia_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "cli_ins" ON public.culto_liturgia_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cli_upd" ON public.culto_liturgia_itens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cli_del" ON public.culto_liturgia_itens FOR DELETE TO authenticated USING (true);

CREATE POLICY "cim_sel" ON public.culto_item_musicas   FOR SELECT TO authenticated USING (true);
CREATE POLICY "cim_ins" ON public.culto_item_musicas   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cim_upd" ON public.culto_item_musicas   FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cim_del" ON public.culto_item_musicas   FOR DELETE TO authenticated USING (true);

CREATE POLICY "cch_sel" ON public.culto_checklists     FOR SELECT TO authenticated USING (true);
CREATE POLICY "cch_ins" ON public.culto_checklists     FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cch_upd" ON public.culto_checklists     FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cch_del" ON public.culto_checklists     FOR DELETE TO authenticated USING (true);

CREATE POLICY "cpc_sel" ON public.culto_pos_culto      FOR SELECT TO authenticated USING (true);
CREATE POLICY "cpc_ins" ON public.culto_pos_culto      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cpc_upd" ON public.culto_pos_culto      FOR UPDATE TO authenticated USING (true);

CREATE POLICY "cre_sel" ON public.culto_reuniao        FOR SELECT TO authenticated USING (true);
CREATE POLICY "cre_ins" ON public.culto_reuniao        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cre_upd" ON public.culto_reuniao        FOR UPDATE TO authenticated USING (true);

CREATE POLICY "car_sel" ON public.culto_arquivos       FOR SELECT TO authenticated USING (true);
CREATE POLICY "car_ins" ON public.culto_arquivos       FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "car_del" ON public.culto_arquivos       FOR DELETE TO authenticated USING (true);

-- ── SEED: Tipos de culto padrão ───────────────────────────────────
INSERT INTO public.culto_tipos (nome, cor, duracao_min, ordem) VALUES
  ('Domingo Manhã',           '#4a9cf5', 90,  1),
  ('Domingo Noite',           '#8b6fd4', 90,  2),
  ('Conexão com Deus',        '#2ab5c0', 75,  3),
  ('Tarde da Esperança',      '#d4a843', 90,  4),
  ('Santa Ceia',              '#3aaa5c', 100, 5),
  ('Culto de Batismo',        '#3aaa5c', 110, 6),
  ('Culto de Recepção',       '#4a9cf5', 90,  7),
  ('Culto Missionário',       '#e08a2a', 90,  8),
  ('Culto de Gratidão',       '#4a9cf5', 90,  9),
  ('Culto Fúnebre',           '#8a9a8a', 60, 10),
  ('Conferência',             '#8b6fd4', 120,11),
  ('Congresso',               '#8b6fd4', 120,12),
  ('Culto Especial',          '#e05555', 90, 13)
ON CONFLICT DO NOTHING;
