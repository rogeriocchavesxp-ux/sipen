-- ══════════════════════════════════════════════════════════════
-- SIPEN — Módulo Pautas do Conselho
-- Tabelas: conselho_reunioes, conselho_pautas, conselho_pautas_historico
-- ══════════════════════════════════════════════════════════════

-- ── 1. Reuniões do Conselho ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conselho_reunioes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT        NOT NULL,
  tipo         TEXT        NOT NULL DEFAULT 'ORDINARIA'
                 CHECK (tipo IN ('ORDINARIA','EXTRAORDINARIA','COMISSAO_EXECUTIVA')),
  data_reuniao DATE        NOT NULL,
  horario      TIME,
  local        TEXT,
  status       TEXT        NOT NULL DEFAULT 'AGENDADA'
                 CHECK (status IN ('AGENDADA','REALIZADA','CANCELADA')),
  observacoes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Itens de pauta ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conselho_pautas (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id     UUID        REFERENCES public.conselho_reunioes(id) ON DELETE SET NULL,
  ordem          INTEGER     NOT NULL DEFAULT 0,
  titulo         TEXT        NOT NULL,
  encaminhamento TEXT,
  categoria      TEXT        NOT NULL DEFAULT 'Geral',
  sintese        TEXT,
  status         TEXT        NOT NULL DEFAULT 'PENDENTE'
                   CHECK (status IN ('PENDENTE','APROVADO','REJEITADO','ADIADO','EM_ANALISE','CONCLUIDO')),
  prioridade     TEXT        NOT NULL DEFAULT 'MEDIA'
                   CHECK (prioridade IN ('URGENTE','ALTA','MEDIA','BAIXA')),
  observacoes    TEXT,
  deliberacao    TEXT,
  responsaveis   TEXT,
  prazo          DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Histórico de alterações ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conselho_pautas_historico (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id     UUID        NOT NULL REFERENCES public.conselho_pautas(id) ON DELETE CASCADE,
  campo        TEXT        NOT NULL,
  valor_antes  TEXT,
  valor_depois TEXT,
  alterado_por UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  alterado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cp_reuniao  ON public.conselho_pautas(reuniao_id);
CREATE INDEX IF NOT EXISTS idx_cp_status   ON public.conselho_pautas(status);
CREATE INDEX IF NOT EXISTS idx_cp_ordem    ON public.conselho_pautas(reuniao_id, ordem);
CREATE INDEX IF NOT EXISTS idx_cph_pauta   ON public.conselho_pautas_historico(pauta_id);

-- ── 5. Trigger updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_conselho_reunioes_upd ON public.conselho_reunioes;
CREATE TRIGGER trg_conselho_reunioes_upd
  BEFORE UPDATE ON public.conselho_reunioes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_conselho_pautas_upd ON public.conselho_pautas;
CREATE TRIGGER trg_conselho_pautas_upd
  BEFORE UPDATE ON public.conselho_pautas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. RLS ────────────────────────────────────────────────────
ALTER TABLE public.conselho_reunioes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conselho_pautas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conselho_pautas_historico ENABLE ROW LEVEL SECURITY;

-- Reuniões
DROP POLICY IF EXISTS cr_sel ON public.conselho_reunioes;
CREATE POLICY cr_sel ON public.conselho_reunioes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cr_ins ON public.conselho_reunioes;
CREATE POLICY cr_ins ON public.conselho_reunioes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS cr_upd ON public.conselho_reunioes;
CREATE POLICY cr_upd ON public.conselho_reunioes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS cr_del ON public.conselho_reunioes;
CREATE POLICY cr_del ON public.conselho_reunioes FOR DELETE TO authenticated USING (true);

-- Pautas
DROP POLICY IF EXISTS cp_sel ON public.conselho_pautas;
CREATE POLICY cp_sel ON public.conselho_pautas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cp_ins ON public.conselho_pautas;
CREATE POLICY cp_ins ON public.conselho_pautas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS cp_upd ON public.conselho_pautas;
CREATE POLICY cp_upd ON public.conselho_pautas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS cp_del ON public.conselho_pautas;
CREATE POLICY cp_del ON public.conselho_pautas FOR DELETE TO authenticated USING (true);

-- Histórico
DROP POLICY IF EXISTS cph_sel ON public.conselho_pautas_historico;
CREATE POLICY cph_sel ON public.conselho_pautas_historico FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cph_ins ON public.conselho_pautas_historico;
CREATE POLICY cph_ins ON public.conselho_pautas_historico FOR INSERT TO authenticated WITH CHECK (true);

-- ── 7. Grants ─────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conselho_reunioes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conselho_pautas           TO authenticated;
GRANT SELECT, INSERT                 ON public.conselho_pautas_historico TO authenticated;
