-- Adiciona suporte a múltiplos anexos por pauta
ALTER TABLE public.conselho_pautas
  ADD COLUMN IF NOT EXISTS arquivos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.conselho_pautas.arquivos IS 'Array de {path, nome} — múltiplos documentos por pauta';
