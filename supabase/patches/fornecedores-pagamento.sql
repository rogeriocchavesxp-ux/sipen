-- Adiciona campos fiscais e de pagamento à tabela nomeados
-- Usados exclusivamente no contexto de fornecedores

ALTER TABLE public.nomeados
  ADD COLUMN IF NOT EXISTS documento text,   -- CPF ou CNPJ
  ADD COLUMN IF NOT EXISTS pix       text,   -- chave PIX
  ADD COLUMN IF NOT EXISTS banco     text,
  ADD COLUMN IF NOT EXISTS agencia   text,
  ADD COLUMN IF NOT EXISTS conta     text;
