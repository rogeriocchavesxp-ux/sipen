-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Vincular escala_pregacao à tabela oficiais
-- Remove dependência de pastores para exibição de nomes
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. View pública de pastores para escalas ─────────────────
CREATE OR REPLACE VIEW public.vw_pastores_escala AS
SELECT
  o.id,
  p.nome          AS nome_completo,
  COALESCE(p.nome_social, p.nome) AS nome_exibicao,
  o.status
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
WHERE o.cargo = 'pastor';

-- ── 2. GRANT SELECT para anon (leitura pública da view) ──────
GRANT SELECT ON public.vw_pastores_escala TO anon;

-- ── 3. Adicionar oficial_id em escala_pregacao ───────────────
ALTER TABLE public.escala_pregacao
  ADD COLUMN IF NOT EXISTS oficial_id UUID REFERENCES public.oficiais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_escala_pregacao_oficial_id
  ON public.escala_pregacao(oficial_id);

-- ── 4. Migrar pastor_id → oficial_id por match de nome ───────
--    Tenta normalizar nomes ignorando acentos e "Rev." prefix
UPDATE public.escala_pregacao ep
SET oficial_id = o.id
FROM public.pastores p
JOIN public.pessoas per ON (
     lower(unaccent(per.nome)) = lower(unaccent(p.nome_completo))
  OR lower(unaccent(per.nome)) = lower(unaccent(COALESCE(p.nome_exibicao, p.nome_completo)))
  OR lower(unaccent(p.nome_completo)) LIKE '%' || split_part(lower(unaccent(per.nome)), ' ', 2) || '%'
  OR lower(unaccent(per.nome))        LIKE '%' || split_part(lower(unaccent(p.nome_completo)), ' ', 2) || '%'
)
JOIN public.oficiais o ON o.pessoa_id = per.id AND o.cargo = 'pastor'
WHERE ep.pastor_id = p.id
  AND ep.oficial_id IS NULL;

-- ── 5. RLS em oficiais (se ainda não habilitado) ──────────────
DO $$ BEGIN
  ALTER TABLE public.oficiais ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_select_oficiais"
    ON public.oficiais FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.oficiais TO anon;
