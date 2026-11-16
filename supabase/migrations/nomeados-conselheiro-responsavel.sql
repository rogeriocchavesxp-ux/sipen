-- Adiciona campo de Conselheiro Responsável em nomeados
-- Referencia pessoas (presbítero/pastor que supervisiona o ministério)

ALTER TABLE public.nomeados
  ADD COLUMN IF NOT EXISTS conselheiro_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nomeados_conselheiro ON public.nomeados(conselheiro_id);
