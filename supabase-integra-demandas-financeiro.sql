-- SIPEN - Integracao Demandas Financeiras -> Contas a Pagar / CNAB
-- Executar no SQL Editor do Supabase antes de usar o botao "Aprovar para Pagamento".

ALTER TABLE public.financeiro_solicitacoes
  ADD COLUMN IF NOT EXISTS demanda_id UUID REFERENCES public.demandas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_sol_demanda_id
  ON public.financeiro_solicitacoes(demanda_id)
  WHERE demanda_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fin_sol_demanda_ativa
  ON public.financeiro_solicitacoes(demanda_id)
  WHERE demanda_id IS NOT NULL AND deleted_at IS NULL;
