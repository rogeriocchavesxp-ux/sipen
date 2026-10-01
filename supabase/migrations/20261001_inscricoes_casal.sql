-- Campos de tipo de cadastro no formulário público de eventos (individual, casal, institucional)
ALTER TABLE public.evento_inscricoes
  ADD COLUMN IF NOT EXISTS cadastro_tipo       TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS conjuge_nome        TEXT,
  ADD COLUMN IF NOT EXISTS tem_filhos          BOOLEAN,
  ADD COLUMN IF NOT EXISTS num_filhos          INTEGER,
  ADD COLUMN IF NOT EXISTS instituicao_nome    TEXT,
  ADD COLUMN IF NOT EXISTS representante_cargo TEXT;
