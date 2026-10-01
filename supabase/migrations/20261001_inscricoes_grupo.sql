-- Suporte a inscrições em grupo (cadastro institucional)
ALTER TABLE public.evento_inscricoes
  ADD COLUMN IF NOT EXISTS grupo_id   UUID,
  ADD COLUMN IF NOT EXISTS grupo_nome TEXT;
