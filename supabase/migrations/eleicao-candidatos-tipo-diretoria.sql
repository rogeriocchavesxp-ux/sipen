-- Adiciona 'diretoria' como tipo válido em eleicao_candidatos
ALTER TABLE public.eleicao_candidatos
  DROP CONSTRAINT IF EXISTS eleicao_candidatos_tipo_check;
ALTER TABLE public.eleicao_candidatos
  ADD CONSTRAINT eleicao_candidatos_tipo_check
  CHECK (tipo IN ('presbitero','diacono','ambos','diretoria'));
