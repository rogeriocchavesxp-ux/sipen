-- Patch: Comprometimentos de membros para Ofertas Especiais
-- Registra intenções de contribuição (única ou recorrente) por campanha

CREATE TABLE IF NOT EXISTS public.oe_comprometimentos (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id       uuid        NOT NULL REFERENCES public.ofertas_especiais(id) ON DELETE CASCADE,
  pessoa_id         uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  nome_contribuinte text,
  tipo              text        NOT NULL DEFAULT 'unico'
                                CHECK (tipo IN ('unico', 'recorrente')),
  valor             numeric(12,2) NOT NULL CHECK (valor > 0),
  frequencia        text        CHECK (frequencia IN ('semanal','quinzenal','mensal','bimestral','trimestral')),
  data_inicio       date,
  data_fim          date,
  dia_recorrencia   smallint    CHECK (dia_recorrencia BETWEEN 1 AND 28),
  status            text        NOT NULL DEFAULT 'ativo'
                                CHECK (status IN ('ativo','suspenso','concluido','cancelado')),
  obs               text,
  criado_em         timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS oe_comp_campanha_idx ON public.oe_comprometimentos(campanha_id);
CREATE INDEX IF NOT EXISTS oe_comp_pessoa_idx   ON public.oe_comprometimentos(pessoa_id);

-- RLS
ALTER TABLE public.oe_comprometimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_full_comprometimentos"
  ON public.oe_comprometimentos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
