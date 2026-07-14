-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Cadastro Centralizado de Espaços
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de Blocos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.espacos_blocos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  ordem       INTEGER     NOT NULL DEFAULT 0,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_espacos_blocos_nome ON public.espacos_blocos(nome);

ALTER TABLE public.espacos_blocos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "espacos_blocos_anon_select" ON public.espacos_blocos;
DROP POLICY IF EXISTS "espacos_blocos_auth_all"    ON public.espacos_blocos;
CREATE POLICY "espacos_blocos_anon_select" ON public.espacos_blocos FOR SELECT TO anon        USING (ativo = true);
CREATE POLICY "espacos_blocos_auth_all"    ON public.espacos_blocos FOR ALL    TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.espacos_blocos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.espacos_blocos TO authenticated;


-- ── 2. Tabela de Tipos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipos_espaco (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    TEXT    NOT NULL,
  ativo   BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tipos_espaco_nome ON public.tipos_espaco(nome);

ALTER TABLE public.tipos_espaco ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_espaco_anon_select" ON public.tipos_espaco;
DROP POLICY IF EXISTS "tipos_espaco_auth_all"    ON public.tipos_espaco;
CREATE POLICY "tipos_espaco_anon_select" ON public.tipos_espaco FOR SELECT TO anon        USING (ativo = true);
CREATE POLICY "tipos_espaco_auth_all"    ON public.tipos_espaco FOR ALL    TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.tipos_espaco TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tipos_espaco TO authenticated;


-- ── 3. Carga inicial de Blocos ───────────────────────────────
INSERT INTO public.espacos_blocos (nome, ordem) VALUES
  ('Bloco A — Penha Kids',             1),
  ('Bloco B — Prédio Principal',       2),
  ('Bloco C — Estacionamento e Apoio', 3),
  ('Bloco D — Administrativo e Pastoral', 4)
ON CONFLICT (nome) DO NOTHING;


-- ── 4. Carga inicial de Tipos ────────────────────────────────
INSERT INTO public.tipos_espaco (nome) VALUES
  ('Templo'), ('Auditório'), ('Sala'), ('Cozinha'), ('Salão'),
  ('Pátio'), ('Estacionamento'), ('Casa de Apoio'), ('Área Externa'),
  ('Depósito'), ('Outro')
ON CONFLICT (nome) DO NOTHING;


-- ── 5. Novos campos em public.espacos ────────────────────────
ALTER TABLE public.espacos
  ADD COLUMN IF NOT EXISTS codigo           TEXT,
  ADD COLUMN IF NOT EXISTS bloco_id         UUID REFERENCES public.espacos_blocos(id),
  ADD COLUMN IF NOT EXISTS tipo             TEXT,
  ADD COLUMN IF NOT EXISTS descricao        TEXT,
  ADD COLUMN IF NOT EXISTS localizacao      TEXT,
  ADD COLUMN IF NOT EXISTS capacidade       INTEGER,
  ADD COLUMN IF NOT EXISTS reservavel           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS disponivel_publico   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permite_reserva_simul BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uso_interno          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_aprovacao      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acessibilidade   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS climatizado      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_som          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_projetor     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_internet     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes      TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em    TIMESTAMPTZ;


-- ── 6. Migrar grupo TEXT → bloco_id FK ──────────────────────
UPDATE public.espacos e
SET    bloco_id = b.id
FROM   public.espacos_blocos b
WHERE  e.grupo    = b.nome
  AND  e.bloco_id IS NULL;


-- ── 7. Inferir código a partir do nome ───────────────────────
-- Extrai sequência alfanumérica do tipo "A06", "B3", "D9" etc.
UPDATE public.espacos
SET    codigo = SUBSTRING(nome FROM '[A-Z][0-9]+')
WHERE  nome ~ '[A-Z][0-9]+'
  AND  codigo IS NULL;

-- Casos especiais sem código extraível ficam com NULL (admin define manualmente)


-- ── 8. Trigger: manter grupo sincronizado com bloco_id ───────
CREATE OR REPLACE FUNCTION public.fn_espaco_sync_grupo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bloco_id IS NOT NULL THEN
    SELECT nome INTO NEW.grupo FROM public.espacos_blocos WHERE id = NEW.bloco_id;
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_espaco_sync_grupo ON public.espacos;
CREATE TRIGGER tg_espaco_sync_grupo
  BEFORE INSERT OR UPDATE ON public.espacos
  FOR EACH ROW EXECUTE FUNCTION public.fn_espaco_sync_grupo();


-- ── 9. RPC: listar espaços com bloco (para admin) ────────────
CREATE OR REPLACE FUNCTION public.espacos_com_bloco()
RETURNS TABLE (
  id                 UUID,
  nome               TEXT,
  codigo             TEXT,
  grupo              TEXT,
  bloco_id           UUID,
  bloco_nome         TEXT,
  tipo               TEXT,
  descricao          TEXT,
  localizacao        TEXT,
  capacidade         INTEGER,
  ordem              INTEGER,
  ativo              BOOLEAN,
  disponivel_publico BOOLEAN,
  reservavel         BOOLEAN,
  uso_interno        BOOLEAN,
  exige_aprovacao    BOOLEAN,
  permite_reserva_simul BOOLEAN,
  acessibilidade     BOOLEAN,
  climatizado        BOOLEAN,
  tem_som            BOOLEAN,
  tem_projetor       BOOLEAN,
  tem_internet       BOOLEAN,
  observacoes        TEXT,
  criado_em          TIMESTAMPTZ,
  atualizado_em      TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.nome, e.codigo, e.grupo,
    e.bloco_id, COALESCE(b.nome, e.grupo) AS bloco_nome,
    e.tipo, e.descricao, e.localizacao, e.capacidade,
    e.ordem, e.ativo, e.disponivel_publico,
    e.reservavel, e.uso_interno, e.exige_aprovacao,
    e.permite_reserva_simul,
    e.acessibilidade, e.climatizado, e.tem_som, e.tem_projetor, e.tem_internet,
    e.observacoes, e.criado_em, e.atualizado_em
  FROM public.espacos e
  LEFT JOIN public.espacos_blocos b ON b.id = e.bloco_id
  ORDER BY COALESCE(b.ordem, 999), e.ordem, e.nome;
$$;

REVOKE ALL ON FUNCTION public.espacos_com_bloco FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.espacos_com_bloco TO authenticated;
