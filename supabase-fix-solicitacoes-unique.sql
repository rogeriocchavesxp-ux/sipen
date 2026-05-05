-- Proteção contra duplicatas em financeiro_solicitacoes
-- Executar no SQL Editor do Supabase após limpar duplicatas existentes

ALTER TABLE public.financeiro_solicitacoes
  ADD CONSTRAINT uq_solicitacao_unica
  UNIQUE (fornecedor, finalidade, valor, solicitante);
