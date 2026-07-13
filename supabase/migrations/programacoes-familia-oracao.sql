-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Família de Oração (módulo Programações)
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- Cadastro de famílias participantes
CREATE TABLE IF NOT EXISTS public.familias_oracao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  responsavel   TEXT NOT NULL,
  telefone      TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  obs           TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rodadas de sorteio
CREATE TABLE IF NOT EXISTS public.fo_sorteio_rodadas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao   TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pares gerados por rodada
CREATE TABLE IF NOT EXISTS public.fo_sorteio_pares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id       UUID NOT NULL REFERENCES public.fo_sorteio_rodadas(id) ON DELETE CASCADE,
  familia_id      UUID NOT NULL REFERENCES public.familias_oracao(id) ON DELETE CASCADE,
  ora_por_id      UUID NOT NULL REFERENCES public.familias_oracao(id) ON DELETE CASCADE,
  wa_enviado      BOOLEAN NOT NULL DEFAULT false,
  wa_enviado_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fo_pares_rodada ON public.fo_sorteio_pares(rodada_id);

-- updated_at trigger para familias_oracao
CREATE OR REPLACE FUNCTION public._fo_set_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_fo_updated ON public.familias_oracao;
CREATE TRIGGER trg_fo_updated
  BEFORE UPDATE ON public.familias_oracao
  FOR EACH ROW EXECUTE FUNCTION public._fo_set_updated();

-- RLS
ALTER TABLE public.familias_oracao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fo_sorteio_rodadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fo_sorteio_pares   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.familias_oracao;
DROP POLICY IF EXISTS "auth_all" ON public.fo_sorteio_rodadas;
DROP POLICY IF EXISTS "auth_all" ON public.fo_sorteio_pares;
CREATE POLICY "auth_all" ON public.familias_oracao    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.fo_sorteio_rodadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.fo_sorteio_pares   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC: salvar rodada + pares
CREATE OR REPLACE FUNCTION public.fo_salvar_sorteio(
  p_descricao TEXT  DEFAULT NULL,
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
  INSERT INTO public.fo_sorteio_rodadas (data, descricao, criado_em)
  VALUES (CURRENT_DATE, p_descricao, now())
  RETURNING id INTO v_rodada_id;

  FOR v_par IN SELECT * FROM jsonb_array_elements(p_pares) LOOP
    INSERT INTO public.fo_sorteio_pares (rodada_id, familia_id, ora_por_id)
    VALUES (v_rodada_id, (v_par->>'familia_id')::UUID, (v_par->>'ora_por_id')::UUID);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'rodada_id', v_rodada_id);
END;
$$;

-- RPC: marcar WA enviado
CREATE OR REPLACE FUNCTION public.fo_marcar_wa_enviado(p_par_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.fo_sorteio_pares
  SET wa_enviado = true, wa_enviado_em = now()
  WHERE id = p_par_id;
$$;

GRANT EXECUTE ON FUNCTION public.fo_salvar_sorteio(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fo_marcar_wa_enviado(UUID)      TO authenticated;
