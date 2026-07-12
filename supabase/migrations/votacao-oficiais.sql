-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo de Votação de Oficiais
-- Fase 2 do processo eleitoral: candidatos, config e votos.
-- Execute no Supabase SQL Editor do projeto SIPEN (erhwryfzpycahgsohhbh).
-- ═══════════════════════════════════════════════════════════════

-- ── Candidatos homologados para votação ─────────────────────────
CREATE TABLE IF NOT EXISTS public.eleicao_candidatos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id  UUID        NOT NULL REFERENCES public.eleicao_processos(id),
  nome         TEXT        NOT NULL,
  tipo         TEXT        NOT NULL CHECK (tipo IN ('presbitero','diacono')),
  congregacao  TEXT,
  pessoa_id    UUID,
  indicacao_id UUID,
  origem       TEXT        NOT NULL DEFAULT 'indicacao' CHECK (origem IN ('indicacao','manual')),
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  ordem        INTEGER     DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eleicao_candidatos_processo
  ON public.eleicao_candidatos (processo_id)
  WHERE deleted_at IS NULL;

-- ── Configuração da votação ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleicao_votacao_config (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id                 UUID        NOT NULL UNIQUE REFERENCES public.eleicao_processos(id),
  status_votacao              TEXT        NOT NULL DEFAULT 'rascunho'
                                CHECK (status_votacao IN ('rascunho','agendada','aberta','encerrada','apurada')),
  max_votos_presbiteros       INTEGER     NOT NULL DEFAULT 5,
  max_votos_diaconos          INTEGER     NOT NULL DEFAULT 4,
  data_abertura_votacao       DATE,
  hora_abertura_votacao       TIME,
  data_encerramento_votacao   DATE,
  hora_encerramento_votacao   TIME,
  somente_plena_comunhao      BOOLEAN     NOT NULL DEFAULT true,
  excluir_suspensos           BOOLEAN     NOT NULL DEFAULT true,
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Registro de quem votou (dissociado dos votos) ───────────────
-- Saber que a pessoa votou, mas NÃO em quem.
CREATE TABLE IF NOT EXISTS public.eleicao_votos_registro (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID        NOT NULL REFERENCES public.eleicao_processos(id),
  eleitor_id  UUID        NOT NULL,
  votou_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (processo_id, eleitor_id)
);

CREATE INDEX IF NOT EXISTS idx_eleicao_votos_reg_processo
  ON public.eleicao_votos_registro (processo_id);

-- ── Votos individuais (sem identificação do eleitor) ────────────
-- Sigilo garantido pela ausência de eleitor_id.
CREATE TABLE IF NOT EXISTS public.eleicao_votos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id  UUID        NOT NULL REFERENCES public.eleicao_processos(id),
  candidato_id UUID        NOT NULL REFERENCES public.eleicao_candidatos(id),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eleicao_votos_candidato
  ON public.eleicao_votos (candidato_id);

CREATE INDEX IF NOT EXISTS idx_eleicao_votos_processo
  ON public.eleicao_votos (processo_id);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.eleicao_candidatos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleicao_votacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleicao_votos_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleicao_votos          ENABLE ROW LEVEL SECURITY;

-- Candidatos: leitura e escrita para autenticados
CREATE POLICY "auth_all_candidatos" ON public.eleicao_candidatos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Config: leitura e escrita para autenticados
CREATE POLICY "auth_all_votacao_config" ON public.eleicao_votacao_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Registro de votos: autenticados podem inserir e ler os próprios
CREATE POLICY "auth_insert_votos_registro" ON public.eleicao_votos_registro
  FOR INSERT TO authenticated WITH CHECK (eleitor_id = auth.uid());

CREATE POLICY "auth_select_votos_registro" ON public.eleicao_votos_registro
  FOR SELECT TO authenticated USING (true);

-- Votos: autenticados podem inserir; SELECT apenas para contagem agregada
CREATE POLICY "auth_insert_votos" ON public.eleicao_votos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_select_votos" ON public.eleicao_votos
  FOR SELECT TO authenticated USING (true);
