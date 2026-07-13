-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Família de Oração (módulo Programações)
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════
--
-- As famílias vêm das inscrições do evento (evento_inscricoes).
-- Não há tabela separada de famílias — o evento é a fonte da verdade.
--
-- Rodadas: agrupam um sorteio (ligado a um evento).
-- Pares: cada linha = família A ora por família B (texto puro).
-- ═══════════════════════════════════════════════════════════════

-- Rodadas de sorteio (uma por evento por semana)
CREATE TABLE IF NOT EXISTS public.fo_sorteio_rodadas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fo_rodadas_evento ON public.fo_sorteio_rodadas(evento_id);

-- Pares gerados por rodada (texto puro — sem FK para inscrições)
CREATE TABLE IF NOT EXISTS public.fo_sorteio_pares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id       UUID NOT NULL REFERENCES public.fo_sorteio_rodadas(id) ON DELETE CASCADE,
  familia_nome    TEXT NOT NULL,
  resp_nome       TEXT NOT NULL,
  resp_tel        TEXT,
  ora_por_nome    TEXT NOT NULL,
  wa_enviado      BOOLEAN NOT NULL DEFAULT false,
  wa_enviado_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fo_pares_rodada ON public.fo_sorteio_pares(rodada_id);

-- RLS
ALTER TABLE public.fo_sorteio_rodadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fo_sorteio_pares   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.fo_sorteio_rodadas;
DROP POLICY IF EXISTS "auth_all" ON public.fo_sorteio_pares;
CREATE POLICY "auth_all" ON public.fo_sorteio_rodadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.fo_sorteio_pares   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC: salvar rodada + pares
-- p_evento_id : UUID do evento
-- p_pares     : [{familia_nome, resp_nome, resp_tel, ora_por_nome}]
CREATE OR REPLACE FUNCTION public.fo_salvar_sorteio(
  p_evento_id UUID,
  p_pares     JSONB DEFAULT '[]'::JSONB
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
  INSERT INTO public.fo_sorteio_rodadas (evento_id, data, criado_em)
  VALUES (p_evento_id, CURRENT_DATE, now())
  RETURNING id INTO v_rodada_id;

  FOR v_par IN SELECT * FROM jsonb_array_elements(p_pares) LOOP
    INSERT INTO public.fo_sorteio_pares (rodada_id, familia_nome, resp_nome, resp_tel, ora_por_nome)
    VALUES (
      v_rodada_id,
      v_par->>'familia_nome',
      v_par->>'resp_nome',
      NULLIF(v_par->>'resp_tel', ''),
      v_par->>'ora_por_nome'
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'rodada_id', v_rodada_id);
END;
$$;

-- RPC: marcar WA enviado para um par
CREATE OR REPLACE FUNCTION public.fo_marcar_wa_enviado(p_par_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.fo_sorteio_pares
  SET wa_enviado = true, wa_enviado_em = now()
  WHERE id = p_par_id;
$$;

GRANT EXECUTE ON FUNCTION public.fo_salvar_sorteio(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fo_marcar_wa_enviado(UUID)      TO authenticated;
