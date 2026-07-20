-- Adiciona 'conselheiro' ao check constraint de funcao_lider na tabela nomeados
ALTER TABLE public.nomeados
  DROP CONSTRAINT IF EXISTS nomeados_funcao_lider_check;

ALTER TABLE public.nomeados
  ADD CONSTRAINT nomeados_funcao_lider_check
  CHECK (funcao_lider IN ('supervisor', 'coordenador', 'lider_area', 'conselheiro', 'tesoureiro'));
