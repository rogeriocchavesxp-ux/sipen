-- Adiciona 'departamento' ao check constraint orgao_tipo da tabela nomeados
ALTER TABLE public.nomeados
  DROP CONSTRAINT IF EXISTS nomeados_orgao_tipo_check1;

ALTER TABLE public.nomeados
  ADD CONSTRAINT nomeados_orgao_tipo_check1
  CHECK (orgao_tipo IN ('governo','comissao','ministerio','sociedade','grupo','congregacao','departamento'));
