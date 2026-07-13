-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Tabela de espaços com visibilidade pública configurável
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.espacos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT        NOT NULL,
  grupo              TEXT        NOT NULL DEFAULT '',
  ordem              INTEGER     NOT NULL DEFAULT 0,
  disponivel_publico BOOLEAN     NOT NULL DEFAULT false,
  ativo              BOOLEAN     NOT NULL DEFAULT true,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_espacos_nome ON public.espacos(nome);

-- ── 2. RLS ───────────────────────────────────────────────────
ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "espacos_anon_select"  ON public.espacos;
DROP POLICY IF EXISTS "espacos_auth_all"     ON public.espacos;

-- Anon: apenas espaços disponíveis para solicitação pública
CREATE POLICY "espacos_anon_select" ON public.espacos
  FOR SELECT TO anon
  USING (disponivel_publico = true AND ativo = true);

-- Admin: tudo
CREATE POLICY "espacos_auth_all" ON public.espacos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON public.espacos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.espacos TO authenticated;

-- ── 3. Carga inicial de espaços ──────────────────────────────
-- disponivel_publico = true  → aparece no formulário público
-- disponivel_publico = false → uso interno / administração apenas
INSERT INTO public.espacos (nome, grupo, ordem, disponivel_publico) VALUES

-- Bloco A — Penha Kids
('Sala A01',              'Bloco A — Penha Kids', 101, true),
('Sala A02',              'Bloco A — Penha Kids', 102, true),
('Sala A03',              'Bloco A — Penha Kids', 103, true),
('Sala A04',              'Bloco A — Penha Kids', 104, true),
('Sala A05',              'Bloco A — Penha Kids', 105, true),
('Sala A06',              'Bloco A — Penha Kids', 106, true),
('Sala A07 — Estoque',    'Bloco A — Penha Kids', 107, false),  -- restrito
('Sala A08 — Dentista',   'Bloco A — Penha Kids', 108, false),  -- restrito
('Sala A09 — Copa',       'Bloco A — Penha Kids', 109, false),  -- restrito
('Banheiro',              'Bloco A — Penha Kids', 110, false),  -- restrito
('Templo — Penha Kids',   'Bloco A — Penha Kids', 111, true),

-- Bloco B — Prédio Principal
('Auditório Principal',    'Bloco B — Prédio Principal', 201, true),
('Auditório Penha Kids',   'Bloco B — Prédio Principal', 202, false), -- restrito
('Sala B2 — Adolescentes', 'Bloco B — Prédio Principal', 203, true),
('Pátio — Salão Social',   'Bloco B — Prédio Principal', 204, true),
('Cozinha',                'Bloco B — Prédio Principal', 205, true),
('Casa de Apoio',          'Bloco B — Prédio Principal', 206, true),
('Sala B3',                'Bloco B — Prédio Principal', 207, true),
('Sala B4',                'Bloco B — Prédio Principal', 208, true),
('Sala B06',               'Bloco B — Prédio Principal', 209, true),
('Sala B07',               'Bloco B — Prédio Principal', 210, true),
('Sala B08',               'Bloco B — Prédio Principal', 211, true),
('Sala B09',               'Bloco B — Prédio Principal', 212, true),
('Sala B10',               'Bloco B — Prédio Principal', 213, true),
('Sala B11',               'Bloco B — Prédio Principal', 214, true),
('Sala B12',               'Bloco B — Prédio Principal', 215, true),
('Sala B13',               'Bloco B — Prédio Principal', 216, true),
('Sala B14',               'Bloco B — Prédio Principal', 217, true),

-- Bloco C — Estacionamento e Apoio
('Estacionamento',         'Bloco C — Estacionamento e Apoio', 301, true),

-- Bloco D — Administrativo e Pastoral (todos restritos)
('Sala D1 — Secretaria',               'Bloco D — Administrativo e Pastoral', 401, false),
('Sala D2 — Sala de Gestão',           'Bloco D — Administrativo e Pastoral', 402, false),
('Sala D3 — Hebron / Ação Social',     'Bloco D — Administrativo e Pastoral', 403, false),
('Sala D4 — Bazar da Ação Social',     'Bloco D — Administrativo e Pastoral', 404, false),
('Sala D5 — Estoque de Cestas',        'Bloco D — Administrativo e Pastoral', 405, false),
('Sala D6 — Estoque de Produtos de Limpeza', 'Bloco D — Administrativo e Pastoral', 406, false),
('Sala D7 — Gabinete Pr. Amauri',      'Bloco D — Administrativo e Pastoral', 407, false),
('Sala D8 — Gabinete Pr. Filipe',      'Bloco D — Administrativo e Pastoral', 408, false),
('Sala D9 — Gabinete Pr. Fábio',       'Bloco D — Administrativo e Pastoral', 409, false)

ON CONFLICT (nome) DO NOTHING;
