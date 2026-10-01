-- Tabela de preços por tipo de inscrição no evento
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS tabela_precos JSONB;

-- Faixas etárias de filhos no casal (substitui tem_filhos/num_filhos)
ALTER TABLE public.evento_inscricoes
  ADD COLUMN IF NOT EXISTS filhos_0_4     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS filhos_5_11    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS filhos_12_mais INTEGER DEFAULT 0;
