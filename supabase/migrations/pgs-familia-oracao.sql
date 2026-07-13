-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Sorteio de Família de Oração (PGs)
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- Rodadas de sorteio
CREATE TABLE IF NOT EXISTS public.pgs_sorteio_rodadas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao   TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pares gerados por rodada
CREATE TABLE IF NOT EXISTS public.pgs_sorteio_pares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id       UUID NOT NULL REFERENCES public.pgs_sorteio_rodadas(id) ON DELETE CASCADE,
  pg_id           UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  ora_por_pg_id   UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  wa_enviado      BOOLEAN NOT NULL DEFAULT false,
  wa_enviado_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sorteio_pares_rodada ON public.pgs_sorteio_pares(rodada_id);

-- RLS
ALTER TABLE public.pgs_sorteio_rodadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pgs_sorteio_pares   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.pgs_sorteio_rodadas;
DROP POLICY IF EXISTS "auth_all" ON public.pgs_sorteio_pares;
CREATE POLICY "auth_all" ON public.pgs_sorteio_rodadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.pgs_sorteio_pares   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC: salvar rodada + pares de uma vez
CREATE OR REPLACE FUNCTION public.pgs_salvar_sorteio(
  p_descricao TEXT    DEFAULT NULL,
  p_pares     JSONB   DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rodada_id UUID;
  v_par       JSONB;
BEGIN
  INSERT INTO public.pgs_sorteio_rodadas (data, descricao, criado_em)
  VALUES (CURRENT_DATE, p_descricao, now())
  RETURNING id INTO v_rodada_id;

  FOR v_par IN SELECT * FROM jsonb_array_elements(p_pares) LOOP
    INSERT INTO public.pgs_sorteio_pares (rodada_id, pg_id, ora_por_pg_id)
    VALUES (v_rodada_id, (v_par->>'pg_id')::UUID, (v_par->>'ora_por_pg_id')::UUID);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'rodada_id', v_rodada_id);
END;
$$;

-- RPC: marcar WA como enviado para um par
CREATE OR REPLACE FUNCTION public.pgs_marcar_wa_enviado(p_par_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pgs_sorteio_pares
  SET wa_enviado = true, wa_enviado_em = now()
  WHERE id = p_par_id;
$$;

GRANT EXECUTE ON FUNCTION public.pgs_salvar_sorteio(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgs_marcar_wa_enviado(UUID)     TO authenticated;
