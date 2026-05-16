-- ══════════════════════════════════════════════════════════════════════════════
-- SIPEN — Módulo Acesso Facial
-- Tabela: acesso_facial
-- Registra APENAS o controle administrativo de quem possui cadastro facial
-- ativo no sistema de acesso da sede. Nenhum dado biométrico é armazenado.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.acesso_facial (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id            UUID        REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  nome_importado       TEXT,        -- nome bruto do PDF/importação, para rastreio
  status               TEXT        NOT NULL DEFAULT 'ativo'
                         CHECK (status IN ('ativo','inativo')),
  data_cadastro_facial DATE,        -- data em que o cadastro foi feito no dispositivo
  observacoes          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (pessoa_id)               -- uma pessoa só pode ter um registro ativo
);

CREATE INDEX IF NOT EXISTS idx_af_pessoa ON public.acesso_facial(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_af_status ON public.acesso_facial(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_acesso_facial_upd ON public.acesso_facial;
CREATE TRIGGER trg_acesso_facial_upd
  BEFORE UPDATE ON public.acesso_facial
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.acesso_facial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS af_sel ON public.acesso_facial;
CREATE POLICY af_sel ON public.acesso_facial FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS af_ins ON public.acesso_facial;
CREATE POLICY af_ins ON public.acesso_facial FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS af_upd ON public.acesso_facial;
CREATE POLICY af_upd ON public.acesso_facial FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS af_del ON public.acesso_facial;
CREATE POLICY af_del ON public.acesso_facial FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acesso_facial TO authenticated;

NOTIFY pgrst, 'reload schema';
