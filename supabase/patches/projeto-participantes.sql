-- Cria tabela de participantes de projetos
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.projeto_participantes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id    UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  pessoa_id     UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  nivel         TEXT NOT NULL DEFAULT 'visualizador'
                  CHECK (nivel IN ('editor', 'visualizador')),
  convidado_por UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(projeto_id, pessoa_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proj_part_projeto ON public.projeto_participantes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_proj_part_pessoa  ON public.projeto_participantes(pessoa_id);

-- RLS
ALTER TABLE public.projeto_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select" ON public.projeto_participantes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pp_insert" ON public.projeto_participantes
  FOR INSERT TO authenticated
  WITH CHECK (pode_editar_projetos());

CREATE POLICY "pp_delete" ON public.projeto_participantes
  FOR DELETE TO authenticated
  USING (pode_editar_projetos());

-- Garantir que projetos tem coluna created_by referenciando pessoas
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- Verificar:
SELECT id, nome, created_by FROM projetos LIMIT 5;
SELECT COUNT(*) FROM projeto_participantes;
